import { db } from "@/lib/db";
import { registerHandler } from "./index";
import { analyzeApplication } from "@/lib/services/screening";
import { executeRun } from "@/lib/services/automation";
import { placeCall } from "@/lib/services/interviews";
import { deliver, sendMessage } from "@/lib/services/communication";
import { syncIntegration } from "@/lib/services/ats-sync";
import { retentionSweep } from "@/lib/services/privacy";
import { formatZurich } from "@/lib/services/scheduling";

registerHandler("cv.analyze", async (p) => analyzeApplication(p.applicationId));
registerHandler("automation.step", async (p) => executeRun(p.runId));
registerHandler("interview.call", async (p) => placeCall(p.interviewId, { explicit: Boolean(p.explicit) }));
registerHandler("message.retry", async (p) => {
  const m = await db.message.findUnique({ where: { id: p.messageId } });
  if (m && m.status === "FAILED") await deliver(m.id);
});
registerHandler("ats.sync", async (p) => {
  const r = await syncIntegration(p.integrationId);
  if (!r.ok && r.retryable) throw new Error(r.error);
});
registerHandler("retention.sweep", async (p) => {
  await retentionSweep(p.orgId);
});
registerHandler("reminder.personal_interview", async (p) => {
  const ev = await db.calendarEvent.findUnique({ where: { id: p.eventId }, include: { application: { include: { job: true } } } });
  if (!ev || ev.status === "CANCELLED" || !ev.applicationId) return;
  const when = formatZurich(ev.startsAt, ev.application?.job.language === "en" ? "en-GB" : "de-CH");
  await sendMessage({ orgId: ev.orgId, applicationId: ev.applicationId, channel: "EMAIL", templateKey: "personal_interview_reminder", vars: { interviewDate: when, location: ev.location ?? "" }, actor: { type: "SYSTEM" } });
  await sendMessage({ orgId: ev.orgId, applicationId: ev.applicationId, channel: "SMS", templateKey: "personal_interview_reminder", vars: { interviewDate: when, location: ev.location ?? "" }, actor: { type: "SYSTEM" } }).catch(() => undefined);
});
