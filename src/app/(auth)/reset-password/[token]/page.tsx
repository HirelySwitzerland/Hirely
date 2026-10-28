import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input } from "@/components/ui";
import { resetPassword } from "@/app/actions/auth";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Neues Passwort wählen</h1>
      <ActionForm action={resetPassword} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field label="Neues Passwort" hint="Mindestens 10 Zeichen mit Buchstaben und Zahlen.">
          <Input name="password" type="password" autoComplete="new-password" required minLength={10} autoFocus />
        </Field>
        <SubmitButton className="w-full" size="lg">Passwort speichern</SubmitButton>
      </ActionForm>
    </div>
  );
}
