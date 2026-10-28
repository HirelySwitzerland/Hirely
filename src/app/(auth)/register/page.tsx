"use client";

import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Checkbox, Field, Input } from "@/components/ui";
import { register } from "@/app/actions/auth";

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Kostenlos testen</h1>
      <p className="mt-1.5 text-sm text-slate-500">14 Tage, alle Funktionen. Keine Kreditkarte nötig.</p>
      <ActionForm action={register} className="mt-6 space-y-4">
        {(s) => (
          <>
            <Field label="Vor- und Nachname" error={s?.fieldErrors?.name}>
              <Input name="name" autoComplete="name" required autoFocus />
            </Field>
            <Field label="Geschäftliche E-Mail" error={s?.fieldErrors?.email}>
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Passwort" hint="Mindestens 10 Zeichen mit Buchstaben und Zahlen." error={s?.fieldErrors?.password}>
              <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
            </Field>
            <Checkbox name="terms" label="Ich akzeptiere die AGB und den Auftragsverarbeitungsvertrag (AVV)." required />
            <SubmitButton className="w-full" size="lg" pendingText="Konto wird erstellt…">Konto erstellen</SubmitButton>
          </>
        )}
      </ActionForm>
      <p className="mt-6 text-center text-sm text-slate-500">
        Schon ein Konto? <Link href="/login" className="link">Anmelden</Link>
      </p>
    </div>
  );
}
