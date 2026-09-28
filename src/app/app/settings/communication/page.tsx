import Link from "next/link";
import { pageContext } from "@/lib/auth/session";
import { getMessageProvider } from "@/lib/providers/messaging";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, CardHeader, Checkbox, Field, Input } from "@/components/ui";
import { updateSettingsSection } from "@/app/actions/settings";

export const metadata = { title: "Email & SMS settings" };

export default async function CommunicationSettings() {
  const ctx = await pageContext("settings.manage");
  const c = ((ctx.org.settings as Record<string, unknown>).communication ?? {}) as Record<string, unknown>;
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Email" action={<Badge tone="slate">{getMessageProvider("EMAIL").name}</Badge>} />
        <ActionForm action={updateSettingsSection} className="space-y-4 p-5">
          <input type="hidden" name="section" value="communication" />
          <input type="hidden" name="__booleans" value="smsEnabled,whatsappEnabled,quietHours" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Sender name"><Input name="senderName" defaultValue={String(c.senderName ?? `${ctx.org.name} Recruiting`)} /></Field>
            <Field label="Reply-to address"><Input name="replyTo" type="email" defaultValue={String(c.replyTo ?? "")} placeholder="jobs@company.ch" /></Field>
          </div>
          <Checkbox name="smsEnabled" defaultChecked={c.smsEnabled !== false} label="SMS reminders enabled" description="Only sent when the candidate provided a mobile number." />
          <Checkbox name="whatsappEnabled" defaultChecked={Boolean(c.whatsappEnabled)} label="WhatsApp messages enabled" description="Requires a WhatsApp Business sender and candidate opt-in." />
          <Checkbox name="quietHours" defaultChecked={c.quietHours !== false} label="Respect quiet hours (no SMS between 20:00 and 08:00, none on Sundays)" />
          <SubmitButton>Save</SubmitButton>
        </ActionForm>
      </Card>
      <Card className="p-5 text-sm text-slate-600">All candidate messages are editable per language under <Link href="/app/automations/templates" className="link">Automations → Message templates</Link>. Every sent message is visible in the <Link href="/app/automations/messages" className="link">outbox</Link>.</Card>
    </div>
  );
}
