"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, CheckCircle2, Loader2, Mic, MicOff, Send, Volume2, VolumeX } from "lucide-react";
import { getT } from "@/lib/i18n";
import { LinkButton } from "@/components/ui";
import { clipId, type VoiceManifest } from "@/lib/voice-clips";
import { cn } from "@/lib/utils";

type Line = { who: "ai" | "me"; text: string };
type Turn = { say: string[]; done: boolean; awaitingAnswer: boolean; error?: string };

// Minimal typing for the Web Speech API (not in TS DOM lib everywhere).
type SR = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

const LANG_TAG: Record<string, string> = { de: "de-CH", en: "en-GB", fr: "fr-CH", it: "it-CH" };

export function WebInterview({ token, locale, initialHistory, completed, portalHref }: { token: string; locale: string; initialHistory: Line[]; completed: boolean; portalHref?: string }) {
  const t = getT(locale);
  const [lines, setLines] = useState<Line[]>(initialHistory);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(completed);
  const [error, setError] = useState<string | null>(null);
  const [speak, setSpeak] = useState(false);
  const [soundHint, setSoundHint] = useState(false);
  const [clips, setClips] = useState<Set<string> | null>(null); // null while the clip list loads
  const speakRef = useRef(false);
  const clipsRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SR | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  useEffect(() => setSpeechSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window), []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines, busy]);

  useEffect(() => { speakRef.current = speak; }, [speak]);

  // Pre-recorded voice clips (e.g. made with ElevenLabs). When clips exist, the AI speaks by default.
  useEffect(() => {
    let alive = true;
    fetch("/voice/manifest.json")
      .then((r) => (r.ok ? (r.json() as Promise<VoiceManifest>) : null))
      .catch(() => null)
      .then((m) => {
        if (!alive) return;
        const ids = new Set(Object.keys(m?.clips ?? {}));
        clipsRef.current = ids;
        if (ids.size) { speakRef.current = true; setSpeak(true); }
        setClips(ids);
      });
    return () => { alive = false; };
  }, []);

  const stopVoice = useCallback(() => {
    queueRef.current = [];
    playingRef.current = false;
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);
  useEffect(() => () => stopVoice(), [stopVoice]);

  // Plays queued lines one after another: the recorded clip if there is one, otherwise the browser voice.
  const playNext = useCallback(() => {
    const tx = queueRef.current.shift();
    if (!tx) { playingRef.current = false; return; }
    playingRef.current = true;
    const browserVoice = () => {
      if (!window.speechSynthesis) { playNext(); return; }
      const u = new SpeechSynthesisUtterance(tx);
      u.lang = LANG_TAG[locale] ?? "de-CH";
      u.onend = () => playNext();
      u.onerror = () => playNext();
      window.speechSynthesis.speak(u);
    };
    const id = clipId(tx);
    if (!clipsRef.current.has(id)) { browserVoice(); return; }
    const audio = new Audio(`/voice/${id}.mp3`);
    audioRef.current = audio;
    audio.onended = () => playNext();
    audio.onerror = () => browserVoice();
    audio.play().catch(() => {
      // Autoplay blocked: switch sound off and show how to turn it on.
      stopVoice();
      speakRef.current = false;
      setSpeak(false);
      setSoundHint(true);
    });
  }, [locale, stopVoice]);

  const say = useCallback((texts: string[]) => {
    if (!speakRef.current || typeof window === "undefined" || !texts.length) return;
    queueRef.current.push(...texts);
    if (!playingRef.current) playNext();
  }, [playNext]);

  const toggleSpeak = () => {
    if (speak) { stopVoice(); speakRef.current = false; setSpeak(false); return; }
    speakRef.current = true;
    setSpeak(true);
    setSoundHint(false);
    const lastAnswer = lines.map((l) => l.who).lastIndexOf("me");
    say(lines.slice(lastAnswer + 1).filter((l) => l.who === "ai").map((l) => l.text));
  };

  const send = useCallback(async (answer: string | null) => {
    setBusy(true);
    setError(null);
    if (answer !== null) stopVoice();
    if (answer !== null) setLines((l) => [...l, { who: "me", text: answer || "—" }]);
    try {
      const r = await fetch(`/api/interview/${token}/turn`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answer }) });
      const d = (await r.json()) as Turn;
      if (!r.ok || d.error) throw new Error(d.error ?? "Error");
      setLines((l) => [...l, ...d.say.map((s) => ({ who: "ai" as const, text: s }))]);
      say(d.say);
      if (d.done) setDone(true);
    } catch (e) {
      setError((e as Error).message || "Verbindungsproblem – bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }, [token, say, stopVoice]);

  useEffect(() => {
    if (started.current || completed || clips === null) return;
    started.current = true;
    send(null);
  }, [send, completed, clips]);

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = LANG_TAG[locale] ?? "de-CH";
    rec.interimResults = true;
    rec.continuous = true;
    let finalText = input ? input + " " : "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setInput((finalText + interim).trimStart());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <>
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
          <p className="rounded-lg bg-brand-50/70 px-3 py-2 text-center text-xs text-brand-900">{t("interview.aiNotice")}</p>
          {lines.map((l, i) => (
            <div key={i} className={cn("flex gap-2.5", l.who === "me" && "flex-row-reverse")}>
              {l.who === "ai" && <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Bot className="h-4 w-4" /></span>}
              <p className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed", l.who === "ai" ? "rounded-tl-md bg-white text-ink shadow-card ring-1 ring-slate-200" : "rounded-tr-md bg-brand-600 text-white")}>{l.text}</p>
            </div>
          ))}
          {busy && <Loader2 className="ml-11 h-5 w-5 animate-spin text-slate-400" />}
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error} <button onClick={() => send(lines.filter((x) => x.who === "me").length ? lines[lines.length - 1].text : null)} className="font-semibold underline">Erneut</button></p>}
          {done && (
            <div className="card p-6 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <p className="mt-3 font-semibold text-ink">{t("interview.completed")}</p>
              {portalHref && <LinkButton href={portalHref} variant="secondary" className="mt-4">{t("portal.back")}</LinkButton>}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
      {!done && (
        <div className="shrink-0 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
          {soundHint && <p className="mx-auto max-w-2xl px-4 pt-2 text-xs text-slate-500">{t("interview.soundHint")}</p>}
          <form className="mx-auto flex max-w-2xl items-end gap-2 px-4 py-3" onSubmit={(e) => { e.preventDefault(); if (!busy) { const a = input.trim(); setInput(""); recRef.current?.stop(); send(a); } }}>
            <button type="button" onClick={toggleSpeak} className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", speak ? "border-brand-300 bg-brand-50 text-brand-600" : "border-slate-200 text-slate-400")} title={t("interview.readAloud")} aria-label={t("interview.readAloud")}>
              {speak ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
            {speechSupported && (
              <button type="button" onClick={toggleMic} className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", listening ? "animate-pulseDot border-rose-300 bg-rose-50 text-rose-600" : "border-slate-200 text-slate-500")} title={t("interview.speak")} aria-label={t("interview.speak")}>
                {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            )}
            <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder={t("interview.type")} className="input max-h-40 min-h-[44px] flex-1 resize-none py-2.5 text-[15px]" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }} aria-label={t("interview.type")} />
            <button disabled={busy} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white disabled:opacity-50" aria-label={t("interview.send")}><Send className="h-5 w-5" /></button>
          </form>
        </div>
      )}
    </>
  );
}
