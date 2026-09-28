import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { LinkButton } from "@/components/ui";

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rec = await db.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  const valid = rec && rec.type === "EMAIL_VERIFY" && !rec.usedAt && rec.expiresAt > new Date();
  if (valid) {
    await db.$transaction([
      db.user.update({ where: { id: rec.userId }, data: { emailVerifiedAt: new Date() } }),
      db.verificationToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    ]);
  }
  return (
    <div className="text-center">
      {valid ? <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" /> : <XCircle className="mx-auto h-10 w-10 text-rose-500" />}
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">{valid ? "Email confirmed" : "Link invalid or expired"}</h1>
      <p className="mt-2 text-sm text-slate-500">{valid ? "Thanks — your email address is verified." : "Request a new verification email from your account settings."}</p>
      <LinkButton href="/app" className="mt-6">Continue to Hirely</LinkButton>
    </div>
  );
}
