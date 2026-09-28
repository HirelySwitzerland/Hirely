import { db } from "@/lib/db";
import { audit, type Actor } from "@/lib/audit";
import { decrypt } from "@/lib/crypto";
import { ATS_ADAPTERS, AtsError, type NormalizedApplication } from "@/lib/providers/ats";
import { notify } from "./notifications";
import { ingestApplication } from "./pipeline";

/** Matches an incoming ATS application to a Hirely job by external id, then by title. */
async function matchJob(orgId: string, a: NormalizedApplication) {
  if (a.jobExternalId) {
    const j = await db.job.findFirst({ where: { orgId, externalId: a.jobExternalId } });
    if (j) return j;
  }
  if (a.jobTitle) {
    const jobs = await db.job.findMany({ where: { orgId, status: "OPEN" } });
    const t = a.jobTitle.toLowerCase();
    return jobs.find((j) => j.title.toLowerCase() === t) ?? jobs.find((j) => t.includes(j.title.toLowerCase()) || j.title.toLowerCase().includes(t)) ?? null;
  }
  return null;
}

export async function ingestNormalized(orgId: string, provider: string, apps: NormalizedApplication[], actor: Actor) {
  let created = 0;
  const skipped: string[] = [];
  for (const a of apps) {
    const job = await matchJob(orgId, a);
    if (!job) {
      skipped.push(`${a.firstName} ${a.lastName}: no matching open job for "${a.jobTitle ?? a.jobExternalId}"`);
      continue;
    }
    const r = await ingestApplication({
      orgId,
      jobId: job.id,
      source: "ATS",
      sourceDetail: `${ATS_ADAPTERS[provider]?.label ?? provider} · ${a.sourceDetail ?? ""}`.replace(/ · $/, ""),
      externalId: a.externalId,
      candidate: { firstName: a.firstName, lastName: a.lastName, email: a.email, phone: a.phone, location: a.location },
      cv: a.cvText ? { text: a.cvText, filename: `CV_${a.lastName}.txt` } : undefined,
      consents: { processing: true },
      actor,
      appliedAt: a.appliedAt,
    });
    if (!r.duplicate) created++;
  }
  return { created, skipped };
}

export async function syncIntegration(integrationId: string, actor: Actor = { type: "INTEGRATION" }) {
  const integ = await db.integration.findUniqueOrThrow({ where: { id: integrationId } });
  const adapter = ATS_ADAPTERS[integ.provider];
  if (!adapter) throw new Error(`Unknown ATS provider ${integ.provider}`);
  const creds = integ.secretsEnc ? (JSON.parse(decrypt(integ.secretsEnc)) as Record<string, string>) : { mode: "demo" };
  try {
    const apps = await adapter.fetchApplications(creds, integ.lastSyncAt);
    const { created, skipped } = await ingestNormalized(integ.orgId, integ.provider, apps, actor);
    const message = `Fetched ${apps.length} application(s), created ${created}${skipped.length ? `, skipped ${skipped.length}: ${skipped.join("; ")}` : ""}.`;
    await db.integration.update({ where: { id: integ.id }, data: { status: "CONNECTED", lastSyncAt: new Date(), lastError: null } });
    await db.syncLog.create({ data: { orgId: integ.orgId, integrationId: integ.id, status: "SUCCESS", message, items: created } });
    await audit(integ.orgId, actor, "ats.synced", { type: "Integration", id: integ.id, label: adapter.label }, { created, fetched: apps.length });
    return { ok: true as const, created, message };
  } catch (e) {
    const err = e instanceof AtsError ? e : new AtsError((e as Error).message, true);
    await db.integration.update({ where: { id: integ.id }, data: { status: "ERROR", lastError: err.message } });
    await db.syncLog.create({ data: { orgId: integ.orgId, integrationId: integ.id, status: "FAILED", message: err.message } });
    await audit(integ.orgId, actor, "ats.sync_failed", { type: "Integration", id: integ.id, label: adapter.label }, { error: err.message });
    await notify(integ.orgId, {
      type: "ats_sync_failed",
      title: `${adapter.label} synchronization failed`,
      body: `${err.message} ${err.retryable ? "Hirely will retry automatically." : "Please check the credentials in Integrations."} New applications from this ATS are queued until the connection is restored.`,
      link: "/app/integrations",
      severity: "error",
    });
    return { ok: false as const, error: err.message, retryable: err.retryable };
  }
}
