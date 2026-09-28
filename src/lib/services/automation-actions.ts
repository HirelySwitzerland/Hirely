import { db } from "@/lib/db";
import type { Step } from "./automation";
import { sendMessage } from "./communication";
import { analyzeApplication, reevaluate } from "./screening";
import { inviteToAiInterview, inviteToVideoInterview } from "./interviews";
import { notify } from "./notifications";
import { changeStage } from "./pipeline";

export async function runAction(step: Extract<Step, { type: "action" }>, applicationId: string, orgId: string): Promise<string> {
  const actor = { type: "AI" as const, name: "Hirely Automation" };
  const app = await db.application.findUniqueOrThrow({ where: { id: applicationId }, include: { candidate: true, job: true } });
  const name = `${app.candidate.firstName} ${app.candidate.lastName}`;
  switch (step.action) {
    case "analyze_cv":
      if (app.screeningStatus === "COMPLETED") return "CV already analyzed";
      await analyzeApplication(applicationId);
      return "CV analyzed";
    case "send_message":
    case "send_reminder": {
      let channel = step.channel ?? "EMAIL";
      if (channel !== "EMAIL" && !app.candidate.phone) channel = "EMAIL";
      const r = await sendMessage({ orgId, applicationId, channel, templateKey: step.templateKey ?? "interview_reminder", actor });
      if (!r.ok) throw new Error(`Message could not be delivered: ${r.error}`);
      return `${channel.toLowerCase()} sent (${step.templateKey})`;
    }
    case "invite_ai_interview":
      await inviteToAiInterview(orgId, applicationId, actor, step.channel ?? "EMAIL");
      return "AI interview invitation sent";
    case "invite_video_interview":
      await inviteToVideoInterview(orgId, applicationId, actor);
      return "Video interview invitation sent";
    case "generate_report":
      await reevaluate(applicationId);
      return "Candidate report generated";
    case "notify_recruiter":
      await notify(orgId, {
        type: "candidate_ready",
        title: step.note?.startsWith("New candidate") ? `New candidate ready for review: ${name}` : `${name}: ${step.note ?? "please review"}`,
        body: `${app.job.title} · meets ${app.requirementsMet} of ${app.requirementsTotal} requirements`,
        link: `/app/candidates/${applicationId}`,
        severity: step.note?.startsWith("New candidate") ? "success" : "info",
      }, app.assignedToId ? { userIds: [app.assignedToId] } : {});
      return "Recruiter notified";
    case "move_stage":
      if (!step.stage) throw new Error("No target stage configured");
      await changeStage(orgId, applicationId, step.stage, actor, "Automation");
      return `Moved to ${step.stage}`;
    case "add_tag":
      await db.candidate.update({ where: { id: app.candidateId }, data: { tags: { push: step.tag ?? "automation" } } });
      return `Tagged "${step.tag}"`;
  }
}
