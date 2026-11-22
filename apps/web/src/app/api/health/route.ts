import { ping } from "@my-city/db";
import { connection } from "next/server";

// whether the database answers
enum DbState {
  Up = "up",
  Down = "down",
}

// the app's health as the check reports it
enum Health {
  Ok = "ok",
  Degraded = "degraded",
}

// For uptime checks (NFR-OBS-01): 200 when the app and its database answer, 503 when the database doesn't
export async function GET() {
  await connection(); // always run at request time, never prerendered
  const db = (await ping()) ? DbState.Up : DbState.Down;
  return Response.json(
    { status: db === DbState.Up ? Health.Ok : Health.Degraded, db },
    { status: db === DbState.Up ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
