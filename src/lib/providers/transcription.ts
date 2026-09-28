/**
 * Speech-to-text abstraction for video interview answers and call recordings.
 * The mock provider uses the live caption captured in the candidate's browser
 * (Web Speech API) when available; otherwise it reports the transcript as
 * unavailable so the recruiter sees a clear recovery action.
 */
export type TranscriptionResult = { ok: true; text: string; provider: string } | { ok: false; error: string; provider: string };

export interface TranscriptionProvider {
  name: string;
  transcribe(audio: Buffer, mime: string, opts: { language: string; hint?: string }): Promise<TranscriptionResult>;
}

class MockTranscription implements TranscriptionProvider {
  name = "mock-stt";
  async transcribe(_audio: Buffer, _mime: string, opts: { language: string; hint?: string }): Promise<TranscriptionResult> {
    if (opts.hint && opts.hint.trim().length > 3) return { ok: true, text: opts.hint.trim(), provider: `${this.name} (browser captions)` };
    return { ok: false, error: "Transcript unavailable: no speech-to-text provider configured and no browser captions were captured.", provider: this.name };
  }
}

class OpenAITranscription implements TranscriptionProvider {
  name = "openai-whisper";
  async transcribe(audio: Buffer, mime: string, opts: { language: string }): Promise<TranscriptionResult> {
    try {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(audio)], { type: mime }), "answer.webm");
      form.append("model", "whisper-1");
      form.append("language", opts.language.slice(0, 2));
      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: form,
      });
      if (!res.ok) return { ok: false, error: `Transcription failed (HTTP ${res.status})`, provider: this.name };
      const data = (await res.json()) as { text: string };
      return { ok: true, text: data.text, provider: this.name };
    } catch (e) {
      return { ok: false, error: (e as Error).message, provider: this.name };
    }
  }
}

export function getTranscriber(): TranscriptionProvider {
  if (process.env.TRANSCRIPTION_PROVIDER === "openai" && process.env.OPENAI_API_KEY) return new OpenAITranscription();
  return new MockTranscription();
}

export const TRANSCRIPTION_COST_CENTS_PER_MIN = 0.6;
