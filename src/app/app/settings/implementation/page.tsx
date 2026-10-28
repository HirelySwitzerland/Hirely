import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, CardHeader, Input, Progress } from "@/components/ui";
import { updateImplementationTask } from "@/app/actions/settings";

export const metadata = { title: "Einführung" };

export default async function ImplementationPage() {
  const ctx = await pageContext("settings.manage");
  const tasks = await db.implementationTask.findMany({ where: { orgId: ctx.orgId }, orderBy: { order: "asc" } });
  const done = tasks.filter((t) => t.status === "DONE").length;
  const cats = [...new Set(tasks.map((t) => t.category))];
  const tone = { DONE: "green", IN_PROGRESS: "sky", TODO: "slate", BLOCKED: "red" } as const;
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center justify-between"><div><h2 className="text-[15px] font-semibold text-ink">Einführungsplan</h2><p className="text-[13px] text-slate-500">Geführte Einrichtung von der Firmenkonfiguration bis zum Go-live. Enterprise-Kunden erhalten eine persönliche Projektleitung sowie individuelle Abläufe, Integrationen, Branding, Rechte und KI-Konfiguration.</p></div><span className="text-2xl font-semibold tabular-nums text-ink">{tasks.length ? Math.round((done / tasks.length) * 100) : 0}%</span></div>
        <Progress value={done} max={tasks.length || 1} className="mt-4" tone="green" />
      </Card>
      {cats.map((c) => (
        <Card key={c}>
          <CardHeader title={c} />
          <ul className="divide-y divide-slate-100">
            {tasks.filter((t) => t.category === c).map((t) => (
              <li key={t.id}>
                <ActionForm action={updateImplementationTask} className="grid items-center gap-3 px-5 py-3 md:grid-cols-12">
                  <input type="hidden" name="id" value={t.id} />
                  <span className="text-sm font-medium text-ink md:col-span-4">{t.title}</span>
                  <span className="md:col-span-2"><Badge tone={tone[t.status as keyof typeof tone]}>{({ DONE: "erledigt", IN_PROGRESS: "in Arbeit", TODO: "offen", BLOCKED: "blockiert" } as Record<string, string>)[t.status] ?? t.status}</Badge></span>
                  <Input name="owner" defaultValue={t.owner ?? ""} placeholder="Verantwortlich" className="h-8 py-1 text-[13px] md:col-span-3" />
                  <select name="status" defaultValue={t.status} className="input h-8 py-1 text-[13px] md:col-span-2"><option value="TODO">Offen</option><option value="IN_PROGRESS">In Arbeit</option><option value="DONE">Erledigt</option><option value="BLOCKED">Blockiert</option></select>
                  <SubmitButton size="sm" variant="ghost" className="md:col-span-1">Speichern</SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
