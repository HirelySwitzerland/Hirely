import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getContext } from "@/lib/auth/session";
import { applicationScope } from "@/lib/services/scope";
import { getStorage } from "@/lib/providers/storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("interviews.view")) return new NextResponse("Forbidden", { status: 403 });
  const iv = await db.interview.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!iv?.recordingKey) return new NextResponse("Not found", { status: 404 });
  if (!(await db.application.findFirst({ where: { ...applicationScope(ctx), id: iv.applicationId } }))) return new NextResponse("Not found", { status: 404 });
  const data = await getStorage().get(iv.recordingKey);
  return new NextResponse(new Uint8Array(data), { headers: { "content-type": "audio/mpeg", "cache-control": "private, no-store" } });
}
