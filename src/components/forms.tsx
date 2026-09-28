"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { buttonClass } from "./ui";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/action-state";

export function SubmitButton({ children, variant = "primary", size = "md", className, pendingText, disabled, name, value }: { children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger" | "subtle"; size?: "sm" | "md" | "lg"; className?: string; pendingText?: string; disabled?: boolean; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending || disabled} className={buttonClass(variant, size, className)}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => setHidden(false), [state]);
  if (!state || hidden || (!state.error && !state.message)) return null;
  const err = Boolean(state.error);
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", err ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800", className)} role={err ? "alert" : "status"}>
      {err ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
      <span className="flex-1">{state.error ?? state.message}</span>
      <button type="button" onClick={() => setHidden(true)} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Form bound to a server action returning ActionState. Shows success/error
 * inline, follows `redirect`, and can reset itself after success.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  messagePosition = "top",
  onSuccess,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode | ((state: ActionState) => ReactNode);
  className?: string;
  resetOnSuccess?: boolean;
  messagePosition?: "top" | "bottom";
  onSuccess?: (s: ActionState) => void;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
      if (state.redirect) router.push(state.redirect);
      else router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {messagePosition === "top" && <FormMessage state={state} className="mb-4" />}
      {typeof children === "function" ? children(state) : children}
      {messagePosition === "bottom" && <FormMessage state={state} className="mt-3" />}
    </form>
  );
}

/** A single-button form for quick actions (e.g. "Retry call"), with optional confirm. */
export function ActionButton({
  action,
  fields = {},
  children,
  variant = "secondary",
  size = "sm",
  confirm,
  className,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  fields?: Record<string, string>;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "subtle";
  size?: "sm" | "md" | "lg";
  confirm?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      if (state.redirect) router.push(state.redirect);
      else router.refresh();
    }
  }, [state, router]);
  return (
    <form
      action={formAction}
      className={cn("inline-flex flex-col items-start gap-1", className)}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton variant={variant} size={size}>
        {children}
      </SubmitButton>
      {state?.error && <span className="max-w-xs text-xs text-rose-600">{state.error}</span>}
      {state?.message && !state.error && <span className="max-w-xs text-xs text-emerald-700">{state.message}</span>}
    </form>
  );
}
