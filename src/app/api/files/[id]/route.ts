import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getContext } from "@/lib/auth/session";
import { applicationScope } from "@/lib/services/scope";
import { getStorage } from "@/lib/providers/storage";
import { audit, userActor } from "@/lib/audit";

/** Decrypts and streams a candidate document. Tenant + role scoped; every download is audited. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("candidates.view")) return new NextResponse("Forbidden", { status: 403 });
  const doc = await db.document.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!doc) return new NextResponse("Not found", { status: 404 });
  const visible = await db.application.findFirst({ where: { ...applicationScope(ctx), candidateId: doc.candidateId } });
  if (!visible) return new NextResponse("Not found", { status: 404 });
  let data: Buffer;
  try {
    data = await getStorage().get(doc.storageKey);
  } catch (e) {
    console.error("[files] storage read failed", e);
    return new NextResponse("The file could not be retrieved from storage. Please contact support.", { status: 502 });
  }
  await audit(ctx.orgId, userActor(ctx.user), "document.downloaded", { type: "Document", id: doc.id, label: doc.filename });
  const inline = new URL(req.url).searchParams.get("inline") === "1" && doc.mimeType === "application/pdf";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": doc.mimeType,
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(doc.filename)}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
