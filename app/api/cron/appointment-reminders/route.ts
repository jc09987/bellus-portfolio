import { NextRequest, NextResponse } from "next/server";
import { runAppointmentReminders } from "@/lib/demo/book";
import { peekSession, saveSession } from "@/lib/demo/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  const session = peekSession();
  if (!session) {
    return NextResponse.json({ ok: true, dryRun, sent24h: 0, sent2h: 0 });
  }
  const reminder = runAppointmentReminders(session, { dryRun });
  if (!dryRun) saveSession(session);
  return NextResponse.json({ ok: true, ...reminder });
}
