import { db } from "@/lib/db";

export type Actor =
  | { type: "USER"; id: string; name: string }
  | { type: "SYSTEM" | "AI" | "CANDIDATE" | "INTEGRATION"; id?: string; name?: string };

export async function audit(
  orgId: string,
  actor: Actor,
  action: string,
  entity?: { type: string; id?: string; label?: string },
  metadata: Record<string, unknown> = {},
) {
  try {
    await db.auditLog.create({
      data: {
        orgId,
        actorType: actor.type,
        actorId: actor.id ?? null,
        actorName: actor.name ?? (actor.type === "AI" ? "Hirely AI" : actor.type === "SYSTEM" ? "System" : null),
        action,
        entityType: entity?.type,
        entityId: entity?.id,
        entityLabel: entity?.label,
        metadata: metadata as object,
      },
    });
  } catch (e) {
    // Audit logging must never break the business action, but it must never be silent either.
    console.error("[audit] failed to write audit log", action, e);
  }
}

export function userActor(user: { id: string; name: string }): Actor {
  return { type: "USER", id: user.id, name: user.name };
}

export const AUDIT_LABELS: Record<string, string> = {
  "candidate.created": "Candidate created",
  "candidate.viewed": "Recruiter viewed candidate",
  "candidate.deleted": "Candidate deleted",
  "candidate.anonymized": "Candidate anonymized",
  "candidate.exported": "Candidate data exported",
  "candidate.stage_changed": "Candidate status changed",
  "cv.analyzed": "CV analyzed",
  "cv.analysis_failed": "CV analysis failed",
  "interview.started": "AI interview started",
  "interview.completed": "AI interview completed",
  "interview.failed": "AI interview failed",
  "interview.scheduled": "Interview scheduled",
  "message.sent": "Message sent",
  "message.failed": "Message failed",
  "job.created": "Job created",
  "job.updated": "Job updated",
  "job.ai_config_updated": "AI configuration changed",
  "settings.changed": "Settings changed",
  "ats.synced": "ATS synchronized",
  "ats.sync_failed": "ATS synchronization failed",
  "user.invited": "User invited",
  "user.role_changed": "User role changed",
  "user.removed": "User removed",
  "user.login": "User signed in",
  "requirement.overridden": "Requirement evaluation overridden",
  "automation.updated": "Automation changed",
  "billing.plan_changed": "Plan changed",
  "privacy.request": "Data subject request",
  "integration.connected": "Integration connected",
  "integration.disconnected": "Integration disconnected",
  "apikey.created": "API key created",
};
