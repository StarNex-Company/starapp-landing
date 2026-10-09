import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dailyIpDigest,
  formPreflight,
  formReply,
  readWaitlistRequest,
  validateWaitlist,
  WAITLIST_BODY_LIMIT,
} from "../lib/waitlist.ts";

const valid = { email: "  Creator+Music@Example.COM  ", audience: "creator", talent: "Music", consent: true, website: "" };
const request = (body, headers = {}) => new Request("https://starapp.example/api/waitlist", {
  method: "POST",
  headers: { Origin: "https://starapp.example", "Content-Type": "application/json", ...headers },
  body,
});

test("normalizes email and accepts exact creator and scout categories", () => {
  const result = validateWaitlist(valid);
  assert.equal(result.ok, true);
  assert.equal(result.honeypot, false);
  assert.equal(result.entry.email, "creator+music@example.com");
  assert.equal(validateWaitlist({ ...valid, audience: "scout", talent: "Other" }).ok, true);
});

test("rejects malformed input, missing consent, unknown enums, and oversized email", () => {
  for (const payload of [
    null, [], "email", { ...valid, consent: false }, { ...valid, consent: "true" },
    { ...valid, email: "a@@example.com" }, { ...valid, email: "a@example" },
    { ...valid, email: "a..b@example.com" }, { ...valid, email: "a@-example.com" },
    { ...valid, email: `${"a".repeat(65)}@example.com` },
    { ...valid, email: `${"a".repeat(400)}@example.com` },
    { ...valid, audience: "admin" }, { ...valid, talent: "music" }, { ...valid, website: 3 },
  ]) assert.equal(validateWaitlist(payload).ok, false, JSON.stringify(payload));
});

test("honeypot is a successful no-op and does not return an entry", () => {
  assert.deepEqual(validateWaitlist({ website: "https://spam.example" }), { ok: true, honeypot: true });
});

test("accepts same-origin JSON and rejects inconsistent fetch metadata", async () => {
  assert.deepEqual(await readWaitlistRequest(request(JSON.stringify(valid))), valid);
  await assert.rejects(readWaitlistRequest(request("{}", { Origin: "https://other.example" })), { status: 403 });
  await assert.rejects(readWaitlistRequest(request("{}", { "Sec-Fetch-Site": "cross-site" })), { status: 403 });
  await assert.rejects(readWaitlistRequest(request("{}", { "Content-Type": "text/plain" })), { status: 415 });
  await assert.rejects(readWaitlistRequest(request("{")), { status: 400 });
});

const pagesOrigin = "https://starcompanytechng-lab.github.io";
const untrustedOrigins = [
  "https://other.example",
  "null",
  "https://starcompanytechng-lab.github.io.evil.example",
  "https://starcompanytechng-lab.github.io@evil.example",
  "http://starcompanytechng-lab.github.io",
  "https://starcompanytechng-lab.github.io:444",
  "https://starcompanytechng-lab.github.io/path",
  "https://starcompanytechng-lab.github.io/",
  "",
];

test("accepts the exact GitHub Pages origin with cross-site fetch metadata", async () => {
  for (const path of ["waitlist", "privacy"]) {
    const trusted = new Request(`https://starapp.example/api/${path}`, {
      method: "POST",
      headers: { Origin: pagesOrigin, "Sec-Fetch-Site": "cross-site", "Content-Type": "application/json" },
      body: JSON.stringify(valid),
    });
    assert.deepEqual(await readWaitlistRequest(trusted), valid);
  }
});

test("rejects hostile, opaque, and missing origins before reading POST bodies", async () => {
  for (const origin of untrustedOrigins) {
    await assert.rejects(readWaitlistRequest(request("{}", { Origin: origin, "Sec-Fetch-Site": "cross-site" })), { status: 403 });
  }
  const missing = request("{}");
  missing.headers.delete("origin");
  await assert.rejects(readWaitlistRequest(missing), { status: 403 });
});

const preflight = (headers = {}, path = "waitlist") => new Request(`https://starapp.example/api/${path}`, {
  method: "OPTIONS",
  headers: {
    Origin: pagesOrigin,
    "Sec-Fetch-Site": "cross-site",
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type",
    ...headers,
  },
});

test("both form preflights allow only POST with Content-Type and no credentials", async () => {
  for (const path of ["waitlist", "privacy"]) {
    const response = formPreflight(preflight({}, path));
    assert.equal(response.status, 204);
    assert.equal(await response.text(), "");
    assert.equal(response.headers.get("access-control-allow-origin"), pagesOrigin);
    assert.equal(response.headers.get("access-control-allow-methods"), "POST");
    assert.equal(response.headers.get("access-control-allow-headers"), "Content-Type");
    assert.equal(response.headers.has("access-control-allow-credentials"), false);
    assert.equal(response.headers.get("vary"), "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(formPreflight(preflight({ "Access-Control-Request-Headers": " Content-Type " })).status, 204);
  assert.equal(formPreflight(preflight({ Origin: "https://starapp.example", "Sec-Fetch-Site": "same-origin" })).status, 204);
});

test("preflights reject untrusted origins, unsupported methods, and extra headers", () => {
  for (const origin of untrustedOrigins) {
    const response = formPreflight(preflight({ Origin: origin }));
    assert.equal(response.status, 403);
    assert.equal(response.headers.has("access-control-allow-origin"), false);
    assert.equal(response.headers.has("access-control-allow-methods"), false);
    assert.match(response.headers.get("vary"), /Origin/);
  }
  const missing = preflight();
  missing.headers.delete("origin");
  assert.equal(formPreflight(missing).status, 403);
  for (const method of ["GET", "PUT", "DELETE", "POST, GET", "post", ""]) {
    const response = formPreflight(preflight({ "Access-Control-Request-Method": method }));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("access-control-allow-origin"), pagesOrigin);
    assert.equal(response.headers.has("access-control-allow-methods"), false);
  }
  for (const header of ["authorization", "content-type, authorization", "x-csrf-token", "content-type,"]) {
    assert.equal(formPreflight(preflight({ "Access-Control-Request-Headers": header })).status, 403);
  }
});

test("success and error replies expose CORS only to trusted origins and preserve rate-limit headers", () => {
  for (const origin of [pagesOrigin, "https://starapp.example"]) {
    for (const status of [200, 400, 403, 413, 415, 429, 503]) {
      const response = formReply(request("{}", { Origin: origin }), status === 200 ? { ok: true } : { ok: false, error: "Try again." }, status, { "Retry-After": "60" });
      assert.equal(response.status, status);
      assert.equal(response.headers.get("access-control-allow-origin"), origin);
      assert.equal(response.headers.get("vary"), "Origin");
      assert.equal(response.headers.get("retry-after"), "60");
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.has("access-control-allow-credentials"), false);
    }
  }
  for (const origin of untrustedOrigins) {
    const response = formReply(request("{}", { Origin: origin }), { ok: false, error: "Not allowed." }, 403);
    assert.equal(response.headers.has("access-control-allow-origin"), false);
    assert.equal(response.headers.get("vary"), "Origin");
  }
});

test("limits actual body bytes even without Content-Length", async () => {
  await assert.rejects(readWaitlistRequest(request("x".repeat(WAITLIST_BODY_LIMIT + 1))), { status: 413 });
  await assert.rejects(readWaitlistRequest(request("{}", { "Content-Length": "999999" })), { status: 413 });
  await assert.rejects(readWaitlistRequest(request(`"${"🎵".repeat(WAITLIST_BODY_LIMIT / 4)}"`)), { status: 413 });
});

test("rate-limit digests are stable within a day and rotate between days", async () => {
  const first = await dailyIpDigest("192.0.2.1", "2026-10-09");
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, await dailyIpDigest("192.0.2.1", "2026-10-09"));
  assert.notEqual(first, await dailyIpDigest("192.0.2.1", "2026-10-10"));
  assert.notEqual(first, await dailyIpDigest("192.0.2.2", "2026-10-09"));
});
