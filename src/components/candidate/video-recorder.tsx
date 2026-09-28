"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, Loader2, RotateCcw, Square, Video } from "lucide-react";
import { Button } from "@/components/ui";
import { getT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Q = { index: number; text: string; prepSeconds: number; maxSeconds: number };
type SR = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null };

export function VideoRecorder({ token, locale, questions, answered }: { token: string; locale: string; questions: Q[]; answered: number[] }) {
  const t = getT(locale);
  const de = locale !== "en";
  const [done, setDone] = useState<number[]>(answered);
  const [current, setCurrent] = useState(() => questions.find((q) => !answered.includes(q.index))?.index ?? 0);
  const [phase, setPhase] = useState<"idle" | "prep" | "rec" | "uploading">("idle");
  const [left, setLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const captions = useRef("");
  const srRef = useRef<SR | null>(null);
  const startedAt = useRef(0);
  const q = questions.find((x) => x.index === current)!;

  useEffect(() => () => streamRef.current?.getTracks().forEach((tr) => tr.stop()), []);

  useEffect(() => {
    if (phase !== "prep" && phase !== "rec") return;
    if (left <= 0) {
      if (phase === "prep") startRecording();
      else stopRecording();
      return;
    }
    const id = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, left]);

  async function ensureCamera() {
    if (streamRef.current) return true;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      return true;
    } catch {
      setError(de ? "Kein Zugriff auf Kamera/Mikrofon. Bitte erlauben Sie den Zugriff im Browser oder nutzen Sie ein anderes Gerät." : "Camera/microphone access was denied. Please allow access in your browser or use another device.");
      return false;
    }
  }

  async function beginPrep() {
    setError(null);
    if (!(await ensureCamera())) return;
    setLeft(q.prepSeconds);
    setPhase("prep");
  }

  function startRecording() {
    const s = streamRef.current!;
    chunks.current = [];
    captions.current = "";
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "video/mp4";
    const rec = new MediaRecorder(s, { mimeType: mime, videoBitsPerSecond: 900_000 });
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = upload;
    rec.start(1000);
    recRef.current = rec;
    startedAt.current = Date.now();
    // Optional live captions (Web Speech API) as a transcript hint.
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (Ctor) {
      const sr = new Ctor();
      sr.lang = { de: "de-CH", en: "en-GB", fr: "fr-CH", it: "it-CH" }[locale] ?? "de-CH";
      sr.continuous = true;
      sr.interimResults = false;
      sr.onresult = (e) => {
        let txt = "";
        for (let i = 0; i < e.results.length; i++) if (e.results[i].isFinal) txt += e.results[i][0].transcript + " ";
        captions.current = txt.trim();
      };
      try { sr.start(); srRef.current = sr; } catch { /* captions optional */ }
    }
    setLeft(q.maxSeconds);
    setPhase("rec");
  }

  function stopRecording() {
    srRef.current?.stop();
    if (recRef.current?.state === "recording") recRef.current.stop();
    setPhase("uploading");
  }

  async function upload() {
    const blob = new Blob(chunks.current, { type: recRef.current?.mimeType.split(";")[0] ?? "video/webm" });
    const fd = new FormData();
    fd.set("file", blob, `answer-${current}.webm`);
    fd.set("index", String(current));
    fd.set("duration", String(Math.round((Date.now() - startedAt.current) / 1000)));
    await new Promise((r) => setTimeout(r, 400));
    fd.set("captions", captions.current);
    try {
      const r = await fetch(`/api/video/${token}/answer`, { method: "POST", body: fd });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(d.error ?? "Upload failed");
      const nextDone = [...new Set([...done, current])];
      setDone(nextDone);
      const next = questions.find((x) => !nextDone.includes(x.index));
      if (next) setCurrent(next.index);
    } catch (e) {
      setError(`${(e as Error).message}. ${de ? "Bitte nehmen Sie die Antwort erneut auf." : "Please record your answer again."}`);
    } finally {
      setPhase("idle");
    }
  }

  async function submit() {
    const r = await fetch(`/api/video/${token}/submit`, { method: "POST" });
    const d = (await r.json()) as { error?: string };
    if (!r.ok) setError(d.error ?? "Error");
    else {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      setSubmitted(true);
    }
  }

  if (submitted) return <div className="card mt-6 p-6 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" /><p className="mt-3 font-semibold text-ink">{t("video.done")}</p></div>;

  const allDone = questions.every((x) => done.includes(x.index));
  return (
    <div className="mt-6 space-y-4">
      <ol className="flex gap-2">
        {questions.map((x) => (
          <li key={x.index} className="flex-1">
            <button type="button" disabled={phase !== "idle"} onClick={() => setCurrent(x.index)} className={cn("flex w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium", x.index === current ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600")}>
              {done.includes(x.index) ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5" />}{t("video.question")} {x.index + 1}
            </button>
          </li>
        ))}
      </ol>
      <div className="card overflow-hidden">
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("video.question")} {current + 1} / {questions.length}</p>
          <p className="mt-1 text-lg font-medium leading-snug text-ink">{q.text}</p>
        </div>
        <div className="relative aspect-video bg-slate-900">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
          {phase === "idle" && !streamRef.current && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400"><Video className="mr-2 h-5 w-5" />{de ? "Kamera startet beim Aufnehmen" : "Camera starts when you record"}</div>}
          {phase === "prep" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 text-white"><p className="text-sm">{t("video.prepare")}</p><p className="text-5xl font-semibold tabular-nums">{left}</p></div>}
          {phase === "rec" && <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white"><span className="h-2 w-2 animate-pulseDot rounded-full bg-white" />REC {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</div>}
          {phase === "uploading" && <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 text-white"><Loader2 className="h-8 w-8 animate-spin" /></div>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 p-4">
          <p className="text-xs text-slate-500">{t("video.prepare")}: {q.prepSeconds}s · max. {Math.round(q.maxSeconds / 60)} min</p>
          <div className="flex gap-2">
            {phase === "idle" && <Button onClick={beginPrep}>{done.includes(current) ? <><RotateCcw className="h-4 w-4" />{t("video.retake")}</> : <><Video className="h-4 w-4" />{t("video.record")}</>}</Button>}
            {phase === "prep" && <Button onClick={() => setLeft(0)}>{t("video.record")}</Button>}
            {phase === "rec" && <Button variant="danger" onClick={stopRecording}><Square className="h-4 w-4" />{t("video.stopRecording")}</Button>}
          </div>
        </div>
      </div>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <Button size="lg" className="w-full" disabled={!allDone || phase !== "idle"} onClick={submit}>{t("video.submit")}</Button>
    </div>
  );
}
