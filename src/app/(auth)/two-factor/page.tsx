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
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Two-factor authentication</h1>
      <p className="mt-1.5 text-sm text-slate-500">Enter the 6-digit code from your authenticator app, or one of your recovery codes.</p>
      <ActionForm action={verifyTwoFactor} className="mt-6 space-y-4">
        <Field label="Authentication code">
          <Input name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus className="text-center font-mono text-lg tracking-[0.4em]" />
        </Field>
        <SubmitButton className="w-full" size="lg">Verify</SubmitButton>
      </ActionForm>
      <form action={logout} className="mt-6 text-center">
        <button className="link text-sm">Use a different account</button>
      </form>
    </div>
  );
}
