import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviewTurn } from "@/lib/services/interviews";
import { rateLimit } from "@/lib/rate-limit";

/** Browser interview turn endpoint. Authorized by the unguessable interview token. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!rateLimit(`turn:${token}`, 120, 3600_000).ok) return NextResponse.json({ error: "Zu viele Anfragen. Bitte warten Sie einen Moment." }, { status: 429 });
  const iv = await db.interview.findUnique({ where: { token } });
  if (!iv || iv.type === "VIDEO") return NextResponse.json({ error: "Gespräch nicht gefunden." }, { status: 404 });
  if (iv.status === "COMPLETED") return NextResponse.json({ say: [], done: true, awaitingAnswer: false });
  const body = (await req.json().catch(() => ({}))) as { answer?: string | null };
  const answer = typeof body.answer === "string" ? body.answer.slice(0, 4000) : null;
  try {
    const r = await interviewTurn(iv.id, answer, "WEB");
    return NextResponse.json(r);
  } catch (e) {
    console.error("[interview-turn]", e);
    return NextResponse.json({ error: "Der Interview-Assistent hatte ein Problem. Ihre bisherigen Antworten sind gespeichert – bitte laden Sie die Seite neu, um weiterzumachen." }, { status: 500 });
  }
}
