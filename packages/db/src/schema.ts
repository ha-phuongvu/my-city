import { date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// The shared My City account (Story City data model: "User"). One account works in every city.
// Only the base columns for now: sign-in (Auth.js), roles and profiles add theirs in Phase 0.
export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  displayName: text().notNull(),
  // needed for the age rules on mature stories
  birthDate: date(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
