import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input } from "@/components/ui";
import { resetPassword } from "@/app/actions/auth";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Choose a new password</h1>
      <ActionForm action={resetPassword} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field label="New password" hint="At least 10 characters with letters and numbers.">
          <Input name="password" type="password" autoComplete="new-password" required minLength={10} autoFocus />
        </Field>
        <SubmitButton className="w-full" size="lg">Update password</SubmitButton>
      </ActionForm>
    </div>
  );
}
