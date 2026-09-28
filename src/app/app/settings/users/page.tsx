import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { assignableRoles, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/rbac";
import { planById } from "@/lib/billing";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui";
import { InviteForm } from "@/components/settings/invite-form";
import { changeMemberRole, removeMember, revokeInvitation } from "@/app/actions/settings";
import { ago } from "@/lib/utils";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const ctx = await pageContext("users.manage");
  const [members, invites, sub] = await Promise.all([
    db.membership.findMany({ where: { orgId: ctx.orgId }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    db.invitation.findMany({ where: { orgId: ctx.orgId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
    db.subscription.findUnique({ where: { orgId: ctx.orgId } }),
  ]);
  const roles = assignableRoles(ctx.role);
  const seats = planById(sub?.plan ?? "GROWTH").seats;
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Invite team members" description={seats ? `${members.length + invites.length} of ${seats} seats used on your plan.` : "Unlimited seats."} />
        <div className="p-5"><InviteForm roles={roles.map((r) => ({ id: r, label: ROLE_LABELS[r] }))} /></div>
      </Card>
      <Card>
        <CardHeader title={`Members (${members.length})`} />
        <ul className="divide-y divide-slate-100">
          {members.map((m) => (
            <li key={m.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3">
                <Avatar name={m.user.name} size={34} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{m.user.name} {m.userId === ctx.user.id && <span className="text-xs text-slate-400">(you)</span>}</p>
                  <p className="text-xs text-slate-500">{m.user.email} · {m.user.totpEnabled ? "2FA on" : "2FA off"} · last login {ago(m.user.lastLoginAt)}</p>
                </div>
              </div>
              {m.userId !== ctx.user.id && (roles.includes(m.role) || ctx.role === "OWNER") ? (
                <div className="flex items-center gap-2">
                  <ActionForm action={changeMemberRole} className="flex gap-2">
                    <input type="hidden" name="membershipId" value={m.id} />
                    <select name="role" defaultValue={m.role} className="input h-8 w-40 py-1 text-[13px]">{roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
                    <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
                  </ActionForm>
                  <ActionButton action={removeMember} fields={{ membershipId: m.id }} variant="ghost" confirm={`Remove ${m.user.name} from ${ctx.org.name}?`}>Remove</ActionButton>
                </div>
              ) : <Badge tone="brand">{ROLE_LABELS[m.role]}</Badge>}
            </li>
          ))}
        </ul>
      </Card>
      {invites.length > 0 && (
        <Card>
          <CardHeader title="Pending invitations" />
          <ul className="divide-y divide-slate-100">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{i.email} <Badge>{ROLE_LABELS[i.role]}</Badge> <span className="text-xs text-slate-500">· expires {ago(i.expiresAt)}</span></span>
                <ActionButton action={revokeInvitation} fields={{ id: i.id }} variant="ghost">Revoke</ActionButton>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card className="p-5 text-[13px] text-slate-600">
        {Object.entries(ROLE_DESCRIPTIONS).map(([r, d]) => <p key={r} className="py-0.5"><strong className="text-ink">{ROLE_LABELS[r as keyof typeof ROLE_LABELS]}:</strong> {d}</p>)}
      </Card>
    </div>
  );
}
