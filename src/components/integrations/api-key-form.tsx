"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { Checkbox, Input } from "@/components/ui";
import { createApiKey } from "@/app/actions/integrations";

export function ApiKeyForm() {
  const [state, action] = useActionState(createApiKey, null);
  const router = useRouter();
  useEffect(() => { if (state?.ok) router.refresh(); }, [state, router]);
  const secret = (state?.data as { secret?: string } | undefined)?.secret;
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      {secret && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <code className="flex-1 break-all font-mono text-xs text-emerald-900">{secret}</code>
          <button type="button" onClick={() => navigator.clipboard.writeText(secret)} className="rounded p-1.5 text-emerald-700 hover:bg-emerald-100" aria-label="Copy"><Copy className="h-4 w-4" /></button>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <Input name="name" placeholder="Key name, e.g. Job board connector" className="max-w-xs" required />
        <Checkbox name="applications:write" defaultChecked label="applications:write" />
        <Checkbox name="jobs:read" defaultChecked label="jobs:read" />
        <SubmitButton variant="secondary">Create key</SubmitButton>
      </div>
    </form>
  );
}
