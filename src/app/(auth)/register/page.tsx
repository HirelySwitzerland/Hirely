"use client";

import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Checkbox, Field, Input } from "@/components/ui";
import { register } from "@/app/actions/auth";

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Start your free trial</h1>
      <p className="mt-1.5 text-sm text-slate-500">14 days, all features. No credit card required.</p>
      <ActionForm action={register} className="mt-6 space-y-4">
        {(s) => (
          <>
            <Field label="Full name" error={s?.fieldErrors?.name}>
              <Input name="name" autoComplete="name" required autoFocus />
            </Field>
            <Field label="Work email" error={s?.fieldErrors?.email}>
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Password" hint="At least 10 characters with letters and numbers." error={s?.fieldErrors?.password}>
              <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
            </Field>
            <Checkbox name="terms" label="I accept the terms of service and the data processing agreement (DPA)." required />
            <SubmitButton className="w-full" size="lg" pendingText="Creating account…">Create account</SubmitButton>
          </>
        )}
      </ActionForm>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account? <Link href="/login" className="link">Sign in</Link>
      </p>
    </div>
  );
}
