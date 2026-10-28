import type { Role } from "@prisma/client";

/**
 * Role-based access control. Permissions are coarse, capability-style strings.
 * The matrix is the single source of truth for both UI gating and server enforcement.
 */
export const PERMISSIONS = [
  "jobs.view",
  "jobs.manage",
  "candidates.view",
  "candidates.manage",
  "candidates.stage",
  "candidates.delete",
  "candidates.export",
  "interviews.view",
  "interviews.manage",
  "communication.send",
  "templates.manage",
  "automations.manage",
  "integrations.manage",
  "analytics.view",
  "settings.manage",
  "users.manage",
  "billing.manage",
  "privacy.manage",
  "audit.view",
  "usage.view",
  "assistant.use",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = new Set<Permission>(PERMISSIONS);

const MATRIX: Record<Role, Set<Permission>> = {
  OWNER: ALL,
  ADMIN: new Set(PERMISSIONS.filter((p) => p !== "billing.manage")),
  RECRUITER: new Set<Permission>([
    "jobs.view", "jobs.manage", "candidates.view", "candidates.manage", "candidates.stage",
    "candidates.export", "interviews.view", "interviews.manage", "communication.send",
    "templates.manage", "automations.manage", "analytics.view", "usage.view", "assistant.use",
  ]),
  HIRING_MANAGER: new Set<Permission>([
    "jobs.view", "candidates.view", "candidates.stage", "interviews.view", "communication.send",
    "analytics.view", "assistant.use",
  ]),
  VIEWER: new Set<Permission>(["jobs.view", "candidates.view", "interviews.view", "analytics.view"]),
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].has(permission);
}

export function permissionsFor(role: Role): Permission[] {
  return PERMISSIONS.filter((p) => MATRIX[role].has(p));
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Inhaber/in",
  ADMIN: "Admin",
  RECRUITER: "Recruiter/in",
  HIRING_MANAGER: "Linienvorgesetzte/r",
  VIEWER: "Nur lesen",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: "Vollzugriff inkl. Abrechnung und Firmenverwaltung.",
  ADMIN: "Verwaltet Benutzer, Einstellungen, Integrationen und Datenschutz. Keine Abrechnung.",
  RECRUITER: "Führt das Recruiting: Stellen, Kandidierende, Gespräche, Automationen.",
  HIRING_MANAGER: "Prüft Kandidierende für die eigenen Stellen und verschiebt sie im Prozess.",
  VIEWER: "Nur Lesezugriff auf Stellen, Kandidierende und Auswertungen.",
};

/** Roles an actor is allowed to assign. Nobody but an owner can create owners. */
export function assignableRoles(actor: Role): Role[] {
  if (actor === "OWNER") return ["OWNER", "ADMIN", "RECRUITER", "HIRING_MANAGER", "VIEWER"];
  if (actor === "ADMIN") return ["ADMIN", "RECRUITER", "HIRING_MANAGER", "VIEWER"];
  return [];
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  "jobs.view": "Stellen ansehen",
  "jobs.manage": "Stellen bearbeiten",
  "candidates.view": "Kandidierende ansehen",
  "candidates.manage": "Kandidierende erfassen & bearbeiten",
  "candidates.stage": "Stufe ändern & entscheiden",
  "candidates.delete": "Daten löschen",
  "candidates.export": "Daten exportieren",
  "interviews.view": "Gespräche ansehen",
  "interviews.manage": "KI-Interviews starten",
  "communication.send": "Nachrichten senden",
  "templates.manage": "Vorlagen bearbeiten",
  "automations.manage": "Automationen bearbeiten",
  "integrations.manage": "Integrationen verwalten",
  "analytics.view": "Auswertungen ansehen",
  "settings.manage": "Einstellungen verwalten",
  "users.manage": "Benutzer verwalten",
  "billing.manage": "Abrechnung verwalten",
  "privacy.manage": "Datenschutz verwalten",
  "audit.view": "Protokoll ansehen",
  "usage.view": "Verbrauch ansehen",
  "assistant.use": "KI-Assistent nutzen",
};
