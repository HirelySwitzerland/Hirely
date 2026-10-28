import { pageContext } from "@/lib/auth/session";
import { VOICE_LANGUAGES } from "@/lib/providers/voice";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, CardHeader, Checkbox, Field, Input, Select } from "@/components/ui";
import { updateSettingsSection } from "@/app/actions/settings";

export const metadata = { title: "Telefon-Interview" };

export default async function VoiceSettings() {
  const ctx = await pageContext("settings.manage");
  const v = ((ctx.org.settings as Record<string, unknown>).voice ?? {}) as Record<string, unknown>;
  return (
    <Card>
      <CardHeader title="KI-Telefoninterviews" description="So ruft der KI-Assistent Kandidierende an. Er stellt sich immer als KI vor und fragt nach der Einwilligung zur Aufnahme." />
      <ActionForm action={updateSettingsSection} className="space-y-4 p-5">
        <input type="hidden" name="section" value="voice" />
        <input type="hidden" name="__booleans" value="recordCalls,smsBeforeCall" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Standardsprache im Interview"><Select name="language" defaultValue={String(v.language ?? "de-CH")}>{VOICE_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</Select></Field>
          <Field label="Stimme"><Select name="voice" defaultValue={String(v.voice ?? "alloy-de-ch")}><option value="alloy-de-ch">Clara – ruhig, professionell (w)</option><option value="onyx-de-ch">Luca – warm, freundlich (m)</option><option value="neutral">Neutral</option></Select></Field>
          <Field label="Anrufe ab" hint="Schweizer Zeit – Anrufe nur in diesem Zeitfenster"><Input name="callWindowStart" type="time" defaultValue={String(v.callWindowStart ?? "08:00")} /></Field>
          <Field label="Anrufe bis"><Input name="callWindowEnd" type="time" defaultValue={String(v.callWindowEnd ?? "19:30")} /></Field>
          <Field label="Max. Anrufversuche"><Input name="maxAttempts" type="number" min={1} max={5} defaultValue={String(v.maxAttempts ?? 3)} /></Field>
          <Field label="Max. Interviewdauer (Minuten)"><Input name="maxMinutes" type="number" min={5} max={30} defaultValue={String(v.maxMinutes ?? 15)} /></Field>
        </div>
        <Checkbox name="recordCalls" defaultChecked={v.recordCalls !== false} label="Anrufe aufzeichnen (nur mit ausdrücklicher Einwilligung)" />
        <Checkbox name="smsBeforeCall" defaultChecked={v.smsBeforeCall !== false} label="1 Minute vor dem Anruf eine SMS senden" />
        <SubmitButton>Speichern</SubmitButton>
      </ActionForm>
    </Card>
  );
}
