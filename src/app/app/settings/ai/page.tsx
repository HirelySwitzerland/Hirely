import { pageContext } from "@/lib/auth/session";
import { getLLM } from "@/lib/providers/llm";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Alert, Card, CardHeader, Checkbox, Field, Select } from "@/components/ui";
import { updateSettingsSection } from "@/app/actions/settings";

export const metadata = { title: "AI settings" };

export default async function AiSettings() {
  const ctx = await pageContext("settings.manage");
  const ai = ((ctx.org.settings as Record<string, unknown>).ai ?? {}) as Record<string, unknown>;
  const llm = getLLM();
  return (
    <div className="space-y-5">
      <Alert tone="info" title="Hirely's AI principles">
        AI prepares, humans decide. Hirely evaluates only the job-related criteria you configure, shows the evidence for each, separates confirmed facts from inferences, never scores personality or appearance, never uses protected characteristics, and can never reject or hire anyone.
      </Alert>
      <Card>
        <CardHeader title="Default AI behaviour" description="Applies to all positions unless a job overrides it in its AI configuration." />
        <ActionForm action={updateSettingsSection} className="space-y-4 p-5">
          <input type="hidden" name="section" value="ai" />
          <input type="hidden" name="__booleans" value="autoInvite,followUps,injectionProtection,humanReviewRequired" />
          <Checkbox name="autoInvite" defaultChecked={ai.autoInvite !== false} label="Automatically invite candidates who meet the minimum criteria to the AI interview" />
          <Checkbox name="followUps" defaultChecked={ai.followUps !== false} label="Allow AI follow-up questions on short answers" />
          <Checkbox name="injectionProtection" defaultChecked={ai.injectionProtection !== false} label="Prompt-injection protection" description="Candidate content is always treated as data; suspicious instructions in CVs are flagged to recruiters." />
          <Checkbox name="humanReviewRequired" defaultChecked disabled label="Human decision required for shortlist, offer, hire and rejection" description="Always on — cannot be disabled." />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Language of AI summaries for recruiters"><Select name="summaryLanguage" defaultValue={String(ai.summaryLanguage ?? "en")}><option value="en">English</option><option value="de">Deutsch</option><option value="fr">Français</option><option value="it">Italiano</option></Select></Field>
            <Field label="Minimum criteria for auto-invite"><Select name="minimumCriteria" defaultValue={String(ai.minimumCriteria ?? "must_have_not_failed")}><option value="must_have_not_failed">No must-have explicitly not met, no failed knockout</option><option value="all_must_confirmed">All must-haves confirmed</option></Select></Field>
          </div>
          <SubmitButton>Save</SubmitButton>
        </ActionForm>
      </Card>
      <Card className="p-5 text-sm text-slate-600">
        <p className="font-semibold text-ink">Active AI provider</p>
        <p className="mt-1">{llm.name} · {llm.model}. The provider is configured per deployment via the AI abstraction layer (Anthropic, OpenAI or the built-in deterministic engine). Candidate data is processed only for your recruiting purposes and never used to train models.</p>
      </Card>
    </div>
  );
}
