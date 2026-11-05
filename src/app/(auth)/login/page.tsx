import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Alert, Field, Input } from "@/components/ui";
import { login } from "@/app/actions/auth";
import { getSession } from "@/lib/auth/session";
import { PUBLIC_DEMO, SITE_ONLY } from "@/lib/site";

export const metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  if (s && (!s.user.totpEnabled || s.twoFactorVerified)) redirect("/app");
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Willkommen zurück</h1>
      <p className="mt-1.5 text-sm text-slate-500">Melden Sie sich bei Recruit24 an.</p>
      {sp.reset && <Alert tone="success" className="mt-5">Passwort geändert. Bitte melden Sie sich an.</Alert>}
      {PUBLIC_DEMO && (
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50/70 p-4">
          <p className="text-sm font-semibold text-ink">Recruit24 ausprobieren</p>
          <p className="mt-1 text-sm text-slate-600">Mit der Demo-Firma «Helvetic Engineering AG» und erfundenen Daten. Benutzername <b>Demo</b>, Passwort <b>demo</b>.</p>
          <ActionForm action={login} className="mt-3">
            <input type="hidden" name="email" value="demo" />
            <input type="hidden" name="password" value="demo" />
            <input type="hidden" name="next" value={sp.next ?? ""} />
            <SubmitButton className="w-full" size="lg" pendingText="Demo wird geöffnet…">Demo öffnen</SubmitButton>
          </ActionForm>
          <p className="mt-2 text-xs text-slate-500">Die Demo wird jede Nacht zurückgesetzt.</p>
        </div>
      )}
      <ActionForm action={login} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <Field label="E-Mail oder Benutzername">
          <Input name="email" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus={!PUBLIC_DEMO} defaultValue="" />
        </Field>
        <Field label={<span className="flex justify-between">Passwort {!PUBLIC_DEMO && <Link href="/forgot-password" className="link text-xs">Passwort vergessen?</Link>}</span>}>
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton className="w-full" size="lg" pendingText="Anmeldung…">Anmelden</SubmitButton>
      </ActionForm>
      {SITE_ONLY ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          Recruit24 für Ihre Firma? <Link href="/demo" className="link">Demo vereinbaren</Link>
        </p>
      ) : (
        <>
          <p className="mt-6 text-center text-sm text-slate-500">
            Neu bei Recruit24? <Link href="/register" className="link">Konto erstellen</Link>
          </p>
          <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-medium text-ink">Demo-Zugang</p>
            <p className="mt-1">Kurz: <b>Demo</b> / <b>demo</b> – oder demo@recruit24.ch · Recruit24-Demo-2026 (Inhaber/in). Weitere Rollen: laura.frei@, daniel.huber@, thomas.brunner@, martin.roth@helvetic-engineering.ch</p>
          </div>
        </>
      )}
    </div>
  );
}
