import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getContext } from "@/lib/auth/session";

export async function GET() {
  const ctx = await getContext();
  const [items, unread] = await Promise.all([
    db.notification.findMany({ where: { userId: ctx.user.id, orgId: ctx.orgId }, orderBy: { createdAt: "desc" }, take: 25 }),
    db.notification.count({ where: { userId: ctx.user.id, orgId: ctx.orgId, readAt: null } }),
  ]);
  return NextResponse.json({ items, unread });
}

export async function POST(req: Request) {
  const ctx = await getContext();
  const body = (await req.json().catch(() => ({}))) as { id?: string; all?: boolean };
  const where = { userId: ctx.user.id, orgId: ctx.orgId, readAt: null, ...(body.all ? {} : { id: String(body.id ?? "") }) };
  await db.notification.updateMany({ where, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
