import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dailyIpDigest,
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

test("accepts only same-origin JSON", async () => {
  assert.deepEqual(await readWaitlistRequest(request(JSON.stringify(valid))), valid);
  await assert.rejects(readWaitlistRequest(request("{}", { Origin: "https://other.example" })), { status: 403 });
  await assert.rejects(readWaitlistRequest(request("{}", { "Sec-Fetch-Site": "cross-site" })), { status: 403 });
  await assert.rejects(readWaitlistRequest(request("{}", { "Content-Type": "text/plain" })), { status: 415 });
  await assert.rejects(readWaitlistRequest(request("{")), { status: 400 });
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
