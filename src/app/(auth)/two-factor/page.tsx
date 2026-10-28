import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input } from "@/components/ui";
import { verifyTwoFactor, logout } from "@/app/actions/auth";
import { getSession } from "@/lib/auth/session";

export default async function TwoFactorPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.user.totpEnabled || s.twoFactorVerified) redirect("/app");
  return (
    <div>
      <ShieldCheck className="h-9 w-9 text-brand-600" />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Zwei-Faktor-Anmeldung</h1>
      <p className="mt-1.5 text-sm text-slate-500">Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App oder einen Wiederherstellungscode ein.</p>
      <ActionForm action={verifyTwoFactor} className="mt-6 space-y-4">
        <Field label="Code">
          <Input name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus className="text-center font-mono text-lg tracking-[0.4em]" />
        </Field>
        <SubmitButton className="w-full" size="lg">Bestätigen</SubmitButton>
      </ActionForm>
      <form action={logout} className="mt-6 text-center">
        <button className="link text-sm">Anderes Konto verwenden</button>
      </form>
    </div>
  );
}
