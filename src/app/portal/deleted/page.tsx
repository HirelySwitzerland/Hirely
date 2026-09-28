import { CheckCircle2 } from "lucide-react";

export default function Deleted() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
        <h1 className="mt-4 text-xl font-semibold text-ink">Your data has been deleted</h1>
        <p className="mt-2 text-sm text-slate-500">Ihre Daten wurden gelöscht. Vielen Dank für Ihr Interesse.</p>
      </div>
    </div>
  );
}
