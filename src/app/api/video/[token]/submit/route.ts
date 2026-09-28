import { NextResponse } from "next/server";
import { submitVideoInterview } from "@/lib/services/video";

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    await submitVideoInterview(token);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
