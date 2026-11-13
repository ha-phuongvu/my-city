import { ping } from "@my-city/db";
import { connection } from "next/server";

// For uptime checks (NFR-OBS-01): 200 when the app and its database answer, 503 when the database doesn't
export async function GET() {
  await connection(); // always run at request time, never prerendered
  const db = (await ping()) ? "up" : "down";
  return Response.json(
    { status: db === "up" ? "ok" : "degraded", db },
    { status: db === "up" ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
