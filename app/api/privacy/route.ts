import { lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { privacyRequests, waitlistRateLimits } from "@/db/schema";
import { dailyIpDigest, formPreflight, formReply, normalizeSignupEmail, readWaitlistRequest, WaitlistRequestError } from "@/lib/waitlist";

export function OPTIONS(request: Request) {
  return formPreflight(request);
}

export async function POST(request: Request) {
  const reply = (body: { ok: true } | { ok: false; error: string }, status = 200, headers: Record<string, string> = {}) =>
    formReply(request, body, status, headers);
  try {
    const payload = await readWaitlistRequest(request);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return reply({ ok: false, error: "Please check your details and try again." }, 400);
    }
    const input = payload as Record<string, unknown>;
    if (input.website !== undefined && typeof input.website !== "string") {
      return reply({ ok: false, error: "Please check your details and try again." }, 400);
    }
    if (typeof input.website === "string" && input.website.trim()) return reply({ ok: true });
    const email = normalizeSignupEmail(input.email);
    if (!email) return reply({ ok: false, error: "Please enter a valid email address." }, 400);
    if (input.message !== undefined && (typeof input.message !== "string" || input.message.length > 1000)) {
      return reply({ ok: false, error: "Please keep your message to 1,000 characters or fewer." }, 400);
    }
    const message = typeof input.message === "string" ? input.message.trim() : "";
    const db = getDb();
    const ip = request.headers.get("cf-connecting-ip");
    if (ip) {
      const day = new Date().toISOString().slice(0, 10);
      const key = await dailyIpDigest(`privacy:${ip}`, day);
      await db.delete(waitlistRateLimits).where(lt(waitlistRateLimits.day, day));
      const [limit] = await db.insert(waitlistRateLimits).values({ key, day, attempts: 1 })
        .onConflictDoUpdate({ target: waitlistRateLimits.key, set: { attempts: sql`${waitlistRateLimits.attempts} + 1` } })
        .returning({ attempts: waitlistRateLimits.attempts });
      if (limit.attempts > 10) {
        const retryAfter = Math.max(1, Math.ceil((Date.parse(`${day}T00:00:00Z`) + 86400000 - Date.now()) / 1000));
        return reply({ ok: false, error: "There have been several requests from this connection today. Please try again tomorrow." }, 429, { "Retry-After": String(retryAfter) });
      }
    }
    // Never look up or reveal whether this address appears on the waitlist.
    // A repeated pending request is accepted without changing the first request.
    await db.insert(privacyRequests).values({ email, message }).onConflictDoNothing();
    return reply({ ok: true });
  } catch (error) {
    if (error instanceof WaitlistRequestError) return reply({ ok: false, error: error.message }, error.status);
    console.error("[privacy] Request storage is temporarily unavailable.");
    return reply({ ok: false, error: "We could not record your request just now. Please try again in a moment." }, 503, { "Retry-After": "60" });
  }
}
