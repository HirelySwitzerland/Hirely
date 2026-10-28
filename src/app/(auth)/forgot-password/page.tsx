"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { Field, Input } from "@/components/ui";
import { forgotPassword } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(forgotPassword, null);
  const devLink = (state?.data as { devLink?: string } | undefined)?.devLink;
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Passwort zurücksetzen</h1>
      <p className="mt-1.5 text-sm text-slate-500">Wir senden Ihnen einen sicheren Link, um ein neues Passwort festzulegen.</p>
      <form action={action} className="mt-6 space-y-4">
        <FormMessage state={state} />
        {devLink && (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
            Test-Modus (keine echte E-Mail): <a className="link break-all" href={devLink}>Link öffnen</a>
          </p>
        )}
        <Field label="E-Mail">
          <Input name="email" type="email" required autoFocus />
        </Field>
        <SubmitButton className="w-full" size="lg">Link senden</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="link">Zurück zur Anmeldung</Link>
      </p>
    </div>
  );
}
