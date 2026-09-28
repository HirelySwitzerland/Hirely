import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exportCandidateData } from "@/lib/services/privacy";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!rateLimit(`portal-export:${token}`, 5, 3600_000).ok) return new NextResponse("Too many requests", { status: 429 });
  const c = await db.candidate.findUnique({ where: { portalToken: token } });
  if (!c || c.anonymizedAt) return new NextResponse("Not found", { status: 404 });
  const data = await exportCandidateData(c.orgId, c.id, { type: "CANDIDATE", name: `${c.firstName} ${c.lastName}` });
  await db.dataRequest.create({ data: { orgId: c.orgId, candidateId: c.id, candidateEmail: c.email, type: "EXPORT", status: "COMPLETED", note: "Self-service export via candidate portal", completedAt: new Date() } });
  return new NextResponse(JSON.stringify(data, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="my-application-data.json"`, "cache-control": "no-store" } });
}
