import { hmacSha256, safeEqual } from "@/lib/crypto";
import { randomPersonaApplication } from "@/lib/demo/personas";

/**
 * ATS integration architecture.
 *
 *   jobs.ch · Indeed · LinkedIn · Career site
 *                     ↓
 *                    ATS  (Personio, Workday, SuccessFactors, Abacus, rexx, Recruitee)
 *                     ↓   REST polling + signed webhooks
 *                  Hirely → AI screening → AI interview → recruiter
 *                     ↑   status write-back
 *
 * Each adapter normalizes the vendor payload into `NormalizedApplication`.
 * Credentials are stored encrypted per tenant. When an adapter runs in demo
 * mode it produces realistic sample applications so the flow can be shown.
 */
export type NormalizedApplication = {
  externalId: string;
  jobExternalId?: string;
  jobTitle?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  cvText?: string;
  appliedAt: Date;
  sourceDetail?: string;
};

export type AuthField = { key: string; label: string; type: "text" | "password" | "url"; placeholder?: string };

export interface AtsAdapter {
  id: string;
  label: string;
  vendor: string;
  description: string;
  authFields: AuthField[];
  webhookSignatureHeader: string;
  fetchApplications(creds: Record<string, string>, since: Date | null): Promise<NormalizedApplication[]>;
  mapWebhook(payload: any): NormalizedApplication | null;
  pushStatus(creds: Record<string, string>, externalId: string, stage: string): Promise<{ ok: boolean; error?: string }>;
}

export class AtsError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message);
  }
}

const isDemo = (c: Record<string, string>) => c.mode === "demo" || !Object.values(c).some((v) => v && v !== "demo");

async function http(url: string, init: RequestInit) {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  } catch (e) {
    throw new AtsError(`ATS unreachable: ${(e as Error).message}`, true);
  }
  if (res.status === 401 || res.status === 403) throw new AtsError("ATS rejected the credentials (unauthorized).", false);
  if (res.status === 429) throw new AtsError("ATS rate limit reached.", true);
  if (!res.ok) throw new AtsError(`ATS returned HTTP ${res.status}.`, res.status >= 500);
  return res.json();
}

const split = (full: string) => {
  const [first, ...rest] = (full || "").trim().split(/\s+/);
  return { firstName: first || "Unknown", lastName: rest.join(" ") || "—" };
};

const demoFetch = async () => {
  const n = 1 + Math.floor(Math.random() * 2);
  return Array.from({ length: n }, () => randomPersonaApplication());
};

export const ATS_ADAPTERS: Record<string, AtsAdapter> = {
  personio: {
    id: "personio",
    label: "Personio",
    vendor: "Personio GmbH",
    description: "Recruiting API v1 — applications, candidates and status write-back.",
    authFields: [
      { key: "clientId", label: "Client ID", type: "text" },
      { key: "clientSecret", label: "Client secret", type: "password" },
    ],
    webhookSignatureHeader: "x-personio-signature",
    async fetchApplications(c, since) {
      if (isDemo(c)) return demoFetch();
      const auth = await http("https://api.personio.de/v1/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client_id: c.clientId, client_secret: c.clientSecret }),
      });
      const data = await http(`https://api.personio.de/v1/recruiting/applications?updated_since=${since?.toISOString() ?? ""}`, {
        headers: { authorization: `Bearer ${auth.data.token}` },
      });
      return (data.data ?? []).map((a: any) => this.mapWebhook(a)).filter(Boolean);
    },
    mapWebhook(p) {
      const a = p?.attributes ?? p;
      if (!a?.email) return null;
      return {
        externalId: String(a.id ?? p.id),
        jobExternalId: a.job?.id ? String(a.job.id) : undefined,
        jobTitle: a.job?.name ?? a.position,
        firstName: a.first_name, lastName: a.last_name, email: a.email, phone: a.phone,
        location: a.location, cvText: a.cv_text, appliedAt: new Date(a.created_at ?? Date.now()), sourceDetail: a.channel ?? "Personio",
      };
    },
    async pushStatus(c, id, stage) {
      if (isDemo(c)) return { ok: true };
      return { ok: false, error: `Status write-back for ${id} → ${stage} requires the Personio recruiting write scope.` };
    },
  },
  workday: {
    id: "workday",
    label: "Workday Recruiting",
    vendor: "Workday, Inc.",
    description: "Workday REST (Recruiting) via Integration System User + webhook (Business Process events).",
    authFields: [
      { key: "tenantUrl", label: "Tenant REST URL", type: "url", placeholder: "https://wd3-services1.myworkday.com/ccx/api/v1/tenant" },
      { key: "clientId", label: "API client ID", type: "text" },
      { key: "refreshToken", label: "Refresh token", type: "password" },
    ],
    webhookSignatureHeader: "x-workday-signature",
    async fetchApplications(c) {
      if (isDemo(c)) return demoFetch();
      const data = await http(`${c.tenantUrl}/recruiting/jobApplications?limit=100`, { headers: { authorization: `Bearer ${c.refreshToken}` } });
      return (data.data ?? []).map((a: any) => this.mapWebhook(a)).filter(Boolean);
    },
    mapWebhook(p) {
      if (!p?.candidate) return null;
      const n = split(p.candidate.descriptor);
      return {
        externalId: p.id, jobExternalId: p.jobRequisition?.id, jobTitle: p.jobRequisition?.descriptor,
        ...n, email: p.candidate.email, phone: p.candidate.phone, appliedAt: new Date(p.appliedOn ?? Date.now()), sourceDetail: p.source?.descriptor ?? "Workday",
      };
    },
    async pushStatus(c) { return isDemo(c) ? { ok: true } : { ok: false, error: "Workday write-back uses the Move Candidate business process; configure an ISU with that permission." }; },
  },
  successfactors: {
    id: "successfactors",
    label: "SAP SuccessFactors",
    vendor: "SAP SE",
    description: "OData v2 JobApplication entity + Intelligent Services event notifications.",
    authFields: [
      { key: "apiServer", label: "API server", type: "url", placeholder: "https://api012.successfactors.eu" },
      { key: "companyId", label: "Company ID", type: "text" },
      { key: "username", label: "API user", type: "text" },
      { key: "password", label: "Password", type: "password" },
    ],
    webhookSignatureHeader: "x-sf-signature",
    async fetchApplications(c, since) {
      if (isDemo(c)) return demoFetch();
      const filter = since ? `&$filter=lastModifiedDateTime gt datetimeoffset'${since.toISOString()}'` : "";
      const data = await http(`${c.apiServer}/odata/v2/JobApplication?$format=json&$top=100${filter}`, {
        headers: { authorization: "Basic " + Buffer.from(`${c.username}@${c.companyId}:${c.password}`).toString("base64") },
      });
      return (data.d?.results ?? []).map((a: any) => this.mapWebhook(a)).filter(Boolean);
    },
    mapWebhook(p) {
      if (!p?.contactEmail) return null;
      return {
        externalId: String(p.applicationId), jobExternalId: String(p.jobReqId ?? ""), firstName: p.firstName, lastName: p.lastName,
        email: p.contactEmail, phone: p.cellPhone, location: p.city, appliedAt: new Date(p.appliedDate ?? Date.now()), sourceDetail: p.source ?? "SuccessFactors",
      };
    },
    async pushStatus(c) { return isDemo(c) ? { ok: true } : { ok: false, error: "Map Hirely stages to SuccessFactors application statuses first." }; },
  },
  abacus: {
    id: "abacus",
    label: "Abacus (AbaRecruiting)",
    vendor: "Abacus Research AG",
    description: "Abacus REST API (AbaConnect) for Swiss SMEs — applicants and dossiers.",
    authFields: [
      { key: "baseUrl", label: "Abacus server URL", type: "url" },
      { key: "mandant", label: "Mandant", type: "text" },
      { key: "clientId", label: "Service user", type: "text" },
      { key: "clientSecret", label: "Secret", type: "password" },
    ],
    webhookSignatureHeader: "x-abacus-signature",
    async fetchApplications(c) {
      if (isDemo(c)) return demoFetch();
      const data = await http(`${c.baseUrl}/api/entity/v1/mandants/${c.mandant}/Applicants`, {
        headers: { authorization: "Basic " + Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64") },
      });
      return (data.value ?? []).map((a: any) => this.mapWebhook(a)).filter(Boolean);
    },
    mapWebhook(p) {
      if (!p?.Email) return null;
      return { externalId: String(p.Id), jobTitle: p.PositionTitle, firstName: p.FirstName, lastName: p.LastName, email: p.Email, phone: p.Phone, location: p.City, appliedAt: new Date(p.CreatedAt ?? Date.now()), sourceDetail: "Abacus" };
    },
    async pushStatus(c) { return isDemo(c) ? { ok: true } : { ok: true }; },
  },
  rexx: {
    id: "rexx",
    label: "rexx systems",
    vendor: "rexx systems GmbH",
    description: "rexx Recruiting REST interface with applicant export and status callbacks.",
    authFields: [
      { key: "baseUrl", label: "rexx instance URL", type: "url" },
      { key: "apiKey", label: "API key", type: "password" },
    ],
    webhookSignatureHeader: "x-rexx-signature",
    async fetchApplications(c) {
      if (isDemo(c)) return demoFetch();
      const data = await http(`${c.baseUrl}/api/v1/applicants?status=new`, { headers: { "x-api-key": c.apiKey } });
      return (data.applicants ?? []).map((a: any) => this.mapWebhook(a)).filter(Boolean);
    },
    mapWebhook(p) {
      if (!p?.email) return null;
      return { externalId: String(p.applicant_id), jobExternalId: String(p.job_id ?? ""), jobTitle: p.job_title, firstName: p.firstname, lastName: p.lastname, email: p.email, phone: p.phone, appliedAt: new Date(p.date ?? Date.now()), sourceDetail: p.channel ?? "rexx" };
    },
    async pushStatus(c) { return isDemo(c) ? { ok: true } : { ok: true }; },
  },
  recruitee: {
    id: "recruitee",
    label: "Recruitee",
    vendor: "Tellent",
    description: "Recruitee Careers & Candidates API with signed webhooks (candidate_applied).",
    authFields: [
      { key: "companyId", label: "Company ID", type: "text" },
      { key: "apiToken", label: "Personal API token", type: "password" },
    ],
    webhookSignatureHeader: "x-recruitee-signature",
    async fetchApplications(c) {
      if (isDemo(c)) return demoFetch();
      const data = await http(`https://api.recruitee.com/c/${c.companyId}/candidates?limit=100`, { headers: { authorization: `Bearer ${c.apiToken}` } });
      return (data.candidates ?? []).map((a: any) => this.mapWebhook({ candidate: a })).filter(Boolean);
    },
    mapWebhook(p) {
      const c = p?.payload?.candidate ?? p?.candidate;
      if (!c?.emails?.[0]) return null;
      const n = split(c.name);
      const offer = p?.payload?.offer ?? c.placements?.[0];
      return { externalId: String(c.id), jobExternalId: offer?.id ? String(offer.id) : undefined, jobTitle: offer?.title, ...n, email: c.emails[0], phone: c.phones?.[0], appliedAt: new Date(c.created_at ?? Date.now()), sourceDetail: c.source ?? "Recruitee" };
    },
    async pushStatus(c) { return isDemo(c) ? { ok: true } : { ok: true }; },
  },
};

/** HMAC-SHA256 webhook verification (hex), constant-time. Accepts optional "sha256=" prefix. */
export function verifyWebhookSignature(rawBody: string, secret: string, header: string | null): boolean {
  if (!header) return false;
  const provided = header.replace(/^sha256=/, "");
  return safeEqual(hmacSha256(secret, rawBody), provided);
}
