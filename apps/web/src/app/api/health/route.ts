import { ping } from "@my-city/db";
import { connection } from "next/server";

enum DbState {
  Up = "up",
  Down = "down",
}

enum Health {
  Ok = "ok",
  Degraded = "degraded",
}

export async function GET() {
  await connection();
  const db = (await ping()) ? DbState.Up : DbState.Down;
  return Response.json(
    { status: db === DbState.Up ? Health.Ok : Health.Degraded, db },
    { status: db === DbState.Up ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
