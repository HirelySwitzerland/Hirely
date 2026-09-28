import { db } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Alert, Field, Input, LinkButton } from "@/components/ui";
import { acceptInvite } from "@/app/actions/auth";
import { getSession } from "@/lib/auth/session";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await db.invitation.findUnique({ where: { tokenHash: sha256(token) }, include: { org: true } });
  if (!inv || inv.acceptedAt || inv.revokedAt || inv.expiresAt < new Date())
    return (
      <div>
        <h1 className="text-2xl font-semibold text-ink">Invitation not valid</h1>
        <p className="mt-2 text-sm text-slate-500">This invitation has expired or was already used. Ask your administrator to send a new one.</p>
        <LinkButton href="/login" className="mt-6">Go to sign in</LinkButton>
      </div>
    );
  const existing = await db.user.findUnique({ where: { email: inv.email } });
  const session = await getSession();
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Join {inv.org.name}</h1>
      <p className="mt-1.5 text-sm text-slate-500">You were invited as <strong>{ROLE_LABELS[inv.role]}</strong> ({inv.email}).</p>
      <ActionForm action={acceptInvite} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        {existing ? (
          session?.userId === existing.id ? (
            <p className="text-sm text-slate-600">Signed in as {existing.email}.</p>
          ) : (
            <Alert tone="info">You already have an account. <a className="link" href={`/login?next=/invite/${token}`}>Sign in</a> first, then accept.</Alert>
          )
        ) : (
          <>
            <Field label="Your name"><Input name="name" required autoFocus /></Field>
            <Field label="Password" hint="At least 10 characters with letters and numbers."><Input name="password" type="password" required minLength={10} /></Field>
          </>
        )}
        <SubmitButton className="w-full" size="lg">Accept invitation</SubmitButton>
      </ActionForm>
    </div>
  );
}
