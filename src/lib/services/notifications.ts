import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { can, type Permission } from "@/lib/auth/rbac";

export type NotificationInput = {
  type: string;
  title: string;
  body?: string;
  link?: string;
  severity?: "info" | "success" | "warning" | "error";
};

export const NOTIFICATION_TYPES: Record<string, { label: string; permission: Permission }> = {
  new_application: { label: "Neue Bewerbung", permission: "candidates.view" },
  interview_completed: { label: "KI-Interview abgeschlossen", permission: "candidates.view" },
  candidate_ready: { label: "Bereit zur Prüfung", permission: "candidates.view" },
  interview_scheduled: { label: "Gespräch gebucht", permission: "candidates.view" },
  candidate_cancelled: { label: "Abgesagt / abgelehnt durch Person", permission: "candidates.view" },
  ats_sync_failed: { label: "ATS-Synchronisation fehlgeschlagen", permission: "integrations.manage" },
  ai_call_failed: { label: "KI-Anruf fehlgeschlagen", permission: "interviews.manage" },
  integration_error: { label: "Integrationsfehler", permission: "integrations.manage" },
  usage_limit: { label: "Verbrauchsgrenze erreicht", permission: "usage.view" },
  message_failed: { label: "Nachricht nicht zugestellt", permission: "communication.send" },
  system_error: { label: "Systemfehler", permission: "settings.manage" },
};

/** Creates in-app notifications for every member allowed to see this type and who hasn't muted it. */
export async function notify(orgId: string, n: NotificationInput, opts: { userIds?: string[]; roles?: Role[] } = {}) {
  const def = NOTIFICATION_TYPES[n.type];
  const members = await db.membership.findMany({ where: { orgId, ...(opts.userIds ? { userId: { in: opts.userIds } } : {}) } });
  const targets = members.filter((m) => {
    if (opts.roles && !opts.roles.includes(m.role)) return false;
    if (def && !can(m.role, def.permission)) return false;
    const prefs = (m.notifyPrefs ?? {}) as Record<string, boolean>;
    return prefs[n.type] !== false;
  });
  if (!targets.length) return;
  await db.notification.createMany({
    data: targets.map((m) => ({ orgId, userId: m.userId, type: n.type, title: n.title, body: n.body, link: n.link, severity: n.severity ?? "info" })),
  });
}

export async function notifyAdmins(orgId: string, n: NotificationInput) {
  return notify(orgId, n, { roles: ["OWNER", "ADMIN"] });
}
