/**
 * Pre-recorded voice clips (for example made with ElevenLabs) for interview lines.
 * A clip is found by a hash of the spoken text, so the same sentence always maps to
 * the same file: /voice/<id>.mp3, listed in /voice/manifest.json.
 * Lines without a clip fall back to the browser's built-in speech.
 */

export type VoiceSpeaker = "ai" | "candidate";
export type VoiceManifest = {
  source?: string;
  clips: Record<string, { speaker: VoiceSpeaker; text: string }>;
};

export const normalizeLine = (text: string) => text.replace(/\s+/g, " ").trim();

/** Stable 53-bit hash (cyrb53), as 14 hex characters. Same result in Node and the browser. */
export function clipId(text: string): string {
  const s = normalizeLine(text);
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}
