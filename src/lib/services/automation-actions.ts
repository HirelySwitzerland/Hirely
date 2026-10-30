import { db } from "@/lib/db";
import type { Step } from "./automation";
import { sendMessage } from "./communication";
import { analyzeApplication, reevaluate } from "./screening";
import { inviteToAiInterview, inviteToVideoInterview } from "./interviews";
import { notify } from "./notifications";
import { changeStage } from "./pipeline";
import { STAGE_LABEL } from "@/lib/stages";

export async function runAction(step: Extract<Step, { type: "action" }>, applicationId: string, orgId: string): Promise<string> {
  const actor = { type: "AI" as const, name: "Recruit24 Automation" };
  const app = await db.application.findUniqueOrThrow({ where: { id: applicationId }, include: { candidate: true, job: true } });
  const name = `${app.candidate.firstName} ${app.candidate.lastName}`;
  switch (step.action) {
    case "analyze_cv":
      if (app.screeningStatus === "COMPLETED") return "CV bereits ausgewertet";
      await analyzeApplication(applicationId);
      return "CV ausgewertet";
    case "send_message":
    case "send_reminder": {
      let channel = step.channel ?? "EMAIL";
      if (channel !== "EMAIL" && !app.candidate.phone) channel = "EMAIL";
      const r = await sendMessage({ orgId, applicationId, channel, templateKey: step.templateKey ?? "interview_reminder", actor });
      if (!r.ok) throw new Error(`Nachricht konnte nicht zugestellt werden: ${r.error}`);
      return `${channel === "EMAIL" ? "E-Mail" : channel === "SMS" ? "SMS" : "WhatsApp"} gesendet (${step.templateKey})`;
    }
    case "invite_ai_interview":
      await inviteToAiInterview(orgId, applicationId, actor, step.channel ?? "EMAIL");
      return "Einladung zum KI-Interview gesendet";
    case "invite_video_interview":
      await inviteToVideoInterview(orgId, applicationId, actor);
      return "Einladung zum Video-Interview gesendet";
    case "generate_report":
      await reevaluate(applicationId);
      return "Bericht erstellt";
    case "notify_recruiter":
      await notify(orgId, {
        type: "candidate_ready",
        title: isReady(step.note) ? `Neue Bewerbung bereit zur Prüfung: ${name}` : `${name}: ${step.note ?? "bitte prüfen"}`,
        body: `${app.job.title} · erfüllt ${app.requirementsMet} von ${app.requirementsTotal} Anforderungen`,
        link: `/app/candidates/${applicationId}`,
        severity: isReady(step.note) ? "success" : "info",
      }, app.assignedToId ? { userIds: [app.assignedToId] } : {});
      return "Team benachrichtigt";
    case "move_stage":
      if (!step.stage) throw new Error("Keine Zielstufe festgelegt");
      await changeStage(orgId, applicationId, step.stage, actor, "Automation");
      return `Verschoben nach ${STAGE_LABEL[step.stage]}`;
    case "add_tag":
      await db.candidate.update({ where: { id: app.candidateId }, data: { tags: { push: step.tag ?? "automation" } } });
      return `Tag "${step.tag}" gesetzt`;
  }
}

function isReady(note?: string) {
  return Boolean(note && (note.startsWith("Neue Bewerbung") || note.startsWith("New candidate")));
}
