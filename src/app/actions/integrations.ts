"use server";

import { db } from "@/lib/db";
import { audit, userActor } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/session";
import { encrypt, randomToken, sha256 } from "@/lib/crypto";
import { ATS_ADAPTERS } from "@/lib/providers/ats";
import { getMessageProvider } from "@/lib/providers/messaging";
import { OAUTH_CONFIG } from "@/lib/providers/calendar";
import { syncIntegration } from "@/lib/services/ats-sync";
import { fail, ok, str, toActionError, type ActionState } from "@/lib/action-state";

const KINDS = ["ATS", "CALENDAR", "EMAIL", "PHONE", "SMS"] as const;

export async function connectIntegration(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("integrations.manage");
    const kind = str(fd, "kind") as (typeof KINDS)[number];
    const provider = str(fd, "provider");
    if (!KINDS.includes(kind)) return fail("Unknown integration type.");
    const demo = str(fd, "mode") === "demo";
    let secrets: Record<string, string> = {};
    if (kind === "ATS") {
      const adapter = ATS_ADAPTERS[provider];
      if (!adapter) return fail("Unknown ATS.");
      if (!demo) {
        for (const f of adapter.authFields) {
          const v = str(fd, f.key);
          if (!v) return fail(`${f.label} is required.`);
          if (f.type === "url" && !/^https:\/\//.test(v)) return fail(`${f.label} must be an https:// URL.`);
          secrets[f.key] = v;
        }
      } else secrets = { mode: "demo" };
    } else if (kind === "PHONE" && provider === "twilio" && !demo) {
      secrets = { accountSid: str(fd, "accountSid"), authToken: str(fd, "authToken"), fromNumber: str(fd, "fromNumber") };
      if (!/^AC[0-9a-f]{32}$/i.test(secrets.accountSid)) return fail("Account SID must look like AC… (34 characters).");
      if (!/^\+\d{8,15}$/.test(secrets.fromNumber)) return fail("From number must be in E.164 format, e.g. +41445551234.");
      if (secrets.authToken.length < 16) return fail("Auth token looks too short.");
    } else if (kind === "CALENDAR" && !demo) {
      const cfg = OAUTH_CONFIG[provider as "google" | "microsoft"];
      if (!cfg?.clientId()) return fail(`${provider === "google" ? "Google" : "Microsoft"} OAuth is not configured on this server (missing client ID). Use demo mode or add credentials to the environment.`);
      return ok(undefined, { redirect: `/api/integrations/oauth/${provider}/start` });
    } else secrets = { mode: "demo" };

    const webhookSecret = kind === "ATS" ? encrypt(randomToken(24)) : undefined;
    const integ = await db.integration.upsert({
      where: { orgId_kind_provider: { orgId: ctx.orgId, kind, provider } },
      create: { orgId: ctx.orgId, kind, provider, status: "CONNECTED", secretsEnc: encrypt(JSON.stringify(secrets)), webhookSecret, config: { demo, connectedBy: ctx.user.name } },
      update: { status: "CONNECTED", secretsEnc: encrypt(JSON.stringify(secrets)), lastError: null, config: { demo, connectedBy: ctx.user.name } },
    });
    if (kind === "ATS" && !integ.webhookSecret) await db.integration.update({ where: { id: integ.id }, data: { webhookSecret: encrypt(randomToken(24)) } });
    await audit(ctx.orgId, userActor(ctx.user), "integration.connected", { type: "Integration", id: integ.id, label: `${kind} · ${provider}` }, { demo });
    if (kind === "ATS") {
      const r = await syncIntegration(integ.id, userActor(ctx.user));
      return r.ok ? ok(`Connected. ${r.message}`) : fail(`Connected, but the first sync failed: ${r.error}`);
    }
    return ok("Connected.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function disconnectIntegration(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("integrations.manage");
    const integ = await db.integration.findFirst({ where: { id: str(fd, "id"), orgId: ctx.orgId } });
    if (!integ) return fail("Not found.");
    await db.integration.update({ where: { id: integ.id }, data: { status: "DISCONNECTED", secretsEnc: null } });
    await audit(ctx.orgId, userActor(ctx.user), "integration.disconnected", { type: "Integration", id: integ.id, label: `${integ.kind} · ${integ.provider}` });
    return ok("Disconnected. Stored credentials were deleted.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function syncNow(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("integrations.manage");
    const integ = await db.integration.findFirst({ where: { id: str(fd, "id"), orgId: ctx.orgId, kind: "ATS" } });
    if (!integ) return fail("Not found.");
    const r = await syncIntegration(integ.id, userActor(ctx.user));
    return r.ok ? ok(r.message) : fail(`${r.error} ${r.retryable ? "Hirely will retry automatically." : "Check the credentials."}`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function sendTestEmail(): Promise<ActionState> {
  try {
    const ctx = await requirePermission("integrations.manage");
    const p = getMessageProvider("EMAIL");
    const r = await p.send({ to: ctx.user.email, subject: "Hirely test email", body: `This is a test email from Hirely (${p.name}).` });
    return r.ok ? ok(`Test email sent to ${ctx.user.email} via ${p.name}.`) : fail(`Email failed: ${r.error}`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function createApiKey(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("integrations.manage");
    const name = str(fd, "name") || "API key";
    const scopes = ["applications:write", "jobs:read"].filter((s) => fd.get(s) === "on");
    if (!scopes.length) return fail("Select at least one scope.");
    const secret = `hly_${randomToken(24)}`;
    await db.apiKey.create({ data: { orgId: ctx.orgId, name, prefix: secret.slice(0, 10), keyHash: sha256(secret), scopes, createdById: ctx.user.id } });
    await audit(ctx.orgId, userActor(ctx.user), "apikey.created", { type: "ApiKey", label: name }, { scopes });
    return ok("API key created. Copy it now — it won't be shown again.", { data: { secret } });
  } catch (e) {
    return toActionError(e);
  }
}

export async function revokeApiKey(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("integrations.manage");
    const k = await db.apiKey.findFirst({ where: { id: str(fd, "id"), orgId: ctx.orgId } });
    if (!k) return fail("Not found.");
    await db.apiKey.update({ where: { id: k.id }, data: { revokedAt: new Date() } });
    await audit(ctx.orgId, userActor(ctx.user), "apikey.revoked", { type: "ApiKey", id: k.id, label: k.name });
    return ok("API key revoked.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function rotateWebhookSecret(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("integrations.manage");
    const integ = await db.integration.findFirst({ where: { id: str(fd, "id"), orgId: ctx.orgId } });
    if (!integ) return fail("Not found.");
    await db.integration.update({ where: { id: integ.id }, data: { webhookSecret: encrypt(randomToken(24)) } });
    return ok("Webhook secret rotated. Update it in your ATS.");
  } catch (e) {
    return toActionError(e);
  }
}
