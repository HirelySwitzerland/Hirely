"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { audit, userActor } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/session";
import { enqueue } from "@/lib/queue";
import { DEFAULT_TEMPLATES, TEMPLATE_KEYS } from "@/lib/services/communication";
import type { Step } from "@/lib/services/automation";
import { HUMAN_ONLY_STAGES } from "@/lib/stages";
import { fail, ok, str, toActionError, type ActionState } from "@/lib/action-state";

const stepSchema: z.ZodType<Step> = z.union([
  z.object({ id: z.string(), type: z.literal("wait"), minutes: z.number().int().min(1).max(60 * 24 * 60) }),
  z.object({ id: z.string(), type: z.literal("action"), action: z.enum(["analyze_cv", "send_message", "invite_ai_interview", "invite_video_interview", "send_reminder", "generate_report", "notify_recruiter", "move_stage", "add_tag"]), templateKey: z.string().optional(), channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]).optional(), stage: z.enum(["NEW", "AI_SCREENING", "AI_INTERVIEW", "REVIEW", "SHORTLISTED", "PERSONAL_INTERVIEW", "OFFER", "HIRED", "REJECTED", "TALENT_POOL"]).optional(), tag: z.string().optional(), note: z.string().optional() }),
  z.object({ id: z.string(), type: z.literal("condition"), check: z.enum(["meets_minimum", "not_meets_minimum", "no_response", "interview_completed", "knockout_failed", "stage_is"]), value: z.string().optional(), onFalse: z.string() }),
  z.object({ id: z.string(), type: z.literal("end") }),
]) as z.ZodType<Step>;

export async function saveAutomation(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("automations.manage");
    const id = str(fd, "id");
    const name = str(fd, "name");
    if (name.length < 2) return fail("Bitte geben Sie der Automation einen Namen.");
    const trigger = z.enum(["APPLICATION_RECEIVED", "CV_ANALYZED", "INTERVIEW_COMPLETED", "STAGE_CHANGED"]).parse(str(fd, "trigger"));
    const steps = z.array(stepSchema).min(1, "Bitte mindestens einen Schritt hinzufügen.").max(40).parse(JSON.parse(str(fd, "steps") || "[]"));
    for (const s of steps) {
      if (s.type === "action" && s.action === "move_stage" && (!s.stage || HUMAN_ONLY_STAGES.includes(s.stage as never)))
        return fail("Automationen können niemanden in „Engere Wahl“, „Angebot“, „Eingestellt“ oder „Abgesagt“ verschieben – das entscheiden Menschen.");
      if (s.type === "condition" && s.onFalse !== "stop" && !steps.some((x) => x.id === s.onFalse)) return fail("Eine Bedingung verweist auf einen Schritt, den es nicht mehr gibt.");
      if (s.type === "condition" && s.onFalse !== "stop" && steps.findIndex((x) => x.id === s.onFalse) <= steps.indexOf(s)) return fail("Bedingungen können nur vorwärts springen (keine Schleifen).");
    }
    const jobId = str(fd, "jobId") || null;
    if (jobId && !(await db.job.findFirst({ where: { id: jobId, orgId: ctx.orgId } }))) return fail("Stelle nicht gefunden.");
    const data = { name, description: str(fd, "description") || null, trigger, jobId, steps: steps as object, enabled: fd.get("enabled") === "on" };
    const saved = id
      ? await db.automation.update({ where: { id: (await db.automation.findFirstOrThrow({ where: { id, orgId: ctx.orgId } })).id }, data })
      : await db.automation.create({ data: { ...data, orgId: ctx.orgId } });
    await audit(ctx.orgId, userActor(ctx.user), "automation.updated", { type: "Automation", id: saved.id, label: saved.name }, { steps: steps.length, enabled: data.enabled });
    return ok("Automation gespeichert.", id ? {} : { redirect: `/app/automations/${saved.id}` });
  } catch (e) {
    return toActionError(e);
  }
}

export async function toggleAutomation(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("automations.manage");
    const a = await db.automation.findFirst({ where: { id: str(fd, "id"), orgId: ctx.orgId } });
    if (!a) return fail("Nicht gefunden.");
    await db.automation.update({ where: { id: a.id }, data: { enabled: !a.enabled } });
    await audit(ctx.orgId, userActor(ctx.user), "automation.updated", { type: "Automation", id: a.id, label: a.name }, { enabled: !a.enabled });
    return ok(a.enabled ? "Automation paused." : "Automation enabled.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteAutomation(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("automations.manage");
    const a = await db.automation.findFirst({ where: { id: str(fd, "id"), orgId: ctx.orgId } });
    if (!a) return fail("Nicht gefunden.");
    await db.automation.delete({ where: { id: a.id } });
    await audit(ctx.orgId, userActor(ctx.user), "automation.deleted", { type: "Automation", id: a.id, label: a.name });
    return ok("Automation gelöscht.", { redirect: "/app/automations" });
  } catch (e) {
    return toActionError(e);
  }
}

export async function runControl(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("automations.manage");
    const run = await db.automationRun.findFirst({ where: { id: str(fd, "runId"), orgId: ctx.orgId } });
    if (!run) return fail("Durchlauf nicht gefunden.");
    if (str(fd, "op") === "cancel") {
      await db.automationRun.update({ where: { id: run.id }, data: { status: "CANCELLED" } });
      return ok("Durchlauf abgebrochen.");
    }
    if (run.status !== "WAITING") return fail("Nur wartende Durchläufe können fortgesetzt werden.");
    await db.automationRun.update({ where: { id: run.id }, data: { nextRunAt: new Date() } });
    await enqueue("automation.step", { runId: run.id }, { orgId: ctx.orgId });
    return ok("Wartezeit übersprungen – der Ablauf geht jetzt weiter.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function saveTemplate(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("templates.manage");
    const key = str(fd, "key");
    if (!TEMPLATE_KEYS[key]) return fail("Unbekannte Vorlage.");
    const channel = z.enum(["EMAIL", "SMS", "WHATSAPP"]).parse(str(fd, "channel"));
    const language = z.enum(["de", "en", "fr", "it"]).parse(str(fd, "language"));
    const body = str(fd, "body");
    if (body.length < 5) return fail("Die Nachricht ist zu kurz.");
    if (channel === "SMS" && body.length > 480) return fail("SMS-Vorlagen sollten unter 480 Zeichen bleiben (3 SMS).");
    await db.messageTemplate.upsert({
      where: { orgId_key_channel_language: { orgId: ctx.orgId, key, channel, language } },
      create: { orgId: ctx.orgId, key, channel, language, name: TEMPLATE_KEYS[key], subject: str(fd, "subject") || null, body },
      update: { subject: str(fd, "subject") || null, body },
    });
    await audit(ctx.orgId, userActor(ctx.user), "settings.changed", { type: "MessageTemplate", label: `${TEMPLATE_KEYS[key]} (${channel}, ${language})` });
    return ok("Vorlage gespeichert.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function resetTemplate(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("templates.manage");
    await db.messageTemplate.deleteMany({ where: { orgId: ctx.orgId, key: str(fd, "key"), channel: str(fd, "channel") as "EMAIL", language: str(fd, "language") } });
    return ok(DEFAULT_TEMPLATES[str(fd, "key")] ? "Auf Hirely-Standard zurückgesetzt." : "Template removed.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function retryMessage(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("communication.send");
    const m = await db.message.findFirst({ where: { id: str(fd, "messageId"), orgId: ctx.orgId, status: "FAILED" } });
    if (!m) return fail("Nachricht nicht gefunden oder nicht fehlgeschlagen.");
    const { deliver } = await import("@/lib/services/communication");
    const r = await deliver(m.id, userActor(ctx.user));
    return r.ok ? ok("Nachricht zugestellt.") : fail(`Weiterhin fehlgeschlagen: ${r.error}`);
  } catch (e) {
    return toActionError(e);
  }
}
