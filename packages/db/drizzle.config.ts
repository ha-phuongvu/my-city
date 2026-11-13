import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// one .env at the repo root serves every app and package
config({ path: "../../.env" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  casing: "snake_case",
  strict: true,
});
