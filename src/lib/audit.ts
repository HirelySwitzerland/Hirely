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
  "candidate.created": "Kandidat/in erfasst",
  "candidate.viewed": "Profil angesehen",
  "candidate.deleted": "Kandidat/in gelöscht",
  "candidate.anonymized": "Kandidat/in anonymisiert",
  "candidate.exported": "Daten exportiert",
  "candidate.stage_changed": "Stufe geändert",
  "cv.analyzed": "CV ausgewertet",
  "cv.analysis_failed": "CV-Auswertung fehlgeschlagen",
  "interview.started": "KI-Interview gestartet",
  "interview.completed": "KI-Interview abgeschlossen",
  "interview.failed": "KI-Interview fehlgeschlagen",
  "interview.scheduled": "Gespräch geplant",
  "message.sent": "Nachricht gesendet",
  "message.failed": "Nachricht fehlgeschlagen",
  "job.created": "Stelle erstellt",
  "job.updated": "Stelle geändert",
  "job.ai_config_updated": "KI-Konfiguration geändert",
  "settings.changed": "Einstellungen geändert",
  "ats.synced": "ATS synchronisiert",
  "ats.sync_failed": "ATS-Synchronisierung fehlgeschlagen",
  "user.invited": "Benutzer/in eingeladen",
  "user.role_changed": "Rolle geändert",
  "user.removed": "Benutzer/in entfernt",
  "user.login": "Anmeldung",
  "requirement.overridden": "Bewertung manuell angepasst",
  "automation.updated": "Automation geändert",
  "billing.plan_changed": "Plan gewechselt",
  "privacy.request": "Datenschutz-Anfrage",
  "integration.connected": "Integration verbunden",
  "integration.disconnected": "Integration getrennt",
  "apikey.created": "API-Schlüssel erstellt",
};
