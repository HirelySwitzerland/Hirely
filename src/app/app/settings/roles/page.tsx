import { Check, Minus } from "lucide-react";
import { getContext } from "@/lib/auth/session";
import { can, PERMISSIONS, PERMISSION_LABELS, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/rbac";
import { Card, CardHeader } from "@/components/ui";

export const metadata = { title: "Rollen & Rechte" };
const ROLES = ["OWNER", "ADMIN", "RECRUITER", "HIRING_MANAGER", "VIEWER"] as const;

export default async function RolesPage() {
  await getContext();
  return (
    <Card>
      <CardHeader title="Rollen & Rechte" description="Die Rechte gelten für jede Seite, Aktion und API-Anfrage. Linienvorgesetzte sehen zusätzlich nur Kandidierende ihrer eigenen Stellen. Eigene Rollen gibt es im Enterprise-Plan." />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Recht</th>
              {ROLES.map((r) => <th key={r} className="px-3 py-3 text-center text-xs font-semibold text-ink" title={ROLE_DESCRIPTIONS[r]}>{ROLE_LABELS[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p} className="border-b border-slate-100">
                <td className="px-4 py-2.5 text-[13px] text-slate-700">{PERMISSION_LABELS[p]}</td>
                {ROLES.map((r) => <td key={r} className="px-3 py-2 text-center">{can(r, p) ? <Check className="mx-auto h-4 w-4 text-emerald-600" /> : <Minus className="mx-auto h-4 w-4 text-slate-300" />}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
