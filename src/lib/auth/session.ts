import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Membership, Organization, Role, Session, User } from "@prisma/client";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { can, type Permission } from "./rbac";

export const SESSION_COOKIE = "hirely_session";
const SESSION_DAYS = 14;

export async function createSession(userId: string, opts: { twoFactorVerified: boolean; orgId?: string | null }) {
  const token = randomToken(32);
  const h = await headers();
  const membership = opts.orgId
    ? null
    : await db.membership.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      activeOrgId: opts.orgId ?? membership?.orgId ?? null,
      twoFactorVerified: opts.twoFactorVerified,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000),
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function getSession(): Promise<(Session & { user: User }) | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Authenticated user with 2FA completed (if enabled). */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.totpEnabled && !session.twoFactorVerified) redirect("/two-factor");
  return session;
}

export type Ctx = {
  session: Session;
  user: User;
  org: Organization;
  membership: Membership;
  role: Role;
  orgId: string;
  can: (p: Permission) => boolean;
};

/**
 * Resolves the tenant context for the current request. Every server component,
 * server action and API route touching tenant data goes through here, so the
 * orgId used in queries always comes from a verified membership — never from input.
 */
export async function getContext(opts: { allowIncompleteOnboarding?: boolean } = {}): Promise<Ctx> {
  const session = await requireUser();
  let membership = session.activeOrgId
    ? await db.membership.findUnique({
        where: { userId_orgId: { userId: session.userId, orgId: session.activeOrgId } },
        include: { org: true },
      })
    : null;
  if (!membership) {
    membership = await db.membership.findFirst({
      where: { userId: session.userId },
      include: { org: true },
      orderBy: { createdAt: "asc" },
    });
    if (membership) await db.session.update({ where: { id: session.id }, data: { activeOrgId: membership.orgId } });
  }
  if (!membership) redirect("/onboarding");
  if (!membership.org.onboardingCompleted && !opts.allowIncompleteOnboarding) redirect("/onboarding");
  const role = membership.role;
  return {
    session,
    user: session.user,
    org: membership.org,
    membership,
    role,
    orgId: membership.orgId,
    can: (p) => can(role, p),
  };
}

export class ForbiddenError extends Error {
  constructor(permission: string) {
    super(`You don't have permission to perform this action (${permission}).`);
  }
}

export async function requirePermission(permission: Permission, opts?: { allowIncompleteOnboarding?: boolean }) {
  const ctx = await getContext(opts);
  if (!ctx.can(permission)) throw new ForbiddenError(permission);
  return ctx;
}

/** For pages: render a friendly 403 instead of throwing. */
export async function pageContext(permission?: Permission) {
  const ctx = await getContext();
  if (permission && !ctx.can(permission)) redirect("/app?denied=" + encodeURIComponent(permission));
  return ctx;
}
