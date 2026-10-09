import { lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { waitlistEntries, waitlistRateLimits } from "@/db/schema";
import {
  dailyIpDigest,
  readWaitlistRequest,
  validateWaitlist,
  WAITLIST_CONSENT_VERSION,
  WAITLIST_DAILY_LIMIT,
  WaitlistRequestError,
} from "@/lib/waitlist";

function reply(body: { ok: true } | { ok: false; error: string }, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export async function POST(request: Request) {
  try {
    const validation = validateWaitlist(await readWaitlistRequest(request));
    if (!validation.ok) return reply(validation, 400);
    if (validation.honeypot) return reply({ ok: true });

    const db = getDb();
    // Cloudflare sets this header at the edge. Do not trust X-Forwarded-For.
    const ip = request.headers.get("cf-connecting-ip");
    if (ip) {
      const day = new Date().toISOString().slice(0, 10);
      const key = await dailyIpDigest(ip, day);
      await db.delete(waitlistRateLimits).where(lt(waitlistRateLimits.day, day));
      const [limit] = await db
        .insert(waitlistRateLimits)
        .values({ key, day, attempts: 1 })
        .onConflictDoUpdate({
          target: waitlistRateLimits.key,
          set: { attempts: sql`${waitlistRateLimits.attempts} + 1` },
        })
        .returning({ attempts: waitlistRateLimits.attempts });
      if (limit.attempts > WAITLIST_DAILY_LIMIT) {
        const secondsUntilTomorrow = Math.max(1, Math.ceil((Date.parse(`${day}T00:00:00Z`) + 86400000 - Date.now()) / 1000));
        return reply(
          { ok: false, error: "There have been a lot of signups from this connection today. Please try again tomorrow." },
          429,
          { "Retry-After": String(secondsUntilTomorrow) },
        );
      }
    }

    await db
      .insert(waitlistEntries)
      .values({ ...validation.entry, consentVersion: WAITLIST_CONSENT_VERSION })
      .onConflictDoNothing({ target: [waitlistEntries.email, waitlistEntries.audience] });
    return reply({ ok: true });
  } catch (error) {
    if (error instanceof WaitlistRequestError) {
      return reply({ ok: false, error: error.message }, error.status);
    }
    console.error("[waitlist] Registration storage is temporarily unavailable.");
    return reply(
      { ok: false, error: "We could not save your place just now. Please try again in a moment." },
      503,
      { "Retry-After": "60" },
    );
  }
}
