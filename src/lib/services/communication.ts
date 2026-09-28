import type { Channel } from "@prisma/client";
import { db } from "@/lib/db";
import { audit, type Actor } from "@/lib/audit";
import { CHANNEL_COST_CENTS, getMessageProvider } from "@/lib/providers/messaging";
import { enqueue } from "@/lib/queue";
import { notify } from "./notifications";
import { recordUsage } from "./usage";

export const TEMPLATE_KEYS: Record<string, string> = {
  application_received: "Application received",
  ai_interview_invitation: "AI interview invitation",
  interview_reminder: "Interview reminder",
  interview_final_reminder: "Final interview reminder",
  interview_completed: "Interview completed",
  call_missed: "Missed call",
  video_interview_invitation: "Video interview invitation",
  personal_interview_invitation: "Personal interview invitation",
  interview_confirmation: "Interview confirmation",
  personal_interview_reminder: "Personal interview reminder",
  rejection: "Rejection",
  talent_pool_invitation: "Talent pool invitation",
  offer: "Offer communication",
};

type T = { subject?: string; body: string };
type Defaults = Record<string, Partial<Record<"de" | "en" | "fr" | "it", { EMAIL: T; SMS?: T }>>>;

const sig = "\n\nFreundliche Grüsse\n{{recruiterName}}\n{{companyName}}";
const sigEn = "\n\nKind regards\n{{recruiterName}}\n{{companyName}}";

export const DEFAULT_TEMPLATES: Defaults = {
  application_received: {
    de: { EMAIL: { subject: "Ihre Bewerbung als {{jobTitle}}", body: "Guten Tag {{candidateName}}\n\nVielen Dank für Ihre Bewerbung als {{jobTitle}} bei {{companyName}}. Wir haben Ihre Unterlagen erhalten und prüfen sie sorgfältig.\n\nDen aktuellen Stand Ihrer Bewerbung sehen Sie jederzeit hier:\n{{portalLink}}" + sig }, SMS: { body: "{{companyName}}: Vielen Dank für Ihre Bewerbung als {{jobTitle}}. Status: {{portalLink}}" } },
    en: { EMAIL: { subject: "Your application for {{jobTitle}}", body: "Dear {{candidateName}}\n\nThank you for applying for the {{jobTitle}} position at {{companyName}}. We have received your documents and are reviewing them carefully.\n\nYou can follow the status of your application here:\n{{portalLink}}" + sigEn }, SMS: { body: "{{companyName}}: Thank you for applying as {{jobTitle}}. Status: {{portalLink}}" } },
    fr: { EMAIL: { subject: "Votre candidature – {{jobTitle}}", body: "Bonjour {{candidateName}}\n\nMerci pour votre candidature au poste de {{jobTitle}} chez {{companyName}}. Nous avons bien reçu votre dossier.\n\nSuivez l'état de votre candidature ici :\n{{portalLink}}\n\nMeilleures salutations\n{{recruiterName}}\n{{companyName}}" } },
    it: { EMAIL: { subject: "La sua candidatura – {{jobTitle}}", body: "Buongiorno {{candidateName}}\n\nGrazie per la sua candidatura come {{jobTitle}} presso {{companyName}}. Abbiamo ricevuto la sua documentazione.\n\nPuò seguire lo stato della candidatura qui:\n{{portalLink}}\n\nCordiali saluti\n{{recruiterName}}\n{{companyName}}" } },
  },
  ai_interview_invitation: {
    de: { EMAIL: { subject: "Einladung zum kurzen Vorabgespräch – {{jobTitle}}", body: "Guten Tag {{candidateName}}\n\nVielen Dank für Ihre Bewerbung. Wir würden gerne ein kurzes Vorabgespräch mit Ihnen führen.\n\nDas Gespräch dauert ca. 10 Minuten und wird von unserem KI-Recruiting-Assistenten geführt. Sie können wählen, ob Sie jetzt direkt angerufen werden, einen Anruf zu einem passenden Zeitpunkt planen oder das Gespräch im Browser führen möchten:\n{{interviewLink}}\n\nWichtig: Die Entscheidung über das weitere Vorgehen trifft immer eine Person aus unserem HR-Team." + sig }, SMS: { body: "{{companyName}}: Vielen Dank für Ihre Bewerbung. Wir würden gerne ein kurzes KI-Vorabgespräch (ca. 10 Min.) mit Ihnen führen: {{interviewLink}}" } },
    en: { EMAIL: { subject: "Invitation to a short pre-screening interview – {{jobTitle}}", body: "Dear {{candidateName}}\n\nThank you for your application. We would like to invite you to a short AI pre-screening interview.\n\nIt takes about 10 minutes and is conducted by our AI recruiting assistant. You can choose to be called now, schedule a call, or take the interview in your browser:\n{{interviewLink}}\n\nImportant: every decision about next steps is made by a person from our HR team." + sigEn }, SMS: { body: "{{companyName}}: Thank you for your application. Please choose a time for a short AI pre-screening interview (~10 min): {{interviewLink}}" } },
    fr: { EMAIL: { subject: "Invitation à un bref entretien préliminaire – {{jobTitle}}", body: "Bonjour {{candidateName}}\n\nMerci pour votre candidature. Nous aimerions mener avec vous un bref entretien préliminaire (env. 10 minutes) avec notre assistant de recrutement IA :\n{{interviewLink}}\n\nToute décision est prise par une personne de notre équipe RH.\n\nMeilleures salutations\n{{recruiterName}}\n{{companyName}}" } },
    it: { EMAIL: { subject: "Invito a un breve colloquio preliminare – {{jobTitle}}", body: "Buongiorno {{candidateName}}\n\nGrazie per la candidatura. Vorremmo condurre con lei un breve colloquio preliminare (circa 10 minuti) con il nostro assistente di selezione IA:\n{{interviewLink}}\n\nOgni decisione viene presa da una persona del nostro team HR.\n\nCordiali saluti\n{{recruiterName}}\n{{companyName}}" } },
  },
  interview_reminder: {
    de: { EMAIL: { subject: "Erinnerung: Ihr Vorabgespräch – {{jobTitle}}", body: "Guten Tag {{candidateName}}\n\nWir möchten Sie freundlich an das kurze Vorabgespräch erinnern. Sie können es jederzeit hier starten oder planen:\n{{interviewLink}}" + sig }, SMS: { body: "{{companyName}}: Kurze Erinnerung an Ihr Vorabgespräch: {{interviewLink}}" } },
    en: { EMAIL: { subject: "Reminder: your pre-screening interview – {{jobTitle}}", body: "Dear {{candidateName}}\n\nA friendly reminder about your short pre-screening interview. You can start or schedule it here:\n{{interviewLink}}" + sigEn }, SMS: { body: "{{companyName}}: Friendly reminder about your pre-screening interview: {{interviewLink}}" } },
  },
  interview_final_reminder: {
    de: { EMAIL: { subject: "Letzte Erinnerung: Vorabgespräch – {{jobTitle}}", body: "Guten Tag {{candidateName}}\n\nWir haben noch nichts von Ihnen gehört. Falls Sie weiterhin interessiert sind, führen Sie das Vorabgespräch bitte in den nächsten Tagen durch:\n{{interviewLink}}\n\nFalls Sie lieber direkt mit uns sprechen möchten, antworten Sie einfach auf diese E-Mail." + sig } },
    en: { EMAIL: { subject: "Final reminder: pre-screening interview – {{jobTitle}}", body: "Dear {{candidateName}}\n\nWe haven't heard from you yet. If you are still interested, please complete the pre-screening in the next few days:\n{{interviewLink}}\n\nIf you prefer to speak with a person, simply reply to this email." + sigEn } },
  },
  interview_completed: {
    de: { EMAIL: { subject: "Danke für das Gespräch – {{jobTitle}}", body: "Guten Tag {{candidateName}}\n\nVielen Dank, dass Sie sich Zeit für das Vorabgespräch genommen haben. Unser HR-Team prüft Ihre Antworten persönlich und meldet sich in Kürze bei Ihnen.\n\nStatus: {{portalLink}}" + sig } },
    en: { EMAIL: { subject: "Thank you for the interview – {{jobTitle}}", body: "Dear {{candidateName}}\n\nThank you for taking the time for the pre-screening interview. Our HR team will personally review your answers and get back to you shortly.\n\nStatus: {{portalLink}}" + sigEn } },
  },
  call_missed: {
    de: { EMAIL: { subject: "Wir haben Sie leider nicht erreicht", body: "Guten Tag {{candidateName}}\n\nWir haben versucht, Sie für das Vorabgespräch anzurufen, Sie aber leider nicht erreicht. Wählen Sie hier einen neuen Zeitpunkt:\n{{interviewLink}}" + sig }, SMS: { body: "{{companyName}}: Wir haben Sie leider nicht erreicht. Neuer Termin fürs Vorabgespräch: {{interviewLink}}" } },
    en: { EMAIL: { subject: "We couldn't reach you", body: "Dear {{candidateName}}\n\nWe tried to call you for the pre-screening interview but couldn't reach you. Choose a new time here:\n{{interviewLink}}" + sigEn }, SMS: { body: "{{companyName}}: We couldn't reach you. Pick a new time for your pre-screening: {{interviewLink}}" } },
  },
  video_interview_invitation: {
    de: { EMAIL: { subject: "Video-Interview – {{jobTitle}}", body: "Guten Tag {{candidateName}}\n\nAls nächsten Schritt laden wir Sie zu einem kurzen, zeitversetzten Video-Interview ein. Sie beantworten einige Fragen, wann es Ihnen passt:\n{{videoLink}}\n\nBewertet wird ausschliesslich der Inhalt Ihrer Antworten – nicht Ihr Aussehen." + sig } },
    en: { EMAIL: { subject: "Video interview – {{jobTitle}}", body: "Dear {{candidateName}}\n\nAs a next step we invite you to a short asynchronous video interview. Answer a few questions whenever it suits you:\n{{videoLink}}\n\nOnly the content of your answers is assessed — never your appearance." + sigEn } },
  },
  personal_interview_invitation: {
    de: { EMAIL: { subject: "Einladung zum persönlichen Gespräch – {{jobTitle}}", body: "Guten Tag {{candidateName}}\n\nVielen Dank für das Vorabgespräch. Gerne möchten wir Sie persönlich kennenlernen! Bitte wählen Sie einen passenden Termin:\n{{schedulingLink}}" + sig }, SMS: { body: "{{companyName}}: Wir möchten Sie gerne persönlich kennenlernen. Termin wählen: {{schedulingLink}}" } },
    en: { EMAIL: { subject: "Invitation to a personal interview – {{jobTitle}}", body: "Dear {{candidateName}}\n\nThank you for the pre-screening. We would love to meet you in person! Please choose a suitable time:\n{{schedulingLink}}" + sigEn }, SMS: { body: "{{companyName}}: We'd like to meet you in person. Pick a time: {{schedulingLink}}" } },
  },
  interview_confirmation: {
    de: { EMAIL: { subject: "Terminbestätigung – {{jobTitle}}", body: "Guten Tag {{candidateName}}\n\nIhr persönliches Gespräch ist bestätigt:\n\n{{interviewDate}}\n{{location}}\n\nDie Kalendereinladung finden Sie im Anhang. Falls Sie den Termin verschieben müssen, nutzen Sie bitte Ihr Bewerberportal:\n{{portalLink}}" + sig } },
    en: { EMAIL: { subject: "Interview confirmed – {{jobTitle}}", body: "Dear {{candidateName}}\n\nYour personal interview is confirmed:\n\n{{interviewDate}}\n{{location}}\n\nThe calendar invitation is attached. If you need to reschedule, please use your candidate portal:\n{{portalLink}}" + sigEn } },
  },
  personal_interview_reminder: {
    de: { EMAIL: { subject: "Erinnerung: Gespräch morgen – {{jobTitle}}", body: "Guten Tag {{candidateName}}\n\nWir freuen uns auf das Gespräch:\n{{interviewDate}}\n{{location}}" + sig }, SMS: { body: "{{companyName}}: Erinnerung an Ihr Gespräch am {{interviewDate}}, {{location}}." } },
    en: { EMAIL: { subject: "Reminder: interview tomorrow – {{jobTitle}}", body: "Dear {{candidateName}}\n\nWe look forward to meeting you:\n{{interviewDate}}\n{{location}}" + sigEn }, SMS: { body: "{{companyName}}: Reminder of your interview on {{interviewDate}}, {{location}}." } },
  },
  rejection: {
    de: { EMAIL: { subject: "Ihre Bewerbung als {{jobTitle}}", body: "Guten Tag {{candidateName}}\n\nVielen Dank für Ihr Interesse an {{companyName}} und die Zeit, die Sie in Ihre Bewerbung investiert haben. Nach sorgfältiger Prüfung haben wir uns entschieden, mit anderen Kandidierenden weiterzugehen.\n\nWir wünschen Ihnen für Ihre berufliche Zukunft alles Gute." + sig } },
    en: { EMAIL: { subject: "Your application for {{jobTitle}}", body: "Dear {{candidateName}}\n\nThank you for your interest in {{companyName}} and the time you invested in your application. After careful consideration we have decided to move forward with other candidates.\n\nWe wish you all the best for your professional future." + sigEn } },
  },
  talent_pool_invitation: {
    de: { EMAIL: { subject: "Bleiben wir in Kontakt?", body: "Guten Tag {{candidateName}}\n\nIhr Profil hat uns gefallen, auch wenn es aktuell nicht zur Stelle als {{jobTitle}} passt. Dürfen wir Sie in unseren Talent-Pool aufnehmen und bei passenden Stellen kontaktieren? Ihre Einwilligung können Sie hier geben oder jederzeit widerrufen:\n{{portalLink}}" + sig } },
    en: { EMAIL: { subject: "Shall we stay in touch?", body: "Dear {{candidateName}}\n\nWe liked your profile, even though it isn't the right fit for {{jobTitle}} right now. May we add you to our talent pool and contact you about suitable roles? You can give or withdraw consent here at any time:\n{{portalLink}}" + sigEn } },
  },
  offer: {
    de: { EMAIL: { subject: "Ihr Angebot – {{jobTitle}}", body: "Guten Tag {{candidateName}}\n\nWir freuen uns sehr, Ihnen die Stelle als {{jobTitle}} anbieten zu dürfen! Die Vertragsunterlagen erhalten Sie separat. Für Fragen stehe ich Ihnen jederzeit zur Verfügung." + sig } },
    en: { EMAIL: { subject: "Your offer – {{jobTitle}}", body: "Dear {{candidateName}}\n\nWe are delighted to offer you the position of {{jobTitle}}! You will receive the contract documents separately. Please don't hesitate to reach out with any questions." + sigEn } },
  },
};

export function renderTemplate(text: string, vars: Record<string, string | undefined>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

export async function resolveTemplate(orgId: string, key: string, channel: Channel, language: string): Promise<T | null> {
  const langs = [language, "de", "en"];
  for (const lang of langs) {
    const custom = await db.messageTemplate.findUnique({ where: { orgId_key_channel_language: { orgId, key, channel, language: lang } } });
    if (custom) return { subject: custom.subject ?? undefined, body: custom.body };
    const def = DEFAULT_TEMPLATES[key]?.[lang as "de"];
    const t = channel === "SMS" || channel === "WHATSAPP" ? def?.SMS : def?.EMAIL;
    if (t) return t;
  }
  return null;
}

export function appUrl(path = "") {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "") + path;
}

export async function templateVars(applicationId: string, extra: Record<string, string> = {}) {
  const app = await db.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: { candidate: true, job: true, org: { include: { memberships: { include: { user: true }, where: { role: { in: ["OWNER", "ADMIN", "RECRUITER"] } }, take: 1 } } }, interviews: { orderBy: { createdAt: "desc" } } },
  });
  const phoneOrWeb = app.interviews.find((i) => i.type !== "VIDEO");
  const video = app.interviews.find((i) => i.type === "VIDEO");
  const recruiter = app.assignedToId ? await db.user.findUnique({ where: { id: app.assignedToId } }) : app.org.memberships[0]?.user;
  return {
    app,
    vars: {
      candidateName: `${app.candidate.firstName} ${app.candidate.lastName}`,
      candidateFirstName: app.candidate.firstName,
      jobTitle: app.job.title,
      companyName: app.org.name,
      recruiterName: recruiter?.name ?? `${app.org.name} HR`,
      portalLink: appUrl(`/portal/${app.candidate.portalToken}`),
      interviewLink: phoneOrWeb ? appUrl(`/interview/${phoneOrWeb.token}`) : appUrl(`/portal/${app.candidate.portalToken}`),
      videoLink: video ? appUrl(`/video/${video.token}`) : "",
      ...extra,
    } as Record<string, string>,
  };
}

export type SendInput = {
  orgId: string;
  applicationId?: string;
  candidateId?: string;
  channel: Channel;
  templateKey?: string;
  subject?: string;
  body?: string;
  vars?: Record<string, string>;
  actor: Actor;
  to?: string;
};

export type SendOutcome = { ok: boolean; messageId: string; error?: string };

/** Persist → send via provider → record status/usage/audit. Failures are visible and retryable. */
export async function sendMessage(input: SendInput): Promise<SendOutcome> {
  let vars = input.vars ?? {};
  let language = "de";
  let candidateId = input.candidateId;
  let to = input.to;
  if (input.applicationId) {
    const r = await templateVars(input.applicationId, vars);
    vars = r.vars;
    language = r.app.job.language;
    candidateId = r.app.candidateId;
    to = to ?? (input.channel === "EMAIL" ? r.app.candidate.email : r.app.candidate.phone ?? "");
  } else if (candidateId) {
    const c = await db.candidate.findUniqueOrThrow({ where: { id: candidateId } });
    to = to ?? (input.channel === "EMAIL" ? c.email : c.phone ?? "");
  }
  let subject = input.subject;
  let body = input.body ?? "";
  if (input.templateKey) {
    const t = await resolveTemplate(input.orgId, input.templateKey, input.channel, language);
    if (!t) throw new Error(`No template "${input.templateKey}" for ${input.channel}`);
    subject = subject ?? t.subject;
    body = input.body ?? t.body;
  }
  subject = subject ? renderTemplate(subject, vars) : undefined;
  body = renderTemplate(body, vars);

  const msg = await db.message.create({
    data: {
      orgId: input.orgId,
      candidateId,
      applicationId: input.applicationId,
      channel: input.channel,
      templateKey: input.templateKey,
      to: to ?? "",
      subject,
      body,
      status: "QUEUED",
      sentById: input.actor.type === "USER" ? input.actor.id : null,
    },
  });
  return deliver(msg.id, input.actor);
}

export async function deliver(messageId: string, actor: Actor = { type: "SYSTEM" }): Promise<SendOutcome> {
  const msg = await db.message.findUniqueOrThrow({ where: { id: messageId } });
  if (msg.channel === "PORTAL" || msg.channel === "PHONE") {
    await db.message.update({ where: { id: msg.id }, data: { status: "DELIVERED", sentAt: new Date(), provider: "hirely" } });
    return { ok: true, messageId };
  }
  if (msg.channel === "SMS" || msg.channel === "WHATSAPP") {
    const { checkLimit } = await import("./usage");
    const lim = await checkLimit(msg.orgId, "SMS");
    if (!lim.allowed) {
      await db.message.update({ where: { id: msg.id }, data: { status: "FAILED", error: "SMS hard usage limit reached for this billing period." } });
      return { ok: false, messageId, error: "SMS hard usage limit reached — raise it under Settings → AI usage & costs." };
    }
  }
  const provider = getMessageProvider(msg.channel as "EMAIL" | "SMS" | "WHATSAPP");
  const org = await db.organization.findUniqueOrThrow({ where: { id: msg.orgId } });
  const res = await provider.send({ to: msg.to, subject: msg.subject ?? undefined, body: msg.body, orgName: org.name });
  if (res.ok) {
    await db.message.update({ where: { id: msg.id }, data: { status: "SENT", sentAt: new Date(), provider: provider.name, providerMessageId: res.providerMessageId, error: null } });
    await recordUsage(msg.orgId, msg.channel, 1, CHANNEL_COST_CENTS[msg.channel as "EMAIL"] ?? 0, { type: "message", id: msg.id });
    await audit(msg.orgId, actor, "message.sent", { type: "Message", id: msg.id, label: `${msg.channel} → ${msg.to}` }, { template: msg.templateKey, subject: msg.subject });
    return { ok: true, messageId };
  }
  await db.message.update({ where: { id: msg.id }, data: { status: "FAILED", provider: provider.name, error: res.error } });
  await audit(msg.orgId, actor, "message.failed", { type: "Message", id: msg.id, label: `${msg.channel} → ${msg.to}` }, { error: res.error });
  if (res.retryable) await enqueue("message.retry", { messageId: msg.id }, { orgId: msg.orgId, runAt: new Date(Date.now() + 5 * 60_000) });
  await notify(msg.orgId, {
    type: "message_failed",
    title: `${msg.channel === "EMAIL" ? "Email" : msg.channel} to ${msg.to} failed`,
    body: `${res.error}${res.retryable ? " — Hirely will retry automatically." : " — please check the recipient and resend."}`,
    link: msg.applicationId ? `/app/candidates/${msg.applicationId}?tab=messages` : "/app/communication",
    severity: "error",
  });
  return { ok: false, messageId, error: res.error };
}
