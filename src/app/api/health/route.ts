import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lightweight liveness probe used by Docker HEALTHCHECK and any
// upstream reverse proxy. Intentionally doesn't touch the DB so it
// reflects "the web server is up", not "every dependency is happy".
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
