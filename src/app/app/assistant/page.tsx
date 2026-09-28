import { Sparkles } from "lucide-react";
import { pageContext } from "@/lib/auth/session";
import { AssistantChat } from "@/components/app-shell";
import { ASSISTANT_SUGGESTIONS } from "@/lib/services/assistant";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "AI Assistant" };

export default async function AssistantPage() {
  await pageContext("assistant.use");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={<span className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-brand-600" />Recruiter assistant</span>} description="Ask about your candidates, interviews and jobs. Answers only include data your role may access. The assistant suggests — you decide." />
      <div className="card flex h-[65vh] flex-col overflow-hidden"><AssistantChat suggestions={ASSISTANT_SUGGESTIONS} /></div>
    </div>
  );
}
