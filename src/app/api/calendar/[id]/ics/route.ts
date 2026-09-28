import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getContext } from "@/lib/auth/session";
import { toIcs } from "@/lib/providers/calendar";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContext();
  const ev = await db.calendarEvent.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!ev) return new NextResponse("Not found", { status: 404 });
  const ics = toIcs({ uid: ev.id, title: ev.title, description: ev.title, start: ev.startsAt, end: ev.endsAt, location: ev.location ?? undefined, attendees: ev.attendees as { email: string; name?: string }[], timezone: "Europe/Zurich" });
  return new NextResponse(ics, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="interview-${id.slice(-6)}.ics"` } });
}
