"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { Button, Input } from "@/components/ui";
import { confirmTotpSetup, disableTotp, startTotpSetup } from "@/app/actions/auth";
import type { ActionState } from "@/lib/action-state";

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [startState, setStartState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  const [confirmState, confirmAction] = useActionState(confirmTotpSetup, null);
  const [disableState, disableAction] = useActionState(disableTotp, null);
  const router = useRouter();
  const codes = (confirmState?.data as { recoveryCodes?: string[] } | undefined)?.recoveryCodes;

  if (codes)
    return (
      <div className="space-y-3">
        <FormMessage state={confirmState} />
        <p className="text-sm text-slate-700">Bewahren Sie diese Wiederherstellungscodes sicher auf. Jeder Code funktioniert einmal, falls Sie Ihr Gerät verlieren.</p>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-4 font-mono text-sm sm:grid-cols-4">{codes.map((c) => <span key={c}>{c}</span>)}</div>
        <Button variant="secondary" onClick={() => router.refresh()}>Fertig</Button>
      </div>
    );
  if (enabled)
    return (
      <form action={disableAction} className="space-y-3">
        <p className="flex items-center gap-2 text-sm text-emerald-700"><ShieldCheck className="h-4 w-4" />Zwei-Faktor-Anmeldung ist aktiv.</p>
        <FormMessage state={disableState} />
        <div className="flex max-w-md gap-2"><Input name="password" type="password" placeholder="Mit Passwort bestätigen" required /><SubmitButton variant="secondary">Ausschalten</SubmitButton></div>
      </form>
    );
  return (
    <div className="space-y-4">
      <FormMessage state={startState?.ok ? null : startState} />
      {!setup ? (
        <Button variant="secondary" disabled={pending} onClick={() => start(async () => { const r = await startTotpSetup(); setStartState(r); if (r?.data) setSetup(r.data as { qr: string; secret: string }); })}>Authenticator-App einrichten</Button>
      ) : (
        <form action={confirmAction} className="flex flex-col gap-4 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="QR-Code für die Authenticator-App" className="h-40 w-40 rounded-lg ring-1 ring-slate-200" />
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Mit Google Authenticator, 1Password oder Microsoft Authenticator scannen oder den Schlüssel von Hand eingeben:</p>
            <code className="block break-all rounded bg-slate-50 px-2 py-1 text-xs">{setup.secret}</code>
            <FormMessage state={confirmState} />
            <div className="flex gap-2"><Input name="code" inputMode="numeric" placeholder="6-stelliger Code" required className="w-40 font-mono tracking-widest" /><SubmitButton>Prüfen & aktivieren</SubmitButton></div>
          </div>
        </form>
      )}
    </div>
  );
}
