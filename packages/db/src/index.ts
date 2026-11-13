import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

// One connection pool per server process, opened on first use. It is kept on globalThis because
// in development Next.js reloads modules on every change, which would otherwise open a new pool each time.
const globalForDb = globalThis as unknown as { myCityDb?: Db };

export function getDb(): Db {
  if (!globalForDb.myCityDb) {
    const url = process.env.DATABASE_URL;
    if (!url)
      throw new Error("DATABASE_URL is not set. Copy .env.example to .env at the repo root.");
    globalForDb.myCityDb = drizzle(postgres(url, { max: 10, connect_timeout: 5 }), {
      schema,
      casing: "snake_case",
    });
  }
  return globalForDb.myCityDb;
}

/** True when the database answers. Used by the health check. */
export async function ping(): Promise<boolean> {
  try {
    await getDb().execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
