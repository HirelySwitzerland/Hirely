import { NextResponse } from "next/server";
import { saveVideoAnswer } from "@/lib/services/video";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!rateLimit(`video:${token}`, 30, 3600_000).ok) return NextResponse.json({ error: "Too many uploads." }, { status: 429 });
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No recording received." }, { status: 400 });
  try {
    const r = await saveVideoAnswer(token, Number(fd.get("index")), { buffer: Buffer.from(await file.arrayBuffer()), mime: file.type || "video/webm" }, String(fd.get("captions") ?? "") || undefined, Number(fd.get("duration")) || 0);
    return NextResponse.json({ ok: true, transcriptStatus: r.transcriptStatus });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
