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
    if (!KINDS.includes(kind)) return fail("Unbekannte Integrationsart.");
    const demo = str(fd, "mode") === "demo";
    let secrets: Record<string, string> = {};
    if (kind === "ATS") {
      const adapter = ATS_ADAPTERS[provider];
      if (!adapter) return fail("Unbekanntes ATS.");
      if (!demo) {
        for (const f of adapter.authFields) {
          const v = str(fd, f.key);
          if (!v) return fail(`${f.label} fehlt.`);
          if (f.type === "url" && !/^https:\/\//.test(v)) return fail(`${f.label} muss eine https://-Adresse sein.`);
          secrets[f.key] = v;
        }
      } else secrets = { mode: "demo" };
    } else if (kind === "PHONE" && provider === "twilio" && !demo) {
      secrets = { accountSid: str(fd, "accountSid"), authToken: str(fd, "authToken"), fromNumber: str(fd, "fromNumber") };
      if (!/^AC[0-9a-f]{32}$/i.test(secrets.accountSid)) return fail("Die Account SID muss wie AC… aussehen (34 Zeichen).");
      if (!/^\+\d{8,15}$/.test(secrets.fromNumber)) return fail("Die Absendernummer muss im Format E.164 sein, z. B. +41445551234.");
      if (secrets.authToken.length < 16) return fail("Der Auth Token ist zu kurz.");
    } else if (kind === "CALENDAR" && !demo) {
      const cfg = OAUTH_CONFIG[provider as "google" | "microsoft"];
      if (!cfg?.clientId()) return fail(`${provider === "google" ? "Google" : "Microsoft"} OAuth ist auf diesem Server nicht eingerichtet (Client-ID fehlt). Nutzen Sie den Demo-Modus oder hinterlegen Sie die Zugangsdaten.`);
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
      return r.ok ? ok(`Verbunden. ${r.message}`) : fail(`Verbunden, aber die erste Synchronisation ist fehlgeschlagen: ${r.error}`);
    }
    return ok("Verbunden.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function disconnectIntegration(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("integrations.manage");
    const integ = await db.integration.findFirst({ where: { id: str(fd, "id"), orgId: ctx.orgId } });
    if (!integ) return fail("Nicht gefunden.");
    await db.integration.update({ where: { id: integ.id }, data: { status: "DISCONNECTED", secretsEnc: null } });
    await audit(ctx.orgId, userActor(ctx.user), "integration.disconnected", { type: "Integration", id: integ.id, label: `${integ.kind} · ${integ.provider}` });
    return ok("Getrennt. Gespeicherte Zugangsdaten wurden gelöscht.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function syncNow(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("integrations.manage");
    const integ = await db.integration.findFirst({ where: { id: str(fd, "id"), orgId: ctx.orgId, kind: "ATS" } });
    if (!integ) return fail("Nicht gefunden.");
    const r = await syncIntegration(integ.id, userActor(ctx.user));
    return r.ok ? ok(r.message) : fail(`${r.error} ${r.retryable ? "Recruit24 versucht es automatisch erneut." : "Bitte Zugangsdaten prüfen."}`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function sendTestEmail(): Promise<ActionState> {
  try {
    const ctx = await requirePermission("integrations.manage");
    const p = getMessageProvider("EMAIL");
    const r = await p.send({ to: ctx.user.email, subject: "Recruit24 Test-E-Mail", body: `Dies ist eine Test-E-Mail von Recruit24 (${p.name}).` });
    return r.ok ? ok(`Test-E-Mail an ${ctx.user.email} gesendet (über ${p.name}).`) : fail(`E-Mail fehlgeschlagen: ${r.error}`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function createApiKey(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("integrations.manage");
    const name = str(fd, "name") || "API key";
    const scopes = ["applications:write", "jobs:read"].filter((s) => fd.get(s) === "on");
    if (!scopes.length) return fail("Bitte mindestens eine Berechtigung wählen.");
    const secret = `hly_${randomToken(24)}`;
    await db.apiKey.create({ data: { orgId: ctx.orgId, name, prefix: secret.slice(0, 10), keyHash: sha256(secret), scopes, createdById: ctx.user.id } });
    await audit(ctx.orgId, userActor(ctx.user), "apikey.created", { type: "ApiKey", label: name }, { scopes });
    return ok("API-Schlüssel erstellt. Jetzt kopieren – er wird nicht mehr angezeigt.", { data: { secret } });
  } catch (e) {
    return toActionError(e);
  }
}

export async function revokeApiKey(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("integrations.manage");
    const k = await db.apiKey.findFirst({ where: { id: str(fd, "id"), orgId: ctx.orgId } });
    if (!k) return fail("Nicht gefunden.");
    await db.apiKey.update({ where: { id: k.id }, data: { revokedAt: new Date() } });
    await audit(ctx.orgId, userActor(ctx.user), "apikey.revoked", { type: "ApiKey", id: k.id, label: k.name });
    return ok("API-Schlüssel widerrufen.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function rotateWebhookSecret(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("integrations.manage");
    const integ = await db.integration.findFirst({ where: { id: str(fd, "id"), orgId: ctx.orgId } });
    if (!integ) return fail("Nicht gefunden.");
    await db.integration.update({ where: { id: integ.id }, data: { webhookSecret: encrypt(randomToken(24)) } });
    return ok("Webhook-Schlüssel erneuert. Bitte im ATS aktualisieren.");
  } catch (e) {
    return toActionError(e);
  }
}
