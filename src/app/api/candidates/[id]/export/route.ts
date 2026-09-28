import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getContext } from "@/lib/auth/session";
import { exportCandidateData } from "@/lib/services/privacy";
import { userActor } from "@/lib/audit";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("candidates.export")) return new NextResponse("Forbidden", { status: 403 });
  const c = await db.candidate.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!c) return new NextResponse("Not found", { status: 404 });
  const data = await exportCandidateData(ctx.orgId, id, userActor(ctx.user));
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="hirely-export-${c.lastName.toLowerCase()}-${id.slice(-6)}.json"`, "cache-control": "no-store" },
  });
}
