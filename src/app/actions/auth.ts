"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { decrypt, encrypt, randomToken, sha256 } from "@/lib/crypto";
import { hashPassword, passwordIssues, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSession, requireUser, SESSION_COOKIE } from "@/lib/auth/session";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "@/lib/auth/totp";
import { rateLimit } from "@/lib/rate-limit";
import { getMessageProvider } from "@/lib/providers/messaging";
import { appUrl } from "@/lib/services/communication";
import { fail, ok, str, toActionError, type ActionState } from "@/lib/action-state";

async function clientIp() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

const isMockEmail = () => getMessageProvider("EMAIL").name === "mock-email";

async function sendSystemEmail(to: string, subject: string, body: string) {
  const res = await getMessageProvider("EMAIL").send({ to, subject, body });
  if (!res.ok) throw new Error(`Email could not be sent: ${res.error}`);
}

async function issueToken(userId: string, type: "EMAIL_VERIFY" | "PASSWORD_RESET", hours: number) {
  const token = randomToken(32);
  await db.verificationToken.create({ data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + hours * 3600_000) } });
  return token;
}

async function sendVerificationEmail(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const token = await issueToken(user.id, "EMAIL_VERIFY", 48);
  const link = appUrl(`/verify-email/${token}`);
  await sendSystemEmail(user.email, "Confirm your email address", `Hi ${user.name}\n\nPlease confirm your email address for Hirely:\n${link}\n\nThis link is valid for 48 hours.`);
  if (process.env.NODE_ENV !== "production") console.log(`[auth] verification link for ${user.email}: ${link}`);
  return link;
}

const registerSchema = z.object({
  name: z.string().min(2, "Please enter your full name.").max(80),
  email: z.string().email("Please enter a valid email address.").max(160),
  password: z.string().max(200),
});

export async function register(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    if (!rateLimit(`register:${await clientIp()}`, 10, 3600_000).ok) return fail("Too many sign-up attempts. Please try again later.");
    const data = registerSchema.parse({ name: str(fd, "name"), email: str(fd, "email").toLowerCase(), password: String(fd.get("password") ?? "") });
    const issue = passwordIssues(data.password);
    if (issue) return fail(issue, { password: issue });
    if (fd.get("terms") !== "on") return fail("Please accept the terms and the data processing agreement.");
    const exists = await db.user.findUnique({ where: { email: data.email } });
    if (exists) return fail("An account with this email already exists. Sign in instead.", { email: "Already registered" });
    const user = await db.user.create({ data: { name: data.name, email: data.email, passwordHash: await hashPassword(data.password) } });
    await sendVerificationEmail(user.id).catch((e) => console.error("[auth] verification email failed", e));
    await createSession(user.id, { twoFactorVerified: true });
  } catch (e) {
    return toActionError(e);
  }
  redirect("/onboarding");
}

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  let dest = "/app";
  try {
    const email = str(fd, "email").toLowerCase();
    const password = String(fd.get("password") ?? "");
    const ip = await clientIp();
    const rl = rateLimit(`login:${ip}:${email}`, 8, 15 * 60_000);
    if (!rl.ok) return fail(`Too many sign-in attempts. Try again in ${Math.ceil(rl.retryAfterMs / 60000)} minutes.`);
    const user = await db.user.findUnique({ where: { email } });
    // Constant-ish time: always run a hash verification.
    const valid = user ? await verifyPassword(password, user.passwordHash) : await verifyPassword(password, "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
    if (!user || !valid) return fail("Email or password is incorrect.");
    await createSession(user.id, { twoFactorVerified: !user.totpEnabled });
    if (user.totpEnabled) dest = "/two-factor";
    else {
      await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      const m = await db.membership.findFirst({ where: { userId: user.id } });
      if (m) await audit(m.orgId, { type: "USER", id: user.id, name: user.name }, "user.login", { type: "User", id: user.id, label: user.email }, { ip });
      const next = str(fd, "next");
      if (next.startsWith("/app") || next.startsWith("/invite/")) dest = next;
    }
  } catch (e) {
    return toActionError(e);
  }
  redirect(dest);
}

export async function verifyTwoFactor(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await getSession();
    if (!session) return fail("Your session expired. Please sign in again.");
    if (!rateLimit(`2fa:${session.id}`, 6, 10 * 60_000).ok) return fail("Too many attempts. Please sign in again later.");
    const code = str(fd, "code").replace(/\s/g, "");
    const user = session.user;
    let valid = false;
    if (user.totpSecretEnc && /^\d{6}$/.test(code)) valid = verifyTotp(decrypt(user.totpSecretEnc), code);
    if (!valid && code.length >= 8) {
      const h = sha256(code.toUpperCase());
      if (user.recoveryCodes.includes(h)) {
        valid = true;
        await db.user.update({ where: { id: user.id }, data: { recoveryCodes: user.recoveryCodes.filter((c) => c !== h) } });
      }
    }
    if (!valid) return fail("That code is not valid. Check your authenticator app and try again.");
    await db.session.update({ where: { id: session.id }, data: { twoFactorVerified: true } });
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  } catch (e) {
    return toActionError(e);
  }
  redirect("/app");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function forgotPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const email = str(fd, "email").toLowerCase();
    if (!rateLimit(`forgot:${await clientIp()}`, 5, 3600_000).ok) return fail("Too many requests. Please try again later.");
    const user = await db.user.findUnique({ where: { email } });
    let devLink: string | undefined;
    if (user) {
      const token = await issueToken(user.id, "PASSWORD_RESET", 1);
      devLink = appUrl(`/reset-password/${token}`);
      await sendSystemEmail(user.email, "Reset your Hirely password", `Hi ${user.name}\n\nUse this link to set a new password (valid for 1 hour):\n${devLink}\n\nIf you didn't request this, you can ignore this email.`);
    }
    // Same response whether or not the account exists (no user enumeration).
    return ok("If an account exists for this email, we've sent a link to reset the password.", isMockEmail() && devLink ? { data: { devLink } } : {});
  } catch (e) {
    return toActionError(e);
  }
}

export async function resetPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const token = str(fd, "token");
    const password = String(fd.get("password") ?? "");
    const issue = passwordIssues(password);
    if (issue) return fail(issue);
    const rec = await db.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (!rec || rec.type !== "PASSWORD_RESET" || rec.usedAt || rec.expiresAt < new Date()) return fail("This reset link is invalid or has expired. Please request a new one.");
    await db.$transaction([
      db.user.update({ where: { id: rec.userId }, data: { passwordHash: await hashPassword(password) } }),
      db.verificationToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
      db.session.deleteMany({ where: { userId: rec.userId } }),
    ]);
    return ok("Your password has been updated. You can now sign in.", { redirect: "/login?reset=1" });
  } catch (e) {
    return toActionError(e);
  }
}

export async function resendVerification(): Promise<ActionState> {
  try {
    const s = await requireUser();
    if (s.user.emailVerifiedAt) return ok("Your email is already verified.");
    if (!rateLimit(`resend:${s.userId}`, 3, 3600_000).ok) return fail("Please wait before requesting another email.");
    const link = await sendVerificationEmail(s.userId);
    return ok(`Verification email sent to ${s.user.email}.`, isMockEmail() ? { data: { devLink: link } } : {});
  } catch (e) {
    return toActionError(e);
  }
}

export async function acceptInvite(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const token = str(fd, "token");
    const inv = await db.invitation.findUnique({ where: { tokenHash: sha256(token) }, include: { org: true } });
    if (!inv || inv.acceptedAt || inv.revokedAt || inv.expiresAt < new Date()) return fail("This invitation is invalid or has expired. Ask your administrator for a new one.");
    let user = await db.user.findUnique({ where: { email: inv.email } });
    if (!user) {
      const name = str(fd, "name");
      const password = String(fd.get("password") ?? "");
      if (name.length < 2) return fail("Please enter your name.");
      const issue = passwordIssues(password);
      if (issue) return fail(issue);
      user = await db.user.create({ data: { email: inv.email, name, passwordHash: await hashPassword(password), emailVerifiedAt: new Date() } });
    } else {
      const s = await getSession();
      if (!s || s.userId !== user.id) return fail("An account with this email exists. Sign in first, then open the invitation link again.");
    }
    await db.membership.upsert({ where: { userId_orgId: { userId: user.id, orgId: inv.orgId } }, create: { userId: user.id, orgId: inv.orgId, role: inv.role }, update: {} });
    await db.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
    await audit(inv.orgId, { type: "USER", id: user.id, name: user.name }, "user.joined", { type: "User", id: user.id, label: user.email }, { role: inv.role });
    const s = await getSession();
    if (s?.userId === user.id) await db.session.update({ where: { id: s.id }, data: { activeOrgId: inv.orgId } });
    else await createSession(user.id, { twoFactorVerified: !user.totpEnabled, orgId: inv.orgId });
  } catch (e) {
    return toActionError(e);
  }
  redirect("/app");
}

export async function switchOrganization(fd: FormData) {
  const s = await requireUser();
  const orgId = str(fd, "orgId");
  const m = await db.membership.findUnique({ where: { userId_orgId: { userId: s.userId, orgId } } });
  if (m) await db.session.update({ where: { id: s.id }, data: { activeOrgId: orgId } });
  redirect("/app");
}

// ── 2FA management ──

export async function startTotpSetup(): Promise<ActionState> {
  try {
    const s = await requireUser();
    const secret = generateTotpSecret();
    await db.user.update({ where: { id: s.userId }, data: { totpSecretEnc: encrypt(secret), totpEnabled: false } });
    const qr = await QRCode.toDataURL(otpauthUrl(secret, s.user.email), { margin: 1, width: 200 });
    return ok(undefined, { data: { qr, secret } });
  } catch (e) {
    return toActionError(e);
  }
}

export async function confirmTotpSetup(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const s = await requireUser();
    const user = await db.user.findUniqueOrThrow({ where: { id: s.userId } });
    if (!user.totpSecretEnc) return fail("Start the setup first.");
    if (!verifyTotp(decrypt(user.totpSecretEnc), str(fd, "code"))) return fail("The code is not valid. Make sure your device time is correct.");
    const codes = Array.from({ length: 8 }, () => randomToken(6).toUpperCase().replace(/[^A-Z0-9]/g, "X").slice(0, 10));
    await db.user.update({ where: { id: user.id }, data: { totpEnabled: true, recoveryCodes: codes.map((c) => sha256(c)) } });
    await db.session.update({ where: { id: s.id }, data: { twoFactorVerified: true } });
    return ok("Two-factor authentication is now enabled.", { data: { recoveryCodes: codes } });
  } catch (e) {
    return toActionError(e);
  }
}

export async function disableTotp(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const s = await requireUser();
    const user = await db.user.findUniqueOrThrow({ where: { id: s.userId } });
    if (!(await verifyPassword(String(fd.get("password") ?? ""), user.passwordHash))) return fail("Password is incorrect.");
    await db.user.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecretEnc: null, recoveryCodes: [] } });
    return ok("Two-factor authentication has been disabled.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function changePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const s = await requireUser();
    const user = await db.user.findUniqueOrThrow({ where: { id: s.userId } });
    if (!(await verifyPassword(String(fd.get("current") ?? ""), user.passwordHash))) return fail("Current password is incorrect.");
    const next = String(fd.get("password") ?? "");
    const issue = passwordIssues(next);
    if (issue) return fail(issue);
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
    const jar = await cookies();
    const current = jar.get(SESSION_COOKIE)?.value;
    await db.session.deleteMany({ where: { userId: user.id, NOT: { tokenHash: sha256(current ?? "") } } });
    return ok("Password updated. Other sessions were signed out.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const s = await requireUser();
    const name = str(fd, "name");
    if (name.length < 2) return fail("Please enter your name.");
    const locale = ["en", "de", "fr", "it"].includes(str(fd, "locale")) ? str(fd, "locale") : "en";
    await db.user.update({ where: { id: s.userId }, data: { name, title: str(fd, "title") || null, locale } });
    return ok("Profile saved.");
  } catch (e) {
    return toActionError(e);
  }
}
