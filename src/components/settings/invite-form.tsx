"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormMessage, SubmitButton } from "@/components/forms";
import { Input, Select } from "@/components/ui";
import { inviteMember } from "@/app/actions/settings";

export function InviteForm({ roles }: { roles: { id: string; label: string }[] }) {
  const [state, action] = useActionState(inviteMember, null);
  const router = useRouter();
  useEffect(() => { if (state?.ok) router.refresh(); }, [state, router]);
  const devLink = (state?.data as { devLink?: string } | undefined)?.devLink;
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      {devLink && <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2 text-xs text-slate-600">Mock email provider — invitation link: <a className="link break-all" href={devLink}>{devLink}</a></p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input name="email" type="email" placeholder="colleague@company.ch" required />
        <Select name="role" defaultValue="RECRUITER" className="sm:w-48">{roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</Select>
        <SubmitButton>Send invitation</SubmitButton>
      </div>
    </form>
  );
}
