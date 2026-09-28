import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, CardHeader, Input, Progress } from "@/components/ui";
import { updateImplementationTask } from "@/app/actions/settings";

export const metadata = { title: "Implementation" };

export default async function ImplementationPage() {
  const ctx = await pageContext("settings.manage");
  const tasks = await db.implementationTask.findMany({ where: { orgId: ctx.orgId }, orderBy: { order: "asc" } });
  const done = tasks.filter((t) => t.status === "DONE").length;
  const cats = [...new Set(tasks.map((t) => t.category))];
  const tone = { DONE: "green", IN_PROGRESS: "sky", TODO: "slate", BLOCKED: "red" } as const;
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center justify-between"><div><h2 className="text-[15px] font-semibold text-ink">Implementation plan</h2><p className="text-[13px] text-slate-500">Guided setup from company configuration to go-live. Enterprise customers get a dedicated implementation manager, custom workflows, integrations, branding, permissions and AI configuration.</p></div><span className="text-2xl font-semibold tabular-nums text-ink">{tasks.length ? Math.round((done / tasks.length) * 100) : 0}%</span></div>
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
                  <span className="md:col-span-2"><Badge tone={tone[t.status as keyof typeof tone]}>{t.status.replace("_", " ").toLowerCase()}</Badge></span>
                  <Input name="owner" defaultValue={t.owner ?? ""} placeholder="Owner" className="h-8 py-1 text-[13px] md:col-span-3" />
                  <select name="status" defaultValue={t.status} className="input h-8 py-1 text-[13px] md:col-span-2"><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="DONE">Done</option><option value="BLOCKED">Blocked</option></select>
                  <SubmitButton size="sm" variant="ghost" className="md:col-span-1">Save</SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
