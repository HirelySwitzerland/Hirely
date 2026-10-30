import { pageContext } from "@/lib/auth/session";
import { getLLM } from "@/lib/providers/llm";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Alert, Card, CardHeader, Checkbox, Field, Select } from "@/components/ui";
import { updateSettingsSection } from "@/app/actions/settings";

export const metadata = { title: "KI-Einstellungen" };

export default async function AiSettings() {
  const ctx = await pageContext("settings.manage");
  const ai = ((ctx.org.settings as Record<string, unknown>).ai ?? {}) as Record<string, unknown>;
  const llm = getLLM();
  return (
    <div className="space-y-5">
      <Alert tone="info" title="Die KI-Grundsätze von Recruit24">
        Die KI bereitet vor, Menschen entscheiden. Recruit24 prüft nur die stellenbezogenen Kriterien, die Sie festlegen, zeigt zu jedem den Beleg, trennt Fakten von Ableitungen, bewertet nie Persönlichkeit oder Aussehen, nutzt keine geschützten Merkmale und kann nie jemandem absagen oder jemanden einstellen.
      </Alert>
      <Card>
        <CardHeader title="Standardverhalten der KI" description="Gilt für alle Stellen, sofern eine Stelle nichts anderes festlegt." />
        <ActionForm action={updateSettingsSection} className="space-y-4 p-5">
          <input type="hidden" name="section" value="ai" />
          <input type="hidden" name="__booleans" value="autoInvite,followUps,injectionProtection,humanReviewRequired" />
          <Checkbox name="autoInvite" defaultChecked={ai.autoInvite !== false} label="Wer die Mindestkriterien erfüllt, wird automatisch zum KI-Interview eingeladen" />
          <Checkbox name="followUps" defaultChecked={ai.followUps !== false} label="KI darf bei kurzen Antworten nachfragen" />
          <Checkbox name="injectionProtection" defaultChecked={ai.injectionProtection !== false} label="Schutz vor Prompt-Injection" description="Inhalte von Kandidierenden gelten immer als Daten; verdächtige Anweisungen in CVs werden dem Team gemeldet." />
          <Checkbox name="humanReviewRequired" defaultChecked disabled label="Menschlicher Entscheid nötig für engere Wahl, Angebot, Einstellung und Absage" description="Immer aktiv – kann nicht ausgeschaltet werden." />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Sprache der KI-Zusammenfassungen"><Select name="summaryLanguage" defaultValue={String(ai.summaryLanguage ?? "de")}><option value="de">Deutsch</option><option value="en">English</option><option value="fr">Français</option><option value="it">Italiano</option></Select></Field>
            <Field label="Mindestkriterien für automatische Einladung"><Select name="minimumCriteria" defaultValue={String(ai.minimumCriteria ?? "must_have_not_failed")}><option value="must_have_not_failed">Kein Muss-Kriterium klar verfehlt, keine Ausschlussfrage verfehlt</option><option value="all_must_confirmed">Alle Muss-Kriterien bestätigt</option></Select></Field>
          </div>
          <SubmitButton>Speichern</SubmitButton>
        </ActionForm>
      </Card>
      <Card className="p-5 text-sm text-slate-600">
        <p className="font-semibold text-ink">Aktiver KI-Anbieter</p>
        <p className="mt-1">{llm.name} · {llm.model}. Der Anbieter wird pro Installation festgelegt (Anthropic, OpenAI oder die eingebaute regelbasierte Engine). Kandidatendaten werden nur für Ihr Recruiting verwendet und nie zum Training von Modellen.</p>
      </Card>
    </div>
  );
}
