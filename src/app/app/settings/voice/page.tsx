import { pageContext } from "@/lib/auth/session";
import { VOICE_LANGUAGES } from "@/lib/providers/voice";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, CardHeader, Checkbox, Field, Input, Select } from "@/components/ui";
import { updateSettingsSection } from "@/app/actions/settings";

export const metadata = { title: "Voice settings" };

export default async function VoiceSettings() {
  const ctx = await pageContext("settings.manage");
  const v = ((ctx.org.settings as Record<string, unknown>).voice ?? {}) as Record<string, unknown>;
  return (
    <Card>
      <CardHeader title="AI phone interviews" description="How the AI voice assistant calls candidates. The assistant always introduces itself as an AI and asks for recording consent." />
      <ActionForm action={updateSettingsSection} className="space-y-4 p-5">
        <input type="hidden" name="section" value="voice" />
        <input type="hidden" name="__booleans" value="recordCalls,smsBeforeCall" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Default interview language"><Select name="language" defaultValue={String(v.language ?? "de-CH")}>{VOICE_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</Select></Field>
          <Field label="Voice"><Select name="voice" defaultValue={String(v.voice ?? "alloy-de-ch")}><option value="alloy-de-ch">Clara — calm, professional (f)</option><option value="onyx-de-ch">Luca — warm, friendly (m)</option><option value="neutral">Neutral</option></Select></Field>
          <Field label="Call window from" hint="Swiss local time — calls are only placed in this window"><Input name="callWindowStart" type="time" defaultValue={String(v.callWindowStart ?? "08:00")} /></Field>
          <Field label="Call window until"><Input name="callWindowEnd" type="time" defaultValue={String(v.callWindowEnd ?? "19:30")} /></Field>
          <Field label="Max. call attempts"><Input name="maxAttempts" type="number" min={1} max={5} defaultValue={String(v.maxAttempts ?? 3)} /></Field>
          <Field label="Max. interview length (minutes)"><Input name="maxMinutes" type="number" min={5} max={30} defaultValue={String(v.maxMinutes ?? 15)} /></Field>
        </div>
        <Checkbox name="recordCalls" defaultChecked={v.recordCalls !== false} label="Record calls (only with the candidate's explicit consent)" />
        <Checkbox name="smsBeforeCall" defaultChecked={v.smsBeforeCall !== false} label="Send an SMS 1 minute before calling" />
        <SubmitButton>Save</SubmitButton>
      </ActionForm>
    </Card>
  );
}
