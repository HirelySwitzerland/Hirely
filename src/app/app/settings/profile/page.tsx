import { db } from "@/lib/db";
import { getContext } from "@/lib/auth/session";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { TwoFactorSetup } from "@/components/settings/two-factor";
import { changePassword, resendVerification, updateProfile } from "@/app/actions/auth";
import { ago } from "@/lib/utils";

export const metadata = { title: "Profile & security" };

export default async function ProfilePage() {
  const ctx = await getContext();
  const sessions = await db.session.findMany({ where: { userId: ctx.user.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, take: 8 });
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Profile" />
        <ActionForm action={updateProfile} className="grid gap-4 p-5 md:grid-cols-3">
          <Field label="Name"><Input name="name" defaultValue={ctx.user.name} required /></Field>
          <Field label="Job title"><Input name="title" defaultValue={ctx.user.title ?? ""} /></Field>
          <Field label="Interface language"><Select name="locale" defaultValue={ctx.user.locale}><option value="en">English</option><option value="de">Deutsch</option><option value="fr">Français</option><option value="it">Italiano</option></Select></Field>
          <div className="md:col-span-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">{ctx.user.email} {ctx.user.emailVerifiedAt ? <Badge tone="green">verified</Badge> : <Badge tone="amber">not verified</Badge>}</p>
            <SubmitButton>Save profile</SubmitButton>
          </div>
        </ActionForm>
        {!ctx.user.emailVerifiedAt && <div className="border-t border-slate-100 p-5"><ActionButton action={resendVerification}>Resend verification email</ActionButton></div>}
      </Card>
      <Card>
        <CardHeader title="Two-factor authentication" description="Protect your account with a time-based one-time password (TOTP)." />
        <div className="p-5"><TwoFactorSetup enabled={ctx.user.totpEnabled} /></div>
      </Card>
      <Card>
        <CardHeader title="Password" />
        <ActionForm action={changePassword} resetOnSuccess className="grid gap-4 p-5 md:grid-cols-3 md:items-end">
          <Field label="Current password"><Input name="current" type="password" required autoComplete="current-password" /></Field>
          <Field label="New password" hint="Min. 10 characters, letters and numbers"><Input name="password" type="password" required minLength={10} autoComplete="new-password" /></Field>
          <SubmitButton variant="secondary">Change password</SubmitButton>
        </ActionForm>
      </Card>
      <Card>
        <CardHeader title="Active sessions" />
        <ul className="divide-y divide-slate-100">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-5 py-3 text-[13px]">
              <span className="truncate text-slate-700">{s.userAgent?.slice(0, 80) ?? "Unknown device"} {s.id === ctx.session.id && <Badge tone="brand">this device</Badge>}</span>
              <span className="shrink-0 text-xs text-slate-500">{s.ip ?? "—"} · {ago(s.createdAt)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
