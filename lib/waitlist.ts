export const TALENT_CATEGORIES = [
  "Music",
  "Dance",
  "Art & design",
  "Film & photography",
  "Fashion",
  "Comedy",
  "Other",
] as const;

export const WAITLIST_BODY_LIMIT = 4096;
export const WAITLIST_CONSENT_VERSION = "waitlist-v1";
export const WAITLIST_DAILY_LIMIT = 30;
const GITHUB_PAGES_ORIGIN = "https://starnex-company.github.io";

export type WaitlistEntry = {
  email: string;
  audience: "creator" | "scout";
  talent: (typeof TALENT_CATEGORIES)[number];
};

type ValidationResult =
  | { ok: true; entry: WaitlistEntry; honeypot: false }
  | { ok: true; honeypot: true }
  | { ok: false; error: string };

export function normalizeSignupEmail(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 320) {
    return null;
  }
  const email = value.trim().toLowerCase();
  const [local, domain] = email.split("@");
  if (
    email.length > 254 ||
    !/^[^\s@<>(),;:"\\\[\]]+@[^\s@<>(),;:"\\\[\]]+\.[^\s@<>(),;:"\\\[\]]+$/.test(email) ||
    !local ||
    local.length > 64 ||
    !domain ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..") ||
    !domain.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
  ) {
    return null;
  }
  return email;
}

export function validateWaitlist(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Please check your details and try again." };
  }

  const input = payload as Record<string, unknown>;
  if (input.website !== undefined && typeof input.website !== "string") {
    return { ok: false, error: "Please check your details and try again." };
  }
  if (typeof input.website === "string" && input.website.trim()) {
    return { ok: true, honeypot: true };
  }

  const email = normalizeSignupEmail(input.email);
  if (!email) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (input.audience !== "creator" && input.audience !== "scout") {
    return { ok: false, error: "Please choose whether you are a creator or a talent scout." };
  }
  if (typeof input.talent !== "string" || !TALENT_CATEGORIES.includes(input.talent as WaitlistEntry["talent"])) {
    return { ok: false, error: "Please choose a talent category." };
  }
  if (input.consent !== true) {
    return { ok: false, error: "Please agree to receive StarApp launch updates to join the waitlist." };
  }
  return {
    ok: true,
    honeypot: false,
    entry: {
      email,
      audience: input.audience,
      talent: input.talent as WaitlistEntry["talent"],
    },
  };
}

export class WaitlistRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "WaitlistRequestError";
    this.status = status;
  }
}

function trustedFormOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin === new URL(request.url).origin || origin === GITHUB_PAGES_ORIGIN) return origin;
  return null;
}

function assertFormOrigin(request: Request): void {
  const origin = trustedFormOrigin(request);
  const site = request.headers.get("sec-fetch-site");
  if (!origin || (origin !== GITHUB_PAGES_ORIGIN && site && site !== "same-origin")) {
    throw new WaitlistRequestError("Please submit this form from the StarApp website.", 403);
  }
}

function formResponseHeaders(request: Request, headers: Record<string, string> = {}): Headers {
  const result = new Headers({ "Cache-Control": "no-store", ...headers });
  result.set("Vary", "Origin");
  const origin = trustedFormOrigin(request);
  if (origin) result.set("Access-Control-Allow-Origin", origin);
  return result;
}

export function formReply(
  request: Request,
  body: { ok: true } | { ok: false; error: string },
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, { status, headers: formResponseHeaders(request, headers) });
}

export function formPreflight(request: Request): Response {
  try {
    assertFormOrigin(request);
    if (request.headers.get("access-control-request-method") !== "POST") {
      throw new WaitlistRequestError("This form only accepts POST submissions.", 405);
    }
    const requestedHeaders = request.headers.get("access-control-request-headers");
    if (requestedHeaders && requestedHeaders.split(",").some((header) => header.trim().toLowerCase() !== "content-type")) {
      throw new WaitlistRequestError("This form only accepts the Content-Type request header.", 403);
    }
    const headers = formResponseHeaders(request);
    headers.set("Access-Control-Allow-Methods", "POST");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
    return new Response(null, { status: 204, headers });
  } catch (error) {
    if (!(error instanceof WaitlistRequestError)) throw error;
    const response = formReply(request, { ok: false, error: error.message }, error.status);
    response.headers.set("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
    return response;
  }
}

export async function readWaitlistRequest(request: Request): Promise<unknown> {
  assertFormOrigin(request);
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new WaitlistRequestError("Please submit your details using the form on this website.", 415);
  }
  const claimedLength = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(claimedLength) || claimedLength < 0 || claimedLength > WAITLIST_BODY_LIMIT) {
    throw new WaitlistRequestError("That submission is too large. Please check your details.", 413);
  }
  if (!request.body) {
    throw new WaitlistRequestError("Please enter your details before submitting.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > WAITLIST_BODY_LIMIT) {
        await reader.cancel();
        throw new WaitlistRequestError("That submission is too large. Please check your details.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new WaitlistRequestError("We could not read that submission. Please try again.");
  }
}

export async function dailyIpDigest(ip: string, day: string): Promise<string> {
  const bytes = new TextEncoder().encode(`starapp-waitlist:${day}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
