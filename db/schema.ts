import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const waitlistEntries = sqliteTable(
  "waitlist_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    audience: text("audience", { enum: ["creator", "scout"] }).notNull(),
    talent: text("talent").notNull(),
    consentVersion: text("consent_version").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("waitlist_email_audience_unique").on(table.email, table.audience)],
);

// Only a daily digest is stored. Previous days are removed as new requests arrive.
export const waitlistRateLimits = sqliteTable("waitlist_rate_limits", {
  key: text("key").primaryKey(),
  day: text("day").notNull(),
  attempts: integer("attempts").notNull().default(1),
});

export const privacyRequests = sqliteTable(
  "privacy_requests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    message: text("message").notNull().default(""),
    status: text("status", { enum: ["pending", "completed"] }).notNull().default("pending"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("privacy_pending_email_unique").on(table.email).where(sql`${table.status} = 'pending'`),
  ],
);
