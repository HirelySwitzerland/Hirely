import { db } from "@/lib/db";
import { getContext } from "@/lib/auth/session";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { TwoFactorSetup } from "@/components/settings/two-factor";
import { changePassword, resendVerification, updateProfile } from "@/app/actions/auth";
import { ago } from "@/lib/utils";

export const metadata = { title: "Profil & Sicherheit" };

export default async function ProfilePage() {
  const ctx = await getContext();
  const sessions = await db.session.findMany({ where: { userId: ctx.user.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, take: 8 });
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Profil" />
        <ActionForm action={updateProfile} className="grid gap-4 p-5 md:grid-cols-3">
          <Field label="Name"><Input name="name" defaultValue={ctx.user.name} required /></Field>
          <Field label="Funktion"><Input name="title" defaultValue={ctx.user.title ?? ""} /></Field>
          <Field label="Sprache"><Select name="locale" defaultValue={ctx.user.locale}><option value="de">Deutsch</option><option value="en">English</option><option value="fr">Français</option><option value="it">Italiano</option></Select></Field>
          <div className="md:col-span-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">{ctx.user.email} {ctx.user.emailVerifiedAt ? <Badge tone="green">bestätigt</Badge> : <Badge tone="amber">nicht bestätigt</Badge>}</p>
            <SubmitButton>Profil speichern</SubmitButton>
          </div>
        </ActionForm>
        {!ctx.user.emailVerifiedAt && <div className="border-t border-slate-100 p-5"><ActionButton action={resendVerification}>Bestätigungs-E-Mail erneut senden</ActionButton></div>}
      </Card>
      <Card>
        <CardHeader title="Zwei-Faktor-Anmeldung" description="Schützen Sie Ihr Konto mit einem Einmalcode aus einer Authenticator-App (TOTP)." />
        <div className="p-5"><TwoFactorSetup enabled={ctx.user.totpEnabled} /></div>
      </Card>
      <Card>
        <CardHeader title="Passwort" />
        <ActionForm action={changePassword} resetOnSuccess className="grid gap-4 p-5 md:grid-cols-3 md:items-end">
          <Field label="Aktuelles Passwort"><Input name="current" type="password" required autoComplete="current-password" /></Field>
          <Field label="Neues Passwort" hint="Mind. 10 Zeichen, Buchstaben und Zahlen"><Input name="password" type="password" required minLength={10} autoComplete="new-password" /></Field>
          <SubmitButton variant="secondary">Passwort ändern</SubmitButton>
        </ActionForm>
      </Card>
      <Card>
        <CardHeader title="Aktive Sitzungen" />
        <ul className="divide-y divide-slate-100">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-5 py-3 text-[13px]">
              <span className="truncate text-slate-700">{s.userAgent?.slice(0, 80) ?? "Unbekanntes Gerät"} {s.id === ctx.session.id && <Badge tone="brand">dieses Gerät</Badge>}</span>
              <span className="shrink-0 text-xs text-slate-500">{s.ip ?? "—"} · {ago(s.createdAt)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
