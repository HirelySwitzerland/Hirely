import Link from "next/link";
import type { EvidenceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { applicationScope } from "@/lib/services/scope";
import type { Evidence } from "@/lib/services/evaluation";
import { Alert, Avatar, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { EVIDENCE_META, InterviewBadge, RequirementsMeter, StageBadge } from "@/components/status";
import { cn } from "@/lib/utils";

export const metadata = { title: "Vergleich" };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const ctx = await pageContext("candidates.view");
  const ids = ((await searchParams).ids ?? "").split(",").filter(Boolean).slice(0, 5);
  const apps = await db.application.findMany({
    where: { ...applicationScope(ctx), id: { in: ids } },
    include: { candidate: true, job: true, evaluations: { include: { requirement: true } }, interviews: { where: { status: "COMPLETED" }, include: { segments: true } } },
  });
  if (apps.length < 2) {
    return (
      <div>
        <PageHeader title="Kandidierende vergleichen" />
        <Card><EmptyState title="Mindestens zwei Personen auswählen" description="Haken Sie in der Liste die Personen an und klicken Sie auf „Vergleichen“." action={<LinkButton href="/app/candidates" size="sm">Zu den Kandidierenden</LinkButton>} /></Card>
      </div>
    );
  }
  const jobs = new Set(apps.map((a) => a.jobId));
  const reqs = [...new Map(apps.flatMap((a) => a.evaluations.map((e) => [e.requirementId, e.requirement] as const))).values()].sort((a, b) => (a.kind === b.kind ? a.order - b.order : a.kind === "MUST" ? -1 : 1));
  const keyAnswer = (a: (typeof apps)[number], cat: string) => {
    const st = a.interviews[0]?.state as { answers?: Record<string, { category: string; answer: string }> } | undefined;
    return Object.values(st?.answers ?? {}).find((x) => x.category === cat)?.answer;
  };
  const rows: { label: string; render: (a: (typeof apps)[number]) => React.ReactNode }[] = [
    { label: "Stufe", render: (a) => <StageBadge stage={a.stage} /> },
    { label: "Erfahrung", render: (a) => <span>{a.candidate.yearsExperience != null ? `≈ ${a.candidate.yearsExperience} Jahre` : "—"}<span className="block text-[11px] text-slate-400">{a.candidate.currentTitle}</span></span> },
    { label: "Anforderungen", render: (a) => <RequirementsMeter met={a.requirementsMet} total={a.requirementsTotal} mustMet={a.mustHaveMet} mustTotal={a.mustHaveTotal} /> },
    { label: "KI-Interview", render: (a) => <InterviewBadge status={a.interviewStatus} /> },
    { label: "Verfügbar ab", render: (a) => a.availability ?? <span className="text-slate-400">Unbekannt</span> },
    { label: "Kündigungsfrist", render: (a) => a.noticePeriod ?? <span className="text-slate-400">Unbekannt</span> },
    { label: "Lohnvorstellung", render: (a) => a.salaryExpectation ?? <span className="text-slate-400">Unbekannt</span> },
    { label: "Motivation (eigene Worte)", render: (a) => <span className="text-[13px] text-slate-600">{keyAnswer(a, "motivation") ? `“${keyAnswer(a, "motivation")!.slice(0, 180)}”` : "—"}</span> },
  ];
  return (
    <div>
      <PageHeader breadcrumb={<Link href="/app/candidates" className="hover:text-ink">Kandidierende</Link>} title="Kandidierende vergleichen" description="Nebeneinander, nur nach festgelegten, stellenbezogenen Kriterien. Es gibt keine Persönlichkeits- oder Gesamtpunktzahl." />
      {jobs.size > 1 && <Alert tone="warning" className="mb-4">Sie vergleichen Personen aus verschiedenen Stellen – die Anforderungen unterscheiden sich.</Alert>}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr>
              <th className="w-56 border-b border-slate-100 bg-slate-50/60 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Kandidat/in</th>
              {apps.map((a) => (
                <th key={a.id} className="border-b border-l border-slate-100 px-4 py-3 text-left align-top">
                  <Link href={`/app/candidates/${a.id}`} className="flex items-center gap-2.5">
                    <Avatar name={`${a.candidate.firstName} ${a.candidate.lastName}`} size={34} />
                    <span><span className="block font-semibold text-ink">{a.candidate.firstName} {a.candidate.lastName}</span><span className="block text-xs font-normal text-slate-500">{a.job.title}</span></span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="border-b border-slate-100 bg-slate-50/40 px-4 py-3 text-[13px] font-medium text-slate-600">{r.label}</td>
                {apps.map((a) => <td key={a.id} className="border-b border-l border-slate-100 px-4 py-3 align-top">{r.render(a)}</td>)}
              </tr>
            ))}
            <tr><td colSpan={apps.length + 1} className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Anforderungen & Belege</td></tr>
            {reqs.map((req) => (
              <tr key={req.id}>
                <td className="border-b border-slate-100 bg-slate-50/40 px-4 py-3 text-[13px]"><span className="font-medium text-ink">{req.label}</span><span className="block text-[11px] uppercase text-slate-400">{req.kind === "MUST" ? "Muss" : "Wünschenswert"}</span></td>
                {apps.map((a) => {
                  const e = a.evaluations.find((x) => x.requirementId === req.id);
                  if (!e) return <td key={a.id} className="border-b border-l border-slate-100 px-4 py-3 text-xs text-slate-400">gilt nicht für diese Stelle</td>;
                  const m = EVIDENCE_META[e.status as EvidenceStatus];
                  const Icon = m.icon;
                  const ev = ((e.evidence ?? []) as Evidence[])[0];
                  return (
                    <td key={a.id} className="border-b border-l border-slate-100 px-4 py-3 align-top">
                      <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium", m.cls)}><Icon className="h-4 w-4" />{m.label}</span>
                      {ev && <p className="mt-1 line-clamp-2 text-xs text-slate-500">“{ev.quote}”</p>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
