import { NextResponse, type NextRequest } from "next/server";

/**
 * Inbound email webhook — currently disabled.
 * The app uses Resend for outbound which doesn't include inbound email parsing.
 * Clients reply via the project portal. Joe receives replies in his own inbox.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: "inbound_disabled" }, { status: 410 });
}
