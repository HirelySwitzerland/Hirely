import { Sparkles } from "lucide-react";
import { pageContext } from "@/lib/auth/session";
import { AssistantChat } from "@/components/app-shell";
import { ASSISTANT_SUGGESTIONS } from "@/lib/services/assistant";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "KI-Assistent" };

export default async function AssistantPage() {
  await pageContext("assistant.use");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={<span className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-brand-600" />KI-Assistent</span>} description="Fragen Sie nach Kandidierenden, Gesprächen und Stellen. Antworten enthalten nur Daten, die Ihre Rolle sehen darf. Der Assistent schlägt vor – Sie entscheiden." />
      <div className="card flex h-[65vh] flex-col overflow-hidden"><AssistantChat suggestions={ASSISTANT_SUGGESTIONS} /></div>
    </div>
  );
}
