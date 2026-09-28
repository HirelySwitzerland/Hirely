import { Check, Minus } from "lucide-react";
import { getContext } from "@/lib/auth/session";
import { can, PERMISSIONS, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/rbac";
import { Card, CardHeader } from "@/components/ui";

export const metadata = { title: "Roles & permissions" };
const ROLES = ["OWNER", "ADMIN", "RECRUITER", "HIRING_MANAGER", "VIEWER"] as const;

export default async function RolesPage() {
  await getContext();
  return (
    <Card>
      <CardHeader title="Roles & permissions" description="Role-based access control is enforced on every page, action and API call. Hiring managers additionally only see candidates for jobs assigned to them. Custom roles are available on Enterprise." />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Permission</th>
              {ROLES.map((r) => <th key={r} className="px-3 py-3 text-center text-xs font-semibold text-ink" title={ROLE_DESCRIPTIONS[r]}>{ROLE_LABELS[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p} className="border-b border-slate-100">
                <td className="px-4 py-2 font-mono text-[12px] text-slate-700">{p}</td>
                {ROLES.map((r) => <td key={r} className="px-3 py-2 text-center">{can(r, p) ? <Check className="mx-auto h-4 w-4 text-emerald-600" /> : <Minus className="mx-auto h-4 w-4 text-slate-300" />}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
