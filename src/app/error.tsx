"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="h-10 w-10 text-amber-500" />
      <h1 className="mt-4 text-xl font-semibold text-ink">Da ist etwas schiefgelaufen</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">{error.message?.startsWith("Sie haben keine Berechtigung") ? error.message : "Die Seite konnte nicht geladen werden. Ihre Daten sind sicher – bitte versuchen Sie es noch einmal. Wenn das Problem bleibt, melden Sie sich mit der Referenz unten beim Support."}</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">Referenz: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>Erneut versuchen</Button>
    </div>
  );
}
