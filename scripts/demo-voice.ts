/**
 * Demo voice clips and phone-interview recordings (no live AI needed).
 *
 *   npm run demo:voice -- lines        List every sentence that needs a clip  → demo/voice/lines.json
 *   npm run demo:voice -- elevenlabs   Create missing clips with ElevenLabs   → public/voice/<id>.mp3
 *   npm run demo:voice -- manifest     Rebuild public/voice/manifest.json from the clips on disk
 *   npm run demo:voice -- recording    Join clips into phone recordings (ffmpeg) → prisma/demo/recordings/
 *
 * ElevenLabs settings (.env): ELEVENLABS_API_KEY, optional ELEVENLABS_VOICE_AI and ELEVENLABS_VOICE_CANDIDATE
 * (voice IDs, for example your own cloned voice for the AI interviewer).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { db } from "../src/lib/db";
import { clipId, normalizeLine, type VoiceManifest, type VoiceSpeaker } from "../src/lib/voice-clips";

const ROOT = process.cwd();
const CLIPS = path.join(ROOT, "public", "voice");
const LINES = path.join(ROOT, "demo", "voice", "lines.json");
const RECORDINGS = path.join(ROOT, "prisma", "demo", "recordings");

/** Phone interviews from the demo data that get a recording (the seed attaches them). */
const RECORDED = [{ first: "Roman", last: "Egli" }];
/** The applicant used in the live demo (see demo/Vorfuehrung.md): their AI questions get clips. */
const LIVE = { first: "Max", last: "Muster" };
/** Lines the interview engine can add on top of the questions (follow-up and "did not understand"). */
const EXTRA_AI_LINES = [
  "Können Sie das bitte etwas genauer ausführen, zum Beispiel mit einem konkreten Beispiel?",
  "Entschuldigung, ich habe Sie nicht verstanden. Könnten Sie das bitte wiederholen?",
];

type Line = { id: string; speaker: VoiceSpeaker; text: string; say: string; for: string[] };

/** What the voice should actually say: the shown text with a few pronunciation fixes. */
export function sayText(text: string) {
  return normalizeLine(text)
    .replace(/(\d+)'(\d{3})/g, "$1$2") // 85'000 → 85000 (read as a number, not "apostrophe")
    .replace(/([A-Za-zÄÖÜäöü]+)\/in\b/g, "$1") // Servicetechniker/in → Servicetechniker
    .replace(/\bKat\. /g, "Kategorie ");
}
const slug = (first: string, last: string) => `${first}-${last}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
const exists = (p: string) => fs.access(p).then(() => true, () => false);

async function latestInterview(first: string, last: string) {
  return db.interview.findFirst({
    where: { status: "COMPLETED", type: { not: "VIDEO" }, application: { candidate: { firstName: first, lastName: last } } },
    orderBy: { endedAt: "desc" },
    include: { segments: { orderBy: { order: "asc" } } },
  });
}

async function lines() {
  const out = new Map<string, Line>();
  const add = (speaker: VoiceSpeaker, text: string, use: string) => {
    const id = clipId(text);
    const l = out.get(id) ?? { id, speaker, text: normalizeLine(text), say: sayText(text), for: [] };
    if (!l.for.includes(use)) l.for.push(use);
    out.set(id, l);
  };
  for (const r of RECORDED) {
    const iv = await latestInterview(r.first, r.last);
    if (!iv) { console.warn(`No completed interview for ${r.first} ${r.last} – run "npm run db:seed" first.`); continue; }
    for (const s of iv.segments) if (s.speaker !== "SYSTEM") add(s.speaker === "AI" ? "ai" : "candidate", s.text, `aufnahme:${slug(r.first, r.last)}`);
  }
  const live = await latestInterview(LIVE.first, LIVE.last);
  if (live) for (const s of live.segments) if (s.speaker === "AI") add("ai", s.text, "live-demo");
  else console.warn(`No interview for ${LIVE.first} ${LIVE.last} yet – do the live demo once (career page → browser interview), then run this again.`);
  for (const t of EXTRA_AI_LINES) add("ai", t, "live-demo");
  const list = [...out.values()];
  await fs.mkdir(path.dirname(LINES), { recursive: true });
  await fs.writeFile(LINES, JSON.stringify({ lines: list }, null, 2) + "\n");
  const chars = list.reduce((n, l) => n + l.text.length, 0);
  console.log(`${list.length} lines (${list.filter((l) => l.speaker === "ai").length} AI, ${list.filter((l) => l.speaker === "candidate").length} candidate, ${chars} characters) → ${path.relative(ROOT, LINES)}`);
}

async function readLines(): Promise<Line[]> {
  return (JSON.parse(await fs.readFile(LINES, "utf8")) as { lines: Line[] }).lines;
}

async function manifest() {
  const list = await readLines();
  const m: VoiceManifest = { source: "ElevenLabs", clips: {} };
  for (const l of list) if (await exists(path.join(CLIPS, `${l.id}.mp3`))) m.clips[l.id] = { speaker: l.speaker, text: l.text };
  await fs.mkdir(CLIPS, { recursive: true });
  await fs.writeFile(path.join(CLIPS, "manifest.json"), JSON.stringify(m, null, 2) + "\n");
  console.log(`Fertig: ${Object.keys(m.clips).length} von ${list.length} Sätzen haben eine Aufnahme (public/voice/manifest.json).`);
}

async function elevenlabs() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('In der Datei .env fehlt ELEVENLABS_API_KEY="…" (Ihr ElevenLabs-API-Schlüssel).');
  // Defaults are ElevenLabs premade voices; set your own voice IDs (e.g. a cloned voice) in .env.
  const voice = { ai: process.env.ELEVENLABS_VOICE_AI || "21m00Tcm4TlvDq8ikWAM", candidate: process.env.ELEVENLABS_VOICE_CANDIDATE || "pNInz6obpgDQGcFmaJgB" };
  await fs.mkdir(CLIPS, { recursive: true });
  const all = await readLines();
  let made = 0;
  for (const [n, l] of all.entries()) {
    const file = path.join(CLIPS, `${l.id}.mp3`);
    if (await exists(file)) continue;
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice[l.speaker]}?output_format=mp3_44100_64`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text: l.say ?? sayText(l.text), model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      const hint =
        res.status === 402 || /quota/i.test(detail) ? "Zeichen-Kontingent bei ElevenLabs aufgebraucht." :
        res.status === 401 ? "API-Schlüssel falsch, oder dem Schlüssel fehlt die Berechtigung „Text to Speech“." :
        res.status === 404 || (res.status === 400 && /voice/i.test(detail)) ? `Stimmen-ID nicht gefunden (${voice[l.speaker]}). Stimme in ElevenLabs zu „Meine Stimmen“ hinzufügen und die ID prüfen.` :
        "";
      throw new Error(`ElevenLabs meldet Fehler ${res.status}. ${hint}\n${detail}\n(Die bisher erzeugten ${made} Dateien bleiben; einfach erneut starten.)`);
    }
    await fs.writeFile(file, Buffer.from(await res.arrayBuffer()));
    made++;
    console.log(`✓ ${String(n + 1).padStart(2)}/${all.length} ${l.speaker === "ai" ? "KI      " : "Bewerber"}  ${l.text.slice(0, 70)}`);
  }
  console.log(made ? `${made} neue Dateien in public/voice erzeugt.` : "Alle Dateien waren schon da.");
  await manifest();
}

const ffprobeSec = (file: string) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());

async function recording() {
  await fs.mkdir(RECORDINGS, { recursive: true });
  const tmp = await fs.mkdtemp(path.join(ROOT, ".voice-tmp-"));
  try {
    for (const r of RECORDED) {
      const iv = await latestInterview(r.first, r.last);
      if (!iv) throw new Error(`No completed interview for ${r.first} ${r.last} – run "npm run db:seed" first.`);
      const segs = iv.segments.filter((s) => s.speaker !== "SYSTEM");
      const parts: string[] = [];
      const timings: { speaker: string; text: string; startMs: number }[] = [];
      const silence = (ms: number) => {
        const f = path.join(tmp, `silence-${ms}.wav`);
        execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", String(ms / 1000), f]);
        return f;
      };
      let t = 600;
      parts.push(silence(600));
      for (const [i, s] of segs.entries()) {
        const src = path.join(CLIPS, `${clipId(s.text)}.mp3`);
        if (!(await exists(src))) throw new Error(`Missing clip for: "${s.text.slice(0, 60)}…" – run "lines" and create the clips first.`);
        const wav = path.join(tmp, `${i}.wav`);
        execFileSync("ffmpeg", ["-y", "-v", "error", "-i", src, "-ac", "1", "-ar", "24000", wav]);
        timings.push({ speaker: s.speaker, text: s.text, startMs: Math.round(t) });
        parts.push(wav);
        t += ffprobeSec(wav) * 1000;
        const next = segs[i + 1];
        if (next) { const gap = next.speaker === "AI" ? 750 : 500; parts.push(silence(gap)); t += gap; }
      }
      parts.push(silence(800));
      t += 800;
      const list = path.join(tmp, "list.txt");
      await fs.writeFile(list, parts.map((p) => `file '${p}'`).join("\n"));
      const name = slug(r.first, r.last);
      const out = path.join(RECORDINGS, `${name}.mp3`);
      // Light telephone character: narrower band, gentle compression.
      execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-af", "highpass=f=180,lowpass=f=4200,acompressor=threshold=-18dB:ratio=2.5", "-ac", "1", "-ar", "22050", "-c:a", "libmp3lame", "-b:a", "64k", out]);
      await fs.writeFile(path.join(RECORDINGS, `${name}.json`), JSON.stringify({ durationSec: Math.round(t / 100) / 10, segments: timings }, null, 2) + "\n");
      console.log(`✓ ${path.relative(ROOT, out)} (${Math.round(t / 1000)} s, ${segs.length} lines)`);
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

const cmd = process.argv[2];
const run = { lines, manifest, elevenlabs, recording }[cmd as "lines"];
if (!run) {
  console.log("Usage: npm run demo:voice -- lines | elevenlabs | manifest | recording");
  process.exit(1);
}
run().then(() => db.$disconnect()).catch(async (e) => { console.error(e instanceof Error ? e.message : e); await db.$disconnect(); process.exit(1); });
