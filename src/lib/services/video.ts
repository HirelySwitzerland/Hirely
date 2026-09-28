import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { detectInjection, wrapUntrusted } from "@/lib/ai-safety";
import { generate, parseJsonLoose } from "@/lib/providers/llm";
import { getStorage, sniffMime } from "@/lib/providers/storage";
import { getTranscriber, TRANSCRIPTION_COST_CENTS_PER_MIN } from "@/lib/providers/transcription";
import { notify } from "./notifications";
import { reevaluate } from "./screening";
import { recordUsage } from "./usage";

export type VideoQuestion = { index: number; text: string; prepSeconds: number; maxSeconds: number };

export const MAX_VIDEO_BYTES = 60 * 1024 * 1024;

/**
 * Stores one recorded answer, transcribes it and analyses ONLY the spoken
 * content against configured requirements. No facial, emotional, appearance
 * or personality inference is performed — by design there is no code path for it.
 */
export async function saveVideoAnswer(token: string, questionIndex: number, file: { buffer: Buffer; mime: string }, captionHint: string | undefined, durationSec: number) {
  const iv = await db.interview.findUnique({ where: { token }, include: { application: { include: { job: { include: { requirements: true } }, candidate: true } } } });
  if (!iv || iv.type !== "VIDEO") throw new Error("Invalid video interview link.");
  if (iv.status === "COMPLETED") throw new Error("This video interview has already been submitted.");
  const questions = iv.flowSnapshot as unknown as VideoQuestion[];
  const q = questions.find((x) => x.index === questionIndex);
  if (!q) throw new Error("Unknown question.");
  if (file.buffer.length > MAX_VIDEO_BYTES) throw new Error("Recording is too large (max 60 MB).");
  const mime = sniffMime(file.buffer, file.mime);
  if (!mime || !(mime.startsWith("video") || mime.startsWith("audio"))) throw new Error("Unsupported recording format.");

  const key = await getStorage().put(iv.orgId, `video/${iv.id}`, file.buffer, mime.includes("mp4") ? "mp4" : "webm");
  if (iv.status === "PENDING") {
    await db.interview.update({ where: { id: iv.id }, data: { status: "IN_PROGRESS", startedAt: new Date(), aiDisclosedAt: new Date(), provider: "browser-recorder" } });
    await db.application.update({ where: { id: iv.applicationId }, data: { videoStatus: "IN_PROGRESS", lastCandidateActionAt: new Date() } });
  }
  await db.videoResponse.deleteMany({ where: { interviewId: iv.id, questionIndex } });
  const stt = await getTranscriber().transcribe(file.buffer, mime, { language: iv.language, hint: captionHint });
  let analysis: Record<string, unknown> = {};
  if (stt.ok) {
    const injection = detectInjection(stt.text);
    const res = await generate(
      {
        task: "video_answer_analysis",
        orgId: iv.orgId,
        json: true,
        system: "Analyze only the spoken content of the answer. Do not infer personality, emotions, appearance, health or any protected characteristic.",
        prompt: `Question: ${q.text}\nRequirements: ${JSON.stringify(iv.application.job.requirements.map((r) => ({ id: r.id, label: r.label })))}\nAnswer transcript:\n${wrapUntrusted("video_transcript", stt.text)}\nReturn {keyPoints: string[], relatedRequirements: string[]}`,
        input: { question: q.text, transcript: stt.text, requirements: iv.application.job.requirements.map((r) => ({ id: r.id, label: r.label, keywords: r.keywords })) },
      },
      { fallbackToMock: true },
    );
    analysis = { ...(parseJsonLoose(res.text) ?? {}), injectionWarning: injection[0] ?? null };
  }
  const resp = await db.videoResponse.create({
    data: {
      orgId: iv.orgId,
      interviewId: iv.id,
      questionIndex,
      questionText: q.text,
      storageKey: key,
      mimeType: mime,
      durationSec: Math.round(durationSec),
      transcript: stt.ok ? stt.text : null,
      transcriptStatus: stt.ok ? "COMPLETED" : "UNAVAILABLE",
      analysis: { ...analysis, transcriptionProvider: stt.provider, transcriptionError: stt.ok ? null : stt.error } as object,
    },
  });
  await recordUsage(iv.orgId, "TRANSCRIPTION_MINUTES", Math.max(1, Math.ceil(durationSec / 60)), Math.ceil(durationSec / 60) * TRANSCRIPTION_COST_CENTS_PER_MIN, { type: "video", id: resp.id });
  return resp;
}

export async function submitVideoInterview(token: string) {
  const iv = await db.interview.findUnique({ where: { token }, include: { videoResponses: true, application: { include: { candidate: true, job: true } } } });
  if (!iv || iv.type !== "VIDEO") throw new Error("Invalid link.");
  const questions = iv.flowSnapshot as unknown as VideoQuestion[];
  const missing = questions.filter((q) => !iv.videoResponses.some((r) => r.questionIndex === q.index));
  if (missing.length) throw new Error(`Please answer all questions (${missing.length} remaining).`);
  const duration = iv.videoResponses.reduce((s, r) => s + (r.durationSec ?? 0), 0);
  const unavailable = iv.videoResponses.filter((r) => r.transcriptStatus !== "COMPLETED").length;
  await db.interview.update({
    where: { id: iv.id },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
      durationSec: duration,
      summary: iv.videoResponses
        .sort((a, b) => a.questionIndex - b.questionIndex)
        .map((r) => `- **${r.questionText}** ${r.transcript ? r.transcript.slice(0, 200) : "_Transcript unavailable — watch the recording._"}`)
        .join("\n"),
    },
  });
  await db.application.update({ where: { id: iv.applicationId }, data: { videoStatus: "COMPLETED", lastCandidateActionAt: new Date() } });
  await reevaluate(iv.applicationId);
  await recordUsage(iv.orgId, "VIDEO_INTERVIEWS", 1, 0, { type: "interview", id: iv.id });
  await audit(iv.orgId, { type: "CANDIDATE", name: iv.application.candidate.firstName }, "interview.completed", { type: "Interview", id: iv.id, label: `Video · ${iv.application.candidate.firstName} ${iv.application.candidate.lastName}` });
  await notify(iv.orgId, {
    type: "interview_completed",
    title: `Video interview submitted: ${iv.application.candidate.firstName} ${iv.application.candidate.lastName}`,
    body: unavailable ? `${unavailable} answer(s) have no transcript — recordings are available for review.` : `${iv.application.job.title} · ${questions.length} answers`,
    link: `/app/candidates/${iv.applicationId}?tab=interview`,
    severity: unavailable ? "warning" : "success",
  });
}
