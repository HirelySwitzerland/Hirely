import { CalendarDays, CheckCircle2, Code2, KeyRound, Mail, MessageSquare, Phone, Plug, Sparkles, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { decrypt } from "@/lib/crypto";
import { ATS_ADAPTERS } from "@/lib/providers/ats";
import { getLLM } from "@/lib/providers/llm";
import { getMessageProvider } from "@/lib/providers/messaging";
import { getTranscriber } from "@/lib/providers/transcription";
import { getVoiceProvider } from "@/lib/providers/voice";
import { appUrl } from "@/lib/services/communication";
import { tenantTwilio } from "@/lib/services/interviews";
import { Badge, Card, CardHeader, Field, Input, PageHeader } from "@/components/ui";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { ApiKeyForm } from "@/components/integrations/api-key-form";
import { connectIntegration, disconnectIntegration, revokeApiKey, rotateWebhookSecret, sendTestEmail, syncNow } from "@/app/actions/integrations";
import { ago, cn } from "@/lib/utils";

export const metadata = { title: "Integrations" };

function Status({ status }: { status?: string }) {
  if (status === "CONNECTED") return <Badge tone="green"><CheckCircle2 className="h-3 w-3" />Connected</Badge>;
  if (status === "ERROR") return <Badge tone="red"><XCircle className="h-3 w-3" />Error</Badge>;
  return <Badge tone="slate">Not connected</Badge>;
}

export default async function IntegrationsPage() {
  const ctx = await pageContext("integrations.manage");
  const [integrations, logs, keys] = await Promise.all([
    db.integration.findMany({ where: { orgId: ctx.orgId } }),
    db.syncLog.findMany({ where: { orgId: ctx.orgId }, orderBy: { createdAt: "desc" }, take: 8, include: { integration: true } }),
    db.apiKey.findMany({ where: { orgId: ctx.orgId }, orderBy: { createdAt: "desc" } }),
  ]);
  const find = (kind: string, provider: string) => integrations.find((i) => i.kind === kind && i.provider === provider);
  const llm = getLLM();
  const voice = getVoiceProvider(await tenantTwilio(ctx.orgId));
  const email = getMessageProvider("EMAIL");
  const sms = getMessageProvider("SMS");
  const stt = getTranscriber();
  return (
    <div>
      <PageHeader title="Integrations" description="Hirely sits behind your ATS: job boards (jobs.ch, LinkedIn, Indeed) and your career site feed the ATS — Hirely screens, interviews and writes status back." />

      <Card className="mb-6 overflow-hidden">
        <div className="grid items-center gap-4 bg-slate-50/70 p-5 text-center text-[13px] md:grid-cols-7">
          <div className="space-y-1 md:col-span-2">{["jobs.ch", "LinkedIn", "Indeed", "Career website"].map((s) => <span key={s} className="mx-1 inline-block rounded-md bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200">{s}</span>)}</div>
          <span className="text-slate-400">→</span>
          <span className="rounded-lg bg-white px-3 py-2 font-medium text-ink ring-1 ring-slate-200">Your ATS</span>
          <span className="text-slate-400">⇄ API + webhooks</span>
          <span className="rounded-lg bg-brand-600 px-3 py-2 font-semibold text-white md:col-span-2">Hirely → AI screening → AI interview → Recruiter</span>
        </div>
      </Card>

      <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink"><Plug className="h-4 w-4 text-slate-400" />Applicant tracking systems</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.values(ATS_ADAPTERS).map((a) => {
          const integ = find("ATS", a.id);
          const connected = integ?.status === "CONNECTED" || integ?.status === "ERROR";
          const demo = (integ?.config as { demo?: boolean } | undefined)?.demo;
          return (
            <Card key={a.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{a.label}</p>
                  <p className="text-xs text-slate-500">{a.vendor}</p>
                </div>
                <Status status={integ?.status} />
              </div>
              <p className="mt-2 text-[13px] text-slate-600">{a.description}</p>
              {connected ? (
                <div className="mt-4 space-y-3 text-[13px]">
                  <p className="text-slate-500">{demo ? "Demo mode (sample applications)" : "Live credentials"} · last sync {ago(integ!.lastSyncAt)}</p>
                  {integ!.lastError && <p className="rounded-md bg-rose-50 px-2 py-1.5 text-xs text-rose-700">{integ!.lastError}</p>}
                  <details className="rounded-lg bg-slate-50 p-2.5 text-xs">
                    <summary className="cursor-pointer font-medium text-slate-600">Webhook endpoint</summary>
                    <p className="mt-2 break-all font-mono text-[11px] text-slate-700">{appUrl(`/api/webhooks/ats/${a.id}/${ctx.org.slug}`)}</p>
                    <p className="mt-2 text-slate-500">Signing secret (HMAC-SHA256, header <code>{a.webhookSignatureHeader}</code>):</p>
                    <p className="mt-1 break-all font-mono text-[11px] text-slate-700">{integ!.webhookSecret ? decrypt(integ!.webhookSecret) : "—"}</p>
                    <div className="mt-2"><ActionButton action={rotateWebhookSecret} fields={{ id: integ!.id }} variant="ghost">Rotate secret</ActionButton></div>
                  </details>
                  <div className="flex gap-2">
                    <ActionButton action={syncNow} fields={{ id: integ!.id }}>Sync now</ActionButton>
                    <ActionButton action={disconnectIntegration} fields={{ id: integ!.id }} variant="ghost" confirm={`Disconnect ${a.label}? Credentials will be deleted.`}>Disconnect</ActionButton>
                  </div>
                </div>
              ) : (
                <details className="mt-auto pt-4">
                  <summary className="cursor-pointer list-none"><span className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-[13px] font-medium text-ink hover:bg-slate-50">Connect</span></summary>
                  <ActionForm action={connectIntegration} className="mt-3 space-y-3">
                    <input type="hidden" name="kind" value="ATS" />
                    <input type="hidden" name="provider" value={a.id} />
                    {a.authFields.map((f) => <Field key={f.key} label={f.label}><Input name={f.key} type={f.type === "password" ? "password" : "text"} placeholder={f.placeholder} autoComplete="off" /></Field>)}
                    <p className="text-[11px] text-slate-500">Credentials are encrypted (AES-256-GCM) and never shown again.</p>
                    <div className="flex gap-2">
                      <SubmitButton size="sm" name="mode" value="live">Connect</SubmitButton>
                      <SubmitButton size="sm" variant="ghost" name="mode" value="demo">Use demo mode</SubmitButton>
                    </div>
                  </ActionForm>
                </details>
              )}
            </Card>
          );
        })}
      </div>

      {logs.length > 0 && (
        <Card className="mt-4">
          <CardHeader title="Synchronization log" />
          <ul className="divide-y divide-slate-100">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-5 py-2.5 text-[13px]">
                {l.status === "SUCCESS" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                <span className="font-medium text-ink">{ATS_ADAPTERS[l.integration.provider]?.label ?? l.integration.provider}</span>
                <span className="flex-1 text-slate-600">{l.message}</span>
                <span className="text-xs text-slate-400">{ago(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <h2 className="mb-3 mt-8 text-[15px] font-semibold text-ink">Calendar, communication & voice</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(["google", "microsoft"] as const).map((p) => {
          const integ = find("CALENDAR", p);
          return (
            <Card key={p} className="p-5">
              <div className="flex items-start justify-between"><p className="flex items-center gap-2 font-semibold text-ink"><CalendarDays className="h-4 w-4 text-slate-400" />{p === "google" ? "Google Calendar" : "Microsoft Outlook / 365"}</p><Status status={integ?.status} /></div>
              <p className="mt-2 text-[13px] text-slate-600">Free/busy lookup for scheduling pages, automatic event creation with invitations. OAuth 2.0.</p>
              {integ?.status === "CONNECTED" ? (
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>{(integ.config as { demo?: boolean }).demo ? "Demo mode" : `Connected ${ago(integ.updatedAt)}`}</span>
                  <ActionButton action={disconnectIntegration} fields={{ id: integ.id }} variant="ghost">Disconnect</ActionButton>
                </div>
              ) : (
                <ActionForm action={connectIntegration} className="mt-4 flex gap-2">
                  <input type="hidden" name="kind" value="CALENDAR" />
                  <input type="hidden" name="provider" value={p} />
                  <SubmitButton size="sm" name="mode" value="live">Connect with OAuth</SubmitButton>
                  <SubmitButton size="sm" variant="ghost" name="mode" value="demo">Demo mode</SubmitButton>
                </ActionForm>
              )}
            </Card>
          );
        })}
        <Card className="p-5">
          <div className="flex items-start justify-between"><p className="flex items-center gap-2 font-semibold text-ink"><Mail className="h-4 w-4 text-slate-400" />Email delivery</p><Badge tone={email.name.startsWith("mock") ? "amber" : "green"}>{email.name}</Badge></div>
          <p className="mt-2 text-[13px] text-slate-600">Transactional email via Resend or Postmark (configured per server). Mock mode records messages in the outbox without sending.</p>
          <div className="mt-4"><ActionButton action={sendTestEmail}>Send test email to me</ActionButton></div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between"><p className="flex items-center gap-2 font-semibold text-ink"><MessageSquare className="h-4 w-4 text-slate-400" />SMS & WhatsApp</p><Badge tone={sms.name.startsWith("mock") ? "amber" : "green"}>{sms.name}</Badge></div>
          <p className="mt-2 text-[13px] text-slate-600">Reminders and invitations via Twilio SMS / WhatsApp Business (where legally permitted and the candidate provided a mobile number).</p>
        </Card>
        <Card className="p-5 md:col-span-2 xl:col-span-1">
          <div className="flex items-start justify-between"><p className="flex items-center gap-2 font-semibold text-ink"><Phone className="h-4 w-4 text-slate-400" />AI phone calls (Twilio)</p><Badge tone={voice.name === "twilio" ? "green" : "amber"}>{voice.name === "twilio" ? "Live calls" : "Simulated calls"}</Badge></div>
          <p className="mt-2 text-[13px] text-slate-600">Outbound calls from a Swiss number with speech recognition in German, Swiss German, French, Italian and English. Signed webhooks.</p>
          {find("PHONE", "twilio")?.status === "CONNECTED" ? (
            <div className="mt-3"><ActionButton action={disconnectIntegration} fields={{ id: find("PHONE", "twilio")!.id }} variant="ghost">Disconnect Twilio</ActionButton></div>
          ) : (
            <details className="mt-3">
              <summary className="cursor-pointer list-none"><span className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-[13px] font-medium text-ink hover:bg-slate-50">Connect your Twilio account</span></summary>
              <ActionForm action={connectIntegration} className="mt-3 space-y-2">
                <input type="hidden" name="kind" value="PHONE" /><input type="hidden" name="provider" value="twilio" /><input type="hidden" name="mode" value="live" />
                <Input name="accountSid" placeholder="Account SID (AC…)" autoComplete="off" />
                <Input name="authToken" type="password" placeholder="Auth token" autoComplete="off" />
                <Input name="fromNumber" placeholder="+41 44 555 12 34 (E.164)" />
                <SubmitButton size="sm">Save credentials</SubmitButton>
              </ActionForm>
            </details>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between"><p className="flex items-center gap-2 font-semibold text-ink"><Sparkles className="h-4 w-4 text-slate-400" />AI models</p><Badge tone={llm.name === "mock" ? "amber" : "green"}>{llm.name}</Badge></div>
          <p className="mt-2 text-[13px] text-slate-600">Language model: <strong>{llm.model}</strong> · Speech-to-text: <strong>{stt.name}</strong>. Providers are exchangeable via the AI abstraction layer; candidate data is never used for model training.</p>
        </Card>
      </div>

      <h2 id="api" className="mb-3 mt-8 flex items-center gap-2 text-[15px] font-semibold text-ink"><Code2 className="h-4 w-4 text-slate-400" />REST API & inbound channels</h2>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-slate-400" />API keys</span>} description="Authenticate with the header Authorization: Bearer <key>" />
          <div className="p-5"><ApiKeyForm /></div>
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {keys.map((k) => (
              <li key={k.id} className={cn("flex items-center justify-between gap-3 px-5 py-3 text-[13px]", k.revokedAt && "opacity-50")}>
                <span><span className="font-medium text-ink">{k.name}</span> <code className="ml-1 text-xs text-slate-500">{k.prefix}…</code><span className="block text-xs text-slate-500">{k.scopes.join(", ")} · last used {ago(k.lastUsedAt)}</span></span>
                {k.revokedAt ? <Badge>revoked</Badge> : <ActionButton action={revokeApiKey} fields={{ id: k.id }} variant="ghost" confirm="Revoke this key? Integrations using it will stop working.">Revoke</ActionButton>}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Endpoints" />
          <div className="space-y-3 p-5 text-[13px]">
            <pre className="overflow-x-auto rounded-lg bg-ink p-4 text-[12px] leading-relaxed text-slate-200">{`# List open jobs
curl ${appUrl("/api/v1/jobs")} \\
  -H "Authorization: Bearer hly_…"

# Submit an application (JSON; cvText or cvBase64 + cvFilename)
curl -X POST ${appUrl("/api/v1/applications")} \\
  -H "Authorization: Bearer hly_…" -H "Content-Type: application/json" \\
  -d '{"jobId":"…","firstName":"Anna","lastName":"Keller",
       "email":"anna@example.ch","source":"Partner board",
       "consent":true,"cvText":"…"}'`}</pre>
            <p className="text-slate-600">Inbound email: forward applications to <code className="rounded bg-slate-100 px-1">jobs+{ctx.org.slug}@inbound.hirely.app</code> (Postmark inbound webhook → <code>/api/inbound/email</code>).</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
