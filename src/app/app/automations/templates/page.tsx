import Link from "next/link";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { DEFAULT_TEMPLATES, TEMPLATE_KEYS, renderTemplate } from "@/lib/services/communication";
import { Badge, Card, CardHeader, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { AutomationTabs } from "@/components/automations/tabs";
import { resetTemplate, saveTemplate } from "@/app/actions/automations";
import { cn } from "@/lib/utils";

export const metadata = { title: "Message templates" };

const SAMPLE = { candidateName: "Lara Muster", candidateFirstName: "Lara", jobTitle: "Servicetechniker/in", recruiterName: "Laura Frei", portalLink: "https://app.hirely.ch/portal/…", interviewLink: "https://app.hirely.ch/interview/…", schedulingLink: "https://app.hirely.ch/schedule/…", videoLink: "https://app.hirely.ch/video/…", interviewDate: "Donnerstag, 2. Oktober 2026 um 10:00", location: "Industriestrasse 12, 8404 Winterthur" };

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ key?: string; channel?: string; lang?: string }> }) {
  const sp = await searchParams;
  const ctx = await pageContext("templates.manage");
  const key = TEMPLATE_KEYS[sp.key ?? ""] ? sp.key! : "ai_interview_invitation";
  const channel = (["EMAIL", "SMS", "WHATSAPP"].includes(sp.channel ?? "") ? sp.channel : "EMAIL") as "EMAIL" | "SMS" | "WHATSAPP";
  const lang = (["de", "en", "fr", "it"].includes(sp.lang ?? "") ? sp.lang : ctx.org.language) as "de";
  const custom = await db.messageTemplate.findMany({ where: { orgId: ctx.orgId } });
  const current = custom.find((c) => c.key === key && c.channel === channel && c.language === lang);
  const def = DEFAULT_TEMPLATES[key]?.[lang];
  const fallback = channel === "EMAIL" ? def?.EMAIL : def?.SMS;
  const subject = current?.subject ?? fallback?.subject ?? "";
  const body = current?.body ?? fallback?.body ?? "";
  const vars = { ...SAMPLE, companyName: ctx.org.name };
  const q = (p: Record<string, string>) => `/app/automations/templates?${new URLSearchParams({ key, channel, lang, ...p })}`;
  return (
    <div>
      <PageHeader title="Automations" description="Every message Hirely sends is editable — per template, channel and language." />
      <AutomationTabs active="templates" />
      <div className="grid gap-5 lg:grid-cols-4">
        <Card className="h-fit p-2">
          {Object.entries(TEMPLATE_KEYS).map(([k, label]) => (
            <Link key={k} href={q({ key: k })} className={cn("flex items-center justify-between rounded-lg px-3 py-2 text-sm", k === key ? "bg-brand-50 font-medium text-brand-800" : "text-slate-700 hover:bg-slate-50")}>
              {label}
              {custom.some((c) => c.key === k) && <Badge tone="brand" className="py-0 text-[10px]">custom</Badge>}
            </Link>
          ))}
        </Card>
        <div className="space-y-5 lg:col-span-3">
          <div className="flex flex-wrap gap-2">
            {(["EMAIL", "SMS", "WHATSAPP"] as const).map((c) => <Link key={c} href={q({ channel: c })} className={cn("rounded-full border px-3 py-1 text-[13px] font-medium", c === channel ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600")}>{c === "EMAIL" ? "Email" : c === "SMS" ? "SMS" : "WhatsApp"}</Link>)}
            <span className="mx-2 w-px bg-slate-200" />
            {(["de", "fr", "it", "en"] as const).map((l) => <Link key={l} href={q({ lang: l })} className={cn("rounded-full border px-3 py-1 text-[13px] font-medium uppercase", l === lang ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600")}>{l}</Link>)}
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader title={TEMPLATE_KEYS[key]} description={current ? "Customized for your organization" : fallback ? "Hirely default — edit to customize" : "No default for this channel/language yet"} />
              <ActionForm action={saveTemplate} className="space-y-4 p-5" key={`${key}-${channel}-${lang}`}>
                <input type="hidden" name="key" value={key} />
                <input type="hidden" name="channel" value={channel} />
                <input type="hidden" name="language" value={lang} />
                {channel === "EMAIL" && <Field label="Subject"><Input name="subject" defaultValue={subject} /></Field>}
                <Field label="Message" hint="Variables: {{candidateName}} {{candidateFirstName}} {{jobTitle}} {{companyName}} {{recruiterName}} {{portalLink}} {{interviewLink}} {{schedulingLink}} {{videoLink}} {{interviewDate}} {{location}}">
                  <Textarea name="body" rows={channel === "EMAIL" ? 14 : 5} defaultValue={body} className="font-mono text-[13px]" />
                </Field>
                <div className="flex gap-2">
                  <SubmitButton>Save template</SubmitButton>
                </div>
              </ActionForm>
              {current && <div className="border-t border-slate-100 p-4"><ActionButton action={resetTemplate} fields={{ key, channel, language: lang }} variant="ghost">Reset to default</ActionButton></div>}
            </Card>
            <Card>
              <CardHeader title="Preview" description="With sample data" />
              <div className="p-5">
                {channel === "EMAIL" ? (
                  <div className="rounded-lg border border-slate-200">
                    <div className="border-b border-slate-100 px-4 py-2.5 text-sm"><span className="text-slate-500">Subject:</span> <span className="font-medium text-ink">{renderTemplate(subject, vars)}</span></div>
                    <pre className="whitespace-pre-wrap px-4 py-3 font-sans text-[13.5px] leading-relaxed text-slate-700">{renderTemplate(body, vars)}</pre>
                  </div>
                ) : (
                  <div className="mx-auto max-w-xs rounded-2xl bg-slate-100 p-4">
                    <p className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[13.5px] text-ink shadow-card">{renderTemplate(body, vars) || "—"}</p>
                    <p className="mt-2 text-right text-[11px] text-slate-500">{renderTemplate(body, vars).length} chars · {Math.max(1, Math.ceil(renderTemplate(body, vars).length / 160))} segment(s)</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
