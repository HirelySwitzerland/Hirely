import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { FAIRNESS_SYSTEM_RULE, UNTRUSTED_SYSTEM_RULE } from "@/lib/ai-safety";
import { mockGenerate } from "./mock-llm";

/**
 * LLM abstraction layer. Business logic never talks to a vendor SDK directly;
 * it calls `generate()` with a task name, a prompt for real models and a
 * structured `input` that the deterministic mock provider can work from.
 */
export type LLMTask =
  | "job_ad"
  | "candidate_summary"
  | "interview_summary"
  | "draft_email"
  | "generate_questions"
  | "followup_question"
  | "parse_cv"
  | "assistant"
  | "video_answer_analysis";

export interface LLMRequest {
  task: LLMTask;
  orgId?: string;
  system?: string;
  prompt: string;
  input?: unknown;
  json?: boolean;
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface LLMProvider {
  name: string;
  model: string;
  generate(req: LLMRequest): Promise<LLMResponse>;
}

export class AIUnavailableError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

const BASE_SYSTEM = `You are Hirely, an AI recruiting assistant working for an employer in Switzerland/DACH.
You automate administrative recruiting work; you never make hiring decisions.
${FAIRNESS_SYSTEM_RULE}
${UNTRUSTED_SYSTEM_RULE}`;

class AnthropicProvider implements LLMProvider {
  name = "anthropic";
  model = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
  private client = new Anthropic();

  async generate(req: LLMRequest): Promise<LLMResponse> {
    try {
      // Server-side fallback lets the API re-route a refused request to a suitable model.
      const res = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: req.maxTokens ?? 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: [BASE_SYSTEM, req.system, req.json ? "Respond with a single valid JSON object and nothing else." : ""]
          .filter(Boolean)
          .join("\n\n"),
        messages: [{ role: "user", content: req.prompt }],
      } as Anthropic.Beta.MessageCreateParamsNonStreaming);
      if (res.stop_reason === "refusal") throw new AIUnavailableError("The AI model declined this request.");
      const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
      return { text, provider: this.name, model: res.model, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens };
    } catch (e) {
      if (e instanceof AIUnavailableError) throw e;
      if (e instanceof Anthropic.RateLimitError) throw new AIUnavailableError("AI provider rate limit reached. Retrying later.", e);
      if (e instanceof Anthropic.AuthenticationError) throw new AIUnavailableError("AI provider credentials are invalid.", e);
      if (e instanceof Anthropic.APIError) throw new AIUnavailableError(`AI provider error (${e.status}).`, e);
      throw new AIUnavailableError("AI service unavailable.", e);
    }
  }
}

class OpenAIProvider implements LLMProvider {
  name = "openai";
  model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  async generate(req: LLMRequest): Promise<LLMResponse> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens ?? 4000,
        response_format: req.json ? { type: "json_object" } : undefined,
        messages: [
          { role: "system", content: [BASE_SYSTEM, req.system].filter(Boolean).join("\n\n") },
          { role: "user", content: req.prompt },
        ],
      }),
    }).catch((e) => {
      throw new AIUnavailableError("AI service unreachable.", e);
    });
    if (!res.ok) throw new AIUnavailableError(`AI provider error (${res.status}).`);
    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage: { prompt_tokens: number; completion_tokens: number };
      model: string;
    };
    return {
      text: data.choices[0]?.message.content ?? "",
      provider: this.name,
      model: data.model,
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
    };
  }
}

class MockProvider implements LLMProvider {
  name = "mock";
  model = "hirely-mock-1";
  async generate(req: LLMRequest): Promise<LLMResponse> {
    const text = mockGenerate(req);
    return {
      text,
      provider: this.name,
      model: this.model,
      inputTokens: Math.ceil(req.prompt.length / 4),
      outputTokens: Math.ceil(text.length / 4),
    };
  }
}

let cached: LLMProvider | null = null;
export function getLLM(): LLMProvider {
  if (cached) return cached;
  const pref = process.env.LLM_PROVIDER;
  if ((pref === "anthropic" || !pref) && process.env.ANTHROPIC_API_KEY) cached = new AnthropicProvider();
  else if ((pref === "openai" || !pref) && process.env.OPENAI_API_KEY) cached = new OpenAIProvider();
  else cached = new MockProvider();
  return cached;
}

// Blended list prices per 1M tokens (USD→CHF ≈ 1:0.9, rounded) — used for cost estimation only.
const TOKEN_PRICE_CENTS_PER_M: Record<string, { in: number; out: number }> = {
  anthropic: { in: 360, out: 1800 },
  openai: { in: 40, out: 160 },
  mock: { in: 0, out: 0 },
};

/** Generate text and record usage. On provider failure, falls back to the mock provider only if allowed. */
export async function generate(req: LLMRequest, opts: { fallbackToMock?: boolean } = {}): Promise<LLMResponse> {
  const provider = getLLM();
  let res: LLMResponse;
  try {
    res = await provider.generate(req);
  } catch (e) {
    if (!opts.fallbackToMock || provider.name === "mock") throw e;
    console.error(`[llm] ${provider.name} failed for task ${req.task}, falling back to mock`, e);
    res = await new MockProvider().generate(req);
  }
  if (req.orgId) {
    const price = TOKEN_PRICE_CENTS_PER_M[res.provider] ?? TOKEN_PRICE_CENTS_PER_M.mock;
    const cost = (res.inputTokens * price.in + res.outputTokens * price.out) / 1_000_000;
    await db.usageRecord.createMany({
      data: [
        { orgId: req.orgId, metric: "LLM_TOKENS", quantity: res.inputTokens + res.outputTokens, costCents: cost, refType: req.task },
        { orgId: req.orgId, metric: "AI_CALLS", quantity: 1, costCents: 0, refType: req.task },
      ],
    });
  }
  return res;
}

/** Parse a JSON object from a model response (tolerates code fences / surrounding prose). */
export function parseJsonLoose<T = unknown>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
