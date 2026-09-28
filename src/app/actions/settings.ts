"use server";

import { z } from "zod";
import type { Role } from "@prisma/client";
import { addDays, addMonths, addYears } from "date-fns";
import { db } from "@/lib/db";
import { audit, userActor } from "@/lib/audit";
import { requirePermission, getContext } from "@/lib/auth/session";
import { assignableRoles, ROLE_LABELS } from "@/lib/auth/rbac";
import { randomToken, sha256 } from "@/lib/crypto";
import { getMessageProvider } from "@/lib/providers/messaging";
import { appUrl } from "@/lib/services/communication";
import { planById, PLANS, VAT_RATE } from "@/lib/billing";
import { exportCandidateData, anonymizeCandidate, retentionSweep } from "@/lib/services/privacy";
import { enqueue } from "@/lib/queue";
import { fail, ok, str, toActionError, type ActionState } from "@/lib/action-state";

export async function updateCompany(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("settings.manage");
    const d = z
      .object({
        name: z.string().min(2).max(120),
        industry: z.string().max(80).optional(),
        companySize: z.string().max(20).optional(),
        language: z.enum(["de", "en", "fr", "it"]),
        website: z.string().url().or(z.literal("")).optional(),
        brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Brand color must be a hex color like #1F3A8A"),
        description: z.string().max(3000).optional(),
        values: z.string().max(2000).optional(),
        tone: z.string().max(40),
      })
      .parse({ name: str(fd, "name"), industry: str(fd, "industry"), companySize: str(fd, "companySize"), language: str(fd, "language"), website: str(fd, "website"), brandColor: str(fd, "brandColor"), description: str(fd, "description"), values: str(fd, "values"), tone: str(fd, "tone") });
    const settings = { ...(ctx.org.settings as object), officeAddress: str(fd, "officeAddress") };
    await db.organization.update({ where: { id: ctx.orgId }, data: { ...d, website: d.website || null, settings, careerPageEnabled: fd.get("careerPageEnabled") === "on" } });
    await audit(ctx.orgId, userActor(ctx.user), "settings.changed", { type: "Organization", id: ctx.orgId, label: "Company settings" });
    return ok("Company settings saved.");
  } catch (e) {
    return toActionError(e);
  }
}

/** Generic JSON settings sections (ai, voice, communication, privacy). */
export async function updateSettingsSection(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const section = z.enum(["ai", "voice", "communication", "privacy"]).parse(str(fd, "section"));
    const ctx = await requirePermission(section === "privacy" ? "privacy.manage" : "settings.manage");
    const values: Record<string, unknown> = {};
    for (const [k, v] of fd.entries()) {
      if (k === "section" || k.startsWith("$ACTION")) continue;
      values[k] = v === "on" ? true : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : v;
    }
    // Unchecked checkboxes are absent from FormData.
    for (const k of str(fd, "__booleans").split(",").filter(Boolean)) if (!(k in values)) values[k] = false;
    delete values.__booleans;
    const settings = ctx.org.settings as Record<string, unknown>;
    const top: Record<string, unknown> = {};
    if (section === "privacy") {
      const days = Number(values.retentionDays);
      if (!Number.isFinite(days) || days < 30 || days > 3650) return fail("Retention period must be between 30 and 3650 days.");
      top.retentionDays = days;
      top.talentPoolRetentionDays = Number(values.talentPoolRetentionDays) || 730;
    }
    await db.organization.update({ where: { id: ctx.orgId }, data: { settings: { ...settings, ...top, [section]: { ...((settings[section] as object) ?? {}), ...values } } as object } });
    await audit(ctx.orgId, userActor(ctx.user), "settings.changed", { type: "Organization", id: ctx.orgId, label: `${section} settings` }, { values });
    return ok("Settings saved.");
  } catch (e) {
    return toActionError(e);
  }
}

// ─────────── Users & roles ───────────

export async function inviteMember(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("users.manage");
    const email = z.string().email("Enter a valid email.").parse(str(fd, "email").toLowerCase());
    const role = str(fd, "role") as Role;
    if (!assignableRoles(ctx.role).includes(role)) return fail("You can't assign this role.");
    const existingUser = await db.user.findUnique({ where: { email }, include: { memberships: { where: { orgId: ctx.orgId } } } });
    if (existingUser?.memberships.length) return fail("This person is already a member.");
    const sub = await db.subscription.findUnique({ where: { orgId: ctx.orgId } });
    const seats = planById(sub?.plan ?? "GROWTH").seats;
    const used = (await db.membership.count({ where: { orgId: ctx.orgId } })) + (await db.invitation.count({ where: { orgId: ctx.orgId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }));
    if (seats && used >= seats) return fail(`Your plan includes ${seats} users. Upgrade your plan to invite more team members.`);
    const token = randomToken(24);
    await db.invitation.create({ data: { orgId: ctx.orgId, email, role, tokenHash: sha256(token), invitedById: ctx.user.id, expiresAt: addDays(new Date(), 7) } });
    const link = appUrl(`/invite/${token}`);
    const r = await getMessageProvider("EMAIL").send({ to: email, subject: `${ctx.user.name} invited you to ${ctx.org.name} on Hirely`, body: `Hi\n\n${ctx.user.name} invited you to join ${ctx.org.name} on Hirely as ${ROLE_LABELS[role]}.\n\nAccept the invitation (valid 7 days):\n${link}` });
    await audit(ctx.orgId, userActor(ctx.user), "user.invited", { type: "Invitation", label: email }, { role });
    if (!r.ok) return fail(`Invitation created but the email failed: ${r.error}. Share this link manually: ${link}`);
    return ok(`Invitation sent to ${email}.`, getMessageProvider("EMAIL").name === "mock-email" ? { data: { devLink: link } } : {});
  } catch (e) {
    return toActionError(e);
  }
}

export async function changeMemberRole(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("users.manage");
    const m = await db.membership.findFirst({ where: { id: str(fd, "membershipId"), orgId: ctx.orgId }, include: { user: true } });
    if (!m) return fail("Member not found.");
    const role = str(fd, "role") as Role;
    if (!assignableRoles(ctx.role).includes(role) || (m.role === "OWNER" && ctx.role !== "OWNER")) return fail("You can't change this role.");
    if (m.role === "OWNER" && role !== "OWNER" && (await db.membership.count({ where: { orgId: ctx.orgId, role: "OWNER" } })) < 2) return fail("The organization needs at least one owner.");
    await db.membership.update({ where: { id: m.id }, data: { role } });
    await audit(ctx.orgId, userActor(ctx.user), "user.role_changed", { type: "User", id: m.userId, label: m.user.email }, { from: m.role, to: role });
    return ok(`${m.user.name} is now ${ROLE_LABELS[role]}.`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function removeMember(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("users.manage");
    const m = await db.membership.findFirst({ where: { id: str(fd, "membershipId"), orgId: ctx.orgId }, include: { user: true } });
    if (!m) return fail("Member not found.");
    if (m.userId === ctx.user.id) return fail("You can't remove yourself.");
    if (m.role === "OWNER" && ctx.role !== "OWNER") return fail("Only owners can remove owners.");
    await db.membership.delete({ where: { id: m.id } });
    await db.session.updateMany({ where: { userId: m.userId, activeOrgId: ctx.orgId }, data: { activeOrgId: null } });
    await audit(ctx.orgId, userActor(ctx.user), "user.removed", { type: "User", id: m.userId, label: m.user.email });
    return ok(`${m.user.name} was removed.`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function revokeInvitation(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("users.manage");
    await db.invitation.updateMany({ where: { id: str(fd, "id"), orgId: ctx.orgId }, data: { revokedAt: new Date() } });
    return ok("Invitation revoked.");
  } catch (e) {
    return toActionError(e);
  }
}

// ─────────── Billing ───────────

async function issueInvoice(orgId: string, lines: { label: string; cents: number }[], paid: boolean) {
  const subtotal = lines.reduce((s, l) => s + l.cents, 0);
  const tax = Math.round(subtotal * VAT_RATE);
  const count = await db.invoice.count({ where: { orgId } });
  const now = new Date();
  return db.invoice.create({
    data: { orgId, number: `HRL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${randomToken(3).toUpperCase().replace(/[^A-Z0-9]/g, "X")}${count}`, periodStart: now, periodEnd: addMonths(now, 1), status: paid ? "PAID" : "OPEN", subtotalCents: subtotal, taxCents: tax, totalCents: subtotal + tax, lines, paidAt: paid ? now : null },
  });
}

export async function changePlan(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("billing.manage");
    const planId = str(fd, "plan");
    const interval = str(fd, "interval") === "ANNUAL" ? "ANNUAL" : "MONTHLY";
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) return fail("Unknown plan.");
    if (plan.id === "ENTERPRISE") return ok("Thanks! Our team will contact you within one business day to set up Enterprise.", { redirect: "/demo" });
    const sub = await db.subscription.findUniqueOrThrow({ where: { orgId: ctx.orgId } });
    const current = planById(sub.plan);
    const rank = (id: string) => PLANS.findIndex((p) => p.id === id);
    if (process.env.BILLING_PROVIDER === "stripe" && process.env.STRIPE_SECRET_KEY) {
      return fail("Plan changes are processed in the Stripe customer portal. Please use “Manage payment method”.");
    }
    if (!sub.paymentMethod && sub.status === "TRIALING" && rank(plan.id) >= 0) {
      // Trial users can pick a plan; billing starts at trial end once a payment method exists.
    }
    if (rank(plan.id) < rank(current.id) && sub.status === "ACTIVE") {
      const members = await db.membership.count({ where: { orgId: ctx.orgId } });
      if (plan.seats && members > plan.seats) return fail(`The ${plan.name} plan includes ${plan.seats} users — remove ${members - plan.seats} member(s) first.`);
      await db.subscription.update({ where: { orgId: ctx.orgId }, data: { scheduledPlan: plan.id } });
      await audit(ctx.orgId, userActor(ctx.user), "billing.plan_changed", { type: "Subscription", label: `${current.name} → ${plan.name}` }, { scheduled: true });
      return ok(`Downgrade to ${plan.name} scheduled for the end of the current period.`);
    }
    const periodEnd = interval === "ANNUAL" ? addYears(new Date(), 1) : addMonths(new Date(), 1);
    await db.subscription.update({ where: { orgId: ctx.orgId }, data: { plan: plan.id, interval, status: sub.paymentMethod ? "ACTIVE" : sub.status, scheduledPlan: null, seats: plan.seats ?? 999, ...(sub.status === "ACTIVE" || sub.paymentMethod ? { currentPeriodStart: new Date(), currentPeriodEnd: periodEnd } : {}) } });
    if (sub.paymentMethod) {
      const monthly = (interval === "ANNUAL" ? plan.annualMonthlyCents : plan.monthlyCents) ?? 0;
      await issueInvoice(ctx.orgId, [{ label: `Hirely ${plan.name} — ${interval === "ANNUAL" ? "annual (12 months)" : "monthly"}`, cents: interval === "ANNUAL" ? monthly * 12 : monthly }], true);
    }
    await audit(ctx.orgId, userActor(ctx.user), "billing.plan_changed", { type: "Subscription", label: `${current.name} → ${plan.name}` }, { interval });
    return ok(sub.paymentMethod ? `You're now on ${plan.name} (${interval.toLowerCase()}). An invoice was issued.` : `${plan.name} selected. Add a payment method to activate it after your trial.`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function updatePaymentMethod(): Promise<ActionState> {
  try {
    const ctx = await requirePermission("billing.manage");
    if (process.env.BILLING_PROVIDER === "stripe" && process.env.STRIPE_SECRET_KEY) {
      const sub = await db.subscription.findUniqueOrThrow({ where: { orgId: ctx.orgId } });
      const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
        body: new URLSearchParams({ customer: sub.providerCustomerId ?? "", return_url: appUrl("/app/settings/billing") }),
      });
      const data = (await res.json()) as { url?: string; error?: { message: string } };
      if (!res.ok || !data.url) return fail(`Stripe: ${data.error?.message ?? "could not open the billing portal"}`);
      return ok(undefined, { redirect: data.url });
    }
    // Mock billing provider: attaches a test card so the full billing flow can be demonstrated.
    const sub = await db.subscription.update({ where: { orgId: ctx.orgId }, data: { paymentMethod: { type: "card", brand: "Visa", last4: "4242", expMonth: 12, expYear: new Date().getFullYear() + 3, test: true }, status: "ACTIVE", trialEndsAt: null } });
    if (!(await db.invoice.count({ where: { orgId: ctx.orgId } }))) {
      const plan = planById(sub.plan);
      await issueInvoice(ctx.orgId, [{ label: `Hirely ${plan.name} — monthly`, cents: plan.monthlyCents ?? 0 }], true);
    }
    await audit(ctx.orgId, userActor(ctx.user), "billing.payment_method", { type: "Subscription", label: "Test card ••4242" });
    return ok("Payment method saved (test card — mock billing provider). Your subscription is active.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function setUsageLimit(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("billing.manage");
    const metric = z.enum(["VOICE_MINUTES", "SMS", "VIDEO_INTERVIEWS", "CV_ANALYSES"]).parse(str(fd, "metric"));
    const limit = Number(str(fd, "limit"));
    if (!Number.isFinite(limit) || limit < 0) return fail("Enter a valid limit.");
    const sub = await db.subscription.findUniqueOrThrow({ where: { orgId: ctx.orgId } });
    const limits = (sub.usageLimits ?? {}) as Record<string, object>;
    await db.subscription.update({ where: { orgId: ctx.orgId }, data: { usageLimits: { ...limits, [metric]: { limit, enforce: fd.get("enforce") === "on" } } } });
    await audit(ctx.orgId, userActor(ctx.user), "settings.changed", { type: "Subscription", label: `Usage limit ${metric}` }, { limit, enforce: fd.get("enforce") === "on" });
    return ok("Usage limit saved.");
  } catch (e) {
    return toActionError(e);
  }
}

// ─────────── Personal settings ───────────

export async function saveAvailability(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await getContext();
    const slots = z.array(z.object({ weekday: z.number().int().min(0).max(6), startMinute: z.number().int().min(0).max(1439), endMinute: z.number().int().min(1).max(1440) })).max(50).parse(JSON.parse(str(fd, "slots") || "[]"));
    if (slots.some((s) => s.endMinute <= s.startMinute)) return fail("Each time window must end after it starts.");
    await db.$transaction([
      db.recruiterAvailability.deleteMany({ where: { orgId: ctx.orgId, userId: ctx.user.id } }),
      db.recruiterAvailability.createMany({ data: slots.map((s) => ({ ...s, orgId: ctx.orgId, userId: ctx.user.id })) }),
    ]);
    return ok("Availability saved. Scheduling pages use it immediately.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function saveNotificationPrefs(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await getContext();
    const types = str(fd, "types").split(",").filter(Boolean);
    const prefs = Object.fromEntries(types.map((t) => [t, fd.get(t) === "on"]));
    await db.membership.update({ where: { id: ctx.membership.id }, data: { notifyPrefs: prefs } });
    return ok("Notification preferences saved.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateImplementationTask(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("settings.manage");
    const status = z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]).parse(str(fd, "status"));
    await db.implementationTask.updateMany({ where: { id: str(fd, "id"), orgId: ctx.orgId }, data: { status, owner: str(fd, "owner") || undefined, notes: str(fd, "notes") || undefined } });
    return ok("Updated.");
  } catch (e) {
    return toActionError(e);
  }
}

// ─────────── Privacy ───────────

export async function handleDataRequest(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("privacy.manage");
    const req = await db.dataRequest.findFirst({ where: { id: str(fd, "id"), orgId: ctx.orgId } });
    if (!req) return fail("Request not found.");
    const op = str(fd, "op");
    const cand = req.candidateId ? await db.candidate.findFirst({ where: { id: req.candidateId, orgId: ctx.orgId } }) : await db.candidate.findFirst({ where: { orgId: ctx.orgId, email: req.candidateEmail.toLowerCase(), anonymizedAt: null } });
    if (op === "reject") {
      await db.dataRequest.update({ where: { id: req.id }, data: { status: "REJECTED", handledById: ctx.user.id, completedAt: new Date(), note: str(fd, "note") || req.note } });
      return ok("Request closed.");
    }
    if (!cand) return fail(`No candidate with the email ${req.candidateEmail} exists — close the request with “No data held”.`);
    if (req.type === "DELETION") await anonymizeCandidate(ctx.orgId, cand.id, userActor(ctx.user), "Data subject deletion request");
    else await exportCandidateData(ctx.orgId, cand.id, userActor(ctx.user));
    await db.dataRequest.update({ where: { id: req.id }, data: { status: "COMPLETED", candidateId: cand.id, handledById: ctx.user.id, completedAt: new Date() } });
    await audit(ctx.orgId, userActor(ctx.user), "privacy.request", { type: "DataRequest", id: req.id, label: `${req.type} · ${req.candidateEmail}` });
    return ok(req.type === "DELETION" ? "Data deleted and request completed." : "Export generated — download it from the candidate profile and send it to the candidate.", req.type === "EXPORT" ? { redirect: `/api/candidates/${cand.id}/export` } : {});
  } catch (e) {
    return toActionError(e);
  }
}

export async function createDataRequest(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("privacy.manage");
    const email = z.string().email().parse(str(fd, "email").toLowerCase());
    const type = z.enum(["EXPORT", "DELETION", "ACCESS"]).parse(str(fd, "type"));
    await db.dataRequest.create({ data: { orgId: ctx.orgId, candidateEmail: email, type, note: str(fd, "note") || null } });
    return ok("Request logged. Complete it within 30 days.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function runRetentionNow(): Promise<ActionState> {
  try {
    const ctx = await requirePermission("privacy.manage");
    const n = await retentionSweep(ctx.orgId);
    await audit(ctx.orgId, userActor(ctx.user), "privacy.retention_sweep", { type: "Organization", id: ctx.orgId }, { anonymized: n });
    return ok(n ? `${n} candidate record(s) past their retention period were anonymized.` : "No candidates are past their retention period.");
  } catch (e) {
    return toActionError(e);
  }
}

// ─────────── System ───────────

export async function retryBackgroundJob(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("settings.manage");
    const job = await db.backgroundJob.findFirst({ where: { id: str(fd, "id"), orgId: ctx.orgId, status: "FAILED" } });
    if (!job) return fail("Job not found.");
    await db.backgroundJob.update({ where: { id: job.id }, data: { status: "DONE" } });
    await enqueue(job.type, job.payload as Record<string, unknown>, { orgId: ctx.orgId });
    return ok("Job re-queued.");
  } catch (e) {
    return toActionError(e);
  }
}
