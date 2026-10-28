import Link from "next/link";
import { pageContext } from "@/lib/auth/session";
import { getMessageProvider } from "@/lib/providers/messaging";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, CardHeader, Checkbox, Field, Input } from "@/components/ui";
import { updateSettingsSection } from "@/app/actions/settings";

export const metadata = { title: "E-Mail & SMS" };

export default async function CommunicationSettings() {
  const ctx = await pageContext("settings.manage");
  const c = ((ctx.org.settings as Record<string, unknown>).communication ?? {}) as Record<string, unknown>;
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="E-Mail" action={<Badge tone="slate">{getMessageProvider("EMAIL").name}</Badge>} />
        <ActionForm action={updateSettingsSection} className="space-y-4 p-5">
          <input type="hidden" name="section" value="communication" />
          <input type="hidden" name="__booleans" value="smsEnabled,whatsappEnabled,quietHours" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Absendername"><Input name="senderName" defaultValue={String(c.senderName ?? `${ctx.org.name} Recruiting`)} /></Field>
            <Field label="Antwortadresse"><Input name="replyTo" type="email" defaultValue={String(c.replyTo ?? "")} placeholder="jobs@firma.ch" /></Field>
          </div>
          <Checkbox name="smsEnabled" defaultChecked={c.smsEnabled !== false} label="SMS-Erinnerungen aktiv" description="Nur wenn eine Handynummer angegeben wurde." />
          <Checkbox name="whatsappEnabled" defaultChecked={Boolean(c.whatsappEnabled)} label="WhatsApp-Nachrichten aktiv" description="Benötigt einen WhatsApp-Business-Absender und die Zustimmung der Person." />
          <Checkbox name="quietHours" defaultChecked={c.quietHours !== false} label="Ruhezeiten einhalten (keine SMS zwischen 20 und 8 Uhr und nicht am Sonntag)" />
          <SubmitButton>Speichern</SubmitButton>
        </ActionForm>
      </Card>
      <Card className="p-5 text-sm text-slate-600">Alle Nachrichten an Kandidierende passen Sie pro Sprache unter <Link href="/app/automations/templates" className="link">Automationen → Nachrichtenvorlagen</Link> an. Jede gesendete Nachricht sehen Sie im <Link href="/app/automations/messages" className="link">Postausgang</Link>.</Card>
    </div>
  );
}
