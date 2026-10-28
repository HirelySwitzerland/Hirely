import type { Stage } from "@prisma/client";
import { db } from "@/lib/db";
import { enqueue, scaledDelayMs } from "@/lib/queue";
import { STAGE_LABEL, TEMPLATE_LABELS } from "@/lib/stages";

/**
 * Automation engine. An automation is a trigger + an ordered list of steps.
 * Runs are persisted (AutomationRun) and advanced by the job queue, so waits
 * of hours or days survive restarts. Every step appends to the run log.
 */
export type AutomationTrigger = "APPLICATION_RECEIVED" | "CV_ANALYZED" | "INTERVIEW_COMPLETED" | "STAGE_CHANGED";

export type ActionType =
  | "analyze_cv"
  | "send_message"
  | "invite_ai_interview"
  | "invite_video_interview"
  | "send_reminder"
  | "generate_report"
  | "notify_recruiter"
  | "move_stage"
  | "add_tag";

export type ConditionCheck = "meets_minimum" | "not_meets_minimum" | "no_response" | "interview_completed" | "knockout_failed" | "stage_is";

export type Step =
  | { id: string; type: "wait"; minutes: number }
  | { id: string; type: "action"; action: ActionType; templateKey?: string; channel?: "EMAIL" | "SMS" | "WHATSAPP"; stage?: Stage; tag?: string; note?: string }
  | { id: string; type: "condition"; check: ConditionCheck; value?: string; onFalse: "stop" | string }
  | { id: string; type: "end" };

export const TRIGGERS: Record<AutomationTrigger, string> = {
  APPLICATION_RECEIVED: "Bewerbung eingegangen",
  CV_ANALYZED: "CV ausgewertet",
  INTERVIEW_COMPLETED: "KI-Interview abgeschlossen",
  STAGE_CHANGED: "Stufe geändert",
};

export const ACTIONS: Record<ActionType, string> = {
  analyze_cv: "CV auswerten",
  send_message: "Nachricht senden",
  invite_ai_interview: "Zum KI-Interview einladen",
  invite_video_interview: "Zum Video-Interview einladen",
  send_reminder: "Erinnerung senden",
  generate_report: "Bericht erstellen",
  notify_recruiter: "Team benachrichtigen",
  move_stage: "Stufe ändern",
  add_tag: "Tag hinzufügen",
};

export const CONDITIONS: Record<ConditionCheck, string> = {
  meets_minimum: "Mindestkriterien erfüllt",
  not_meets_minimum: "Mindestkriterien nicht erfüllt",
  no_response: "Keine Reaktion der Person",
  interview_completed: "KI-Interview abgeschlossen",
  knockout_failed: "Ausschlussfrage nicht bestanden",
  stage_is: "Person ist in Stufe",
};

type LogEntry = { at: string; stepId?: string; message: string; level: "info" | "warn" | "error" };

export function describeStep(s: Step): string {
  if (s.type === "end") return "Automation beenden";
  if (s.type === "wait") return s.minutes >= 1440 ? `${s.minutes / 1440} Tag(e) warten` : s.minutes >= 60 ? `${s.minutes / 60} Std. warten` : `${s.minutes} Min. warten`;
  if (s.type === "condition") return `Wenn: ${CONDITIONS[s.check]}${s.value ? ` "${STAGE_LABEL[s.value as Stage] ?? s.value}"` : ""}`;
  return ACTIONS[s.action] + (s.templateKey ? ` · ${TEMPLATE_LABELS[s.templateKey] ?? s.templateKey}` : "") + (s.stage ? ` · ${STAGE_LABEL[s.stage] ?? s.stage}` : "");
}

export async function fireTrigger(orgId: string, trigger: AutomationTrigger, applicationId: string, meta: { stage?: Stage } = {}) {
  const app = await db.application.findUnique({ where: { id: applicationId }, select: { jobId: true } });
  if (!app) return;
  const automations = await db.automation.findMany({ where: { orgId, trigger, enabled: true, OR: [{ jobId: null }, { jobId: app.jobId }] } });
  for (const a of automations) {
    const steps = a.steps as unknown as Step[];
    // STAGE_CHANGED automations may restrict to a target stage via their first condition step.
    if (trigger === "STAGE_CHANGED" && steps[0]?.type === "condition" && steps[0].check === "stage_is" && steps[0].value !== meta.stage) continue;
    const running = await db.automationRun.findFirst({ where: { automationId: a.id, applicationId, status: { in: ["RUNNING", "WAITING"] } } });
    if (running) continue;
    const run = await db.automationRun.create({
      data: { orgId, automationId: a.id, applicationId, status: "RUNNING", log: [{ at: new Date().toISOString(), message: `Ausgelöst: ${TRIGGERS[trigger]}`, level: "info" }] },
    });
    await enqueue("automation.step", { runId: run.id }, { orgId });
  }
}

async function evaluateCondition(check: ConditionCheck, value: string | undefined, applicationId: string, runCreatedAt: Date): Promise<boolean> {
  const app = await db.application.findUniqueOrThrow({ where: { id: applicationId } });
  switch (check) {
    case "meets_minimum":
      return app.screeningStatus === "COMPLETED" && app.meetsMinimum === true;
    case "not_meets_minimum":
      return app.meetsMinimum === false;
    case "knockout_failed":
      return app.knockoutFailed;
    case "interview_completed":
      return app.interviewStatus === "COMPLETED";
    case "no_response":
      return !["COMPLETED", "IN_PROGRESS", "SCHEDULED", "DECLINED"].includes(app.interviewStatus) && (!app.lastCandidateActionAt || app.lastCandidateActionAt < runCreatedAt);
    case "stage_is":
      return app.stage === value;
  }
}

export async function executeRun(runId: string) {
  const run = await db.automationRun.findUnique({ where: { id: runId }, include: { automation: true, application: true } });
  if (!run || !["RUNNING", "WAITING"].includes(run.status)) return;
  if (!run.automation.enabled) {
    await db.automationRun.update({ where: { id: run.id }, data: { status: "CANCELLED" } });
    return;
  }
  const steps = run.automation.steps as unknown as Step[];
  const log = [...((run.log as unknown as LogEntry[]) ?? [])];
  const push = (message: string, stepId?: string, level: LogEntry["level"] = "info") => log.push({ at: new Date().toISOString(), stepId, message, level });
  let i = run.stepIndex;
  // A WAITING run resumes after its wait step.
  if (run.status === "WAITING") {
    if (run.nextRunAt && run.nextRunAt > new Date()) return;
    i += 1;
  }
  const { runAction } = await import("./automation-actions");

  while (i < steps.length) {
    const step = steps[i];
    if (step.type === "end") break;
    if (step.type === "wait") {
      const at = new Date(Date.now() + scaledDelayMs(step.minutes));
      push(`${describeStep(step)} (weiter um ${at.toLocaleString("de-CH", { timeZone: "Europe/Zurich" })})`, step.id);
      await db.automationRun.update({ where: { id: run.id }, data: { status: "WAITING", stepIndex: i, nextRunAt: at, log: log as object } });
      await enqueue("automation.step", { runId: run.id }, { orgId: run.orgId, runAt: at });
      return;
    }
    if (step.type === "condition") {
      const ok = await evaluateCondition(step.check, step.value, run.applicationId, run.createdAt);
      push(`${describeStep(step)} → ${ok ? "ja" : "nein"}`, step.id);
      if (!ok) {
        if (step.onFalse === "stop") {
          push("Bedingung nicht erfüllt – Automation beendet.");
          break;
        }
        const target = steps.findIndex((s) => s.id === step.onFalse);
        if (target < 0 || target <= i) {
          push("Ungültiges Sprungziel – Abbruch.", step.id, "error");
          break;
        }
        i = target;
        continue;
      }
      i++;
      continue;
    }
    try {
      const result = await runAction(step, run.applicationId, run.orgId);
      push(`${describeStep(step)}: ${result}`, step.id);
    } catch (e) {
      push(`${describeStep(step)} fehlgeschlagen: ${(e as Error).message}`, step.id, "error");
      await db.automationRun.update({ where: { id: run.id }, data: { status: "FAILED", stepIndex: i, log: log as object } });
      const { notify } = await import("./notifications");
      await notify(run.orgId, {
        type: "system_error",
        title: `Automation "${run.automation.name}" fehlgeschlagen`,
        body: (e as Error).message,
        link: `/app/automations/${run.automationId}`,
        severity: "error",
      });
      return;
    }
    i++;
  }
  push("Automation abgeschlossen.");
  await db.automationRun.update({ where: { id: run.id }, data: { status: "COMPLETED", stepIndex: steps.length, nextRunAt: null, log: log as object } });
}

/** The reference automation from the product spec. */
export function defaultPipelineAutomation(): Step[] {
  return [
    { id: "s1", type: "wait", minutes: 10 },
    { id: "s2", type: "action", action: "analyze_cv" },
    { id: "s3", type: "condition", check: "meets_minimum", onFalse: "s_review" },
    { id: "s4", type: "action", action: "invite_ai_interview", channel: "EMAIL" },
    { id: "s5", type: "wait", minutes: 1440 },
    { id: "s6", type: "condition", check: "no_response", onFalse: "s11" },
    { id: "s7", type: "action", action: "send_reminder", templateKey: "interview_reminder", channel: "SMS" },
    { id: "s8", type: "wait", minutes: 2880 },
    { id: "s9", type: "condition", check: "no_response", onFalse: "s11" },
    { id: "s10", type: "action", action: "send_reminder", templateKey: "interview_final_reminder", channel: "EMAIL" },
    { id: "s11", type: "condition", check: "interview_completed", onFalse: "stop" },
    { id: "s12", type: "action", action: "generate_report" },
    { id: "s13", type: "action", action: "notify_recruiter", note: "Neue Bewerbung bereit zur Prüfung." },
    { id: "s_end", type: "end" },
    { id: "s_review", type: "action", action: "notify_recruiter", note: "Nicht alle Mindestkriterien erfüllt – bitte manuell prüfen." },
  ];
}
