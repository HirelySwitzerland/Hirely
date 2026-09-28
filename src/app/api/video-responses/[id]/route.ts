import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getContext } from "@/lib/auth/session";
import { applicationScope } from "@/lib/services/scope";
import { getStorage } from "@/lib/providers/storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("interviews.view")) return new NextResponse("Forbidden", { status: 403 });
  const r = await db.videoResponse.findFirst({ where: { id, orgId: ctx.orgId }, include: { interview: true } });
  if (!r?.storageKey) return new NextResponse("Not found", { status: 404 });
  const ok = await db.application.findFirst({ where: { ...applicationScope(ctx), id: r.interview.applicationId } });
  if (!ok) return new NextResponse("Not found", { status: 404 });
  const data = await getStorage().get(r.storageKey);
  return new NextResponse(new Uint8Array(data), { headers: { "content-type": r.mimeType ?? "video/webm", "cache-control": "private, no-store" } });
}
