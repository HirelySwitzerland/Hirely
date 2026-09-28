import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Alert, Field, Input } from "@/components/ui";
import { login } from "@/app/actions/auth";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  if (s && (!s.user.totpEnabled || s.twoFactorVerified)) redirect("/app");
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-1.5 text-sm text-slate-500">Sign in to your Hirely workspace.</p>
      {sp.reset && <Alert tone="success" className="mt-5">Password updated. Please sign in.</Alert>}
      <ActionForm action={login} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required autoFocus defaultValue="" />
        </Field>
        <Field label={<span className="flex justify-between">Password <Link href="/forgot-password" className="link text-xs">Forgot password?</Link></span>}>
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton className="w-full" size="lg" pendingText="Signing in…">Sign in</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-slate-500">
        New to Hirely? <Link href="/register" className="link">Create an account</Link>
      </p>
      <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
        <p className="font-medium text-ink">Demo workspace</p>
        <p className="mt-1">demo@hirely.app · Hirely-Demo-2026 (Owner). Other roles: laura.frei@, daniel.huber@, thomas.brunner@, martin.roth@helvetic-engineering.ch</p>
      </div>
    </div>
  );
}
