import { ZodError } from "zod";

export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  redirect?: string;
  data?: unknown;
} | null;

export function fail(error: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, error, fieldErrors };
}

export function ok(message?: string, extra: Partial<NonNullable<ActionState>> = {}): ActionState {
  return { ok: true, message, ...extra };
}

/** Converts thrown errors (validation, permission, domain) into a user-facing ActionState. Never swallows silently. */
export function toActionError(e: unknown): ActionState {
  if (e instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const i of e.issues) fieldErrors[i.path.join(".")] = i.message;
    return { ok: false, error: e.issues[0]?.message ?? "Invalid input.", fieldErrors };
  }
  // Next.js redirects/notFound must propagate.
  if (e && typeof e === "object" && "digest" in e && String((e as { digest: string }).digest).startsWith("NEXT_")) throw e;
  console.error("[action]", e);
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong. Please try again." };
}

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
