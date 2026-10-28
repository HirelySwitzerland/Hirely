import { NextResponse } from "next/server";
import { getContext } from "@/lib/auth/session";
import { askAssistant } from "@/lib/services/assistant";
import { rateLimit } from "@/lib/rate-limit";
import { AIUnavailableError } from "@/lib/providers/llm";

export async function POST(req: Request) {
  const ctx = await getContext();
  if (!ctx.can("assistant.use")) return NextResponse.json({ error: "You don't have access to the assistant." }, { status: 403 });
  if (!rateLimit(`assistant:${ctx.user.id}`, 30, 60_000).ok) return NextResponse.json({ error: "You're asking very quickly — please wait a moment." }, { status: 429 });
  const { question } = (await req.json().catch(() => ({}))) as { question?: string };
  if (!question || typeof question !== "string") return NextResponse.json({ error: "Bitte geben Sie eine Frage ein." }, { status: 400 });
  try {
    return NextResponse.json(await askAssistant(ctx, question));
  } catch (e) {
    if (e instanceof AIUnavailableError) return NextResponse.json({ error: `${e.message} Your data is unaffected — try again shortly.` }, { status: 503 });
    console.error("[assistant]", e);
    return NextResponse.json({ error: "Beim Antworten ist etwas schiefgelaufen. Bitte versuchen Sie es noch einmal." }, { status: 500 });
  }
}
