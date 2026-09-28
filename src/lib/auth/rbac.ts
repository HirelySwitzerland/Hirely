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
  OWNER: "Owner",
  ADMIN: "Admin",
  RECRUITER: "Recruiter",
  HIRING_MANAGER: "Hiring Manager",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: "Full access including billing and organization ownership.",
  ADMIN: "Manage users, settings, integrations and privacy. No billing.",
  RECRUITER: "Run recruiting: jobs, candidates, interviews, automations.",
  HIRING_MANAGER: "Review candidates for their positions and move stages.",
  VIEWER: "Read-only access to jobs, candidates and analytics.",
};

/** Roles an actor is allowed to assign. Nobody but an owner can create owners. */
export function assignableRoles(actor: Role): Role[] {
  if (actor === "OWNER") return ["OWNER", "ADMIN", "RECRUITER", "HIRING_MANAGER", "VIEWER"];
  if (actor === "ADMIN") return ["ADMIN", "RECRUITER", "HIRING_MANAGER", "VIEWER"];
  return [];
}
