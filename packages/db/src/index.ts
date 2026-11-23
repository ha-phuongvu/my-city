import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

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

export async function ping(): Promise<boolean> {
  try {
    await getDb().execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
