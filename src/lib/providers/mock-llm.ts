import type { LLMRequest } from "./llm";
import { parseCvHeuristic } from "@/lib/services/cv-heuristics";

/**
 * Deterministic mock LLM. Produces realistic, content-grounded output from the
 * structured `input` of each task so the full product can be demonstrated
 * end-to-end without external credentials. It never fabricates facts: it only
 * rephrases data it was given.
 */

type Lang = "de" | "en" | "fr" | "it";
const L = (l?: string): Lang => (["de", "en", "fr", "it"].includes(l ?? "") ? (l as Lang) : "en");

const H = {
  de: { about: "Über uns", role: "Ihre Aufgaben", profile: "Ihr Profil", nice: "Von Vorteil", offer: "Wir bieten", apply: "Interessiert?", applyText: "Wir freuen uns auf Ihre Bewerbung. Der Bewerbungsprozess ist einfach und dauert nur wenige Minuten.", details: "Eckdaten" },
  en: { about: "About us", role: "Your responsibilities", profile: "Your profile", nice: "Nice to have", offer: "What we offer", apply: "Interested?", applyText: "We look forward to your application. Applying takes only a few minutes.", details: "Key facts" },
  fr: { about: "À propos de nous", role: "Vos missions", profile: "Votre profil", nice: "Un plus", offer: "Nous offrons", apply: "Intéressé·e ?", applyText: "Nous nous réjouissons de recevoir votre candidature.", details: "En bref" },
  it: { about: "Chi siamo", role: "I suoi compiti", profile: "Il suo profilo", nice: "Costituisce un vantaggio", offer: "Offriamo", apply: "Interessato/a?", applyText: "Attendiamo con piacere la sua candidatura.", details: "In breve" },
};

// Deliberately non-committal: concrete benefits (vacation weeks, pension, etc.) are never invented.
const OFFER = {
  de: ["Eine verantwortungsvolle und abwechslungsreiche Aufgabe", "Ein engagiertes Team, das Sie unterstützt", "Eine sorgfältige Einarbeitung"],
  en: ["A responsible and varied role", "A committed team that supports you", "A thorough onboarding"],
  fr: ["Une fonction variée et pleine de responsabilités", "Une équipe engagée", "Une intégration soignée"],
  it: ["Un ruolo vario e di responsabilità", "Un team motivato", "Un inserimento accurato"],
};

function bulletsFromNotes(notes: string): string[] {
  return notes
    .split(/\n|;|•|(?<=\.)\s+/)
    .map((s) => s.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((s) => s.length > 3)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/\.$/, ""));
}

function jobAd(i: Record<string, any>): string {
  const lang = L(i.language);
  const h = H[lang];
  const tasks = bulletsFromNotes(i.notes || "");
  const reqs: string[] = i.requirements?.length ? i.requirements : [];
  const nice: string[] = i.niceToHave?.length ? i.niceToHave : [];
  const intro =
    lang === "de"
      ? `Für unser Team${i.department ? ` im Bereich ${i.department}` : ""}${i.location ? ` in ${i.location}` : ""} suchen wir per sofort oder nach Vereinbarung eine engagierte Persönlichkeit als`
      : lang === "fr"
        ? `Pour notre équipe${i.location ? ` à ${i.location}` : ""}, nous recherchons de suite ou à convenir une personnalité engagée en tant que`
        : lang === "it"
          ? `Per il nostro team${i.location ? ` a ${i.location}` : ""} cerchiamo subito o per data da convenire una persona motivata come`
          : `For our team${i.department ? ` in ${i.department}` : ""}${i.location ? ` in ${i.location}` : ""} we are looking for a committed`;
  const facts = [
    i.location && `📍 ${i.location}`,
    i.workload && `⏱ ${i.workload}`,
    i.employmentType && `📄 ${i.employmentType}`,
    i.salary && `💼 ${i.salary}`,
  ].filter(Boolean);
  return [
    `## ${i.title}${i.workload && !String(i.title).includes(i.workload) ? ` ${i.workload}` : ""}`,
    "",
    `${intro} **${i.title}**.`,
    "",
    i.companyDescription ? `### ${h.about}\n${i.companyDescription}${i.values ? `\n\n${i.values}` : ""}\n` : "",
    `### ${h.role}`,
    ...(tasks.length ? tasks : [i.title]).map((t) => `- ${t}`),
    "",
    `### ${h.profile}`,
    ...(reqs.length ? reqs : ["—"]).map((t) => `- ${t}`),
    "",
    nice.length ? `### ${h.nice}\n${nice.map((t) => `- ${t}`).join("\n")}\n` : "",
    `### ${h.offer}`,
    ...OFFER[lang].map((t) => `- ${t}`),
    "",
    facts.length ? `### ${h.details}\n${facts.join(" · ")}\n` : "",
    `### ${h.apply}`,
    h.applyText,
  ]
    .filter((x) => x !== "")
    .join("\n");
}

function candidateSummary(i: Record<string, any>): string {
  const lang = L(i.language);
  const parts: string[] = [];
  if (lang === "de") {
    parts.push(
      `${i.name}${i.currentTitle ? `, aktuell ${i.currentTitle}` : ""}${i.years != null ? `, mit ca. ${i.years} Jahren Berufserfahrung` : ""}${i.location ? ` (${i.location})` : ""}.`,
    );
    parts.push(`Erfüllt ${i.met} von ${i.total} konfigurierten Anforderungen (Muss-Kriterien: ${i.mustMet}/${i.mustTotal}).`);
    if (i.highlights?.length) parts.push(`Belegt: ${i.highlights.slice(0, 3).join("; ")}.`);
    if (i.missing?.length) parts.push(`Offene Punkte: ${i.missing.slice(0, 3).join(", ")}.`);
  } else {
    parts.push(
      `${i.name}${i.currentTitle ? `, currently ${i.currentTitle}` : ""}${i.years != null ? `, with approx. ${i.years} years of professional experience` : ""}${i.location ? ` (${i.location})` : ""}.`,
    );
    parts.push(`Meets ${i.met} of ${i.total} configured job requirements (must-haves: ${i.mustMet}/${i.mustTotal}).`);
    if (i.highlights?.length) parts.push(`Evidenced: ${i.highlights.slice(0, 3).join("; ")}.`);
    if (i.missing?.length) parts.push(`Missing information: ${i.missing.slice(0, 3).join(", ")}.`);
  }
  return parts.join(" ");
}

function interviewSummary(i: Record<string, any>): string {
  const answers: { question: string; answer: string }[] = i.answers ?? [];
  const lines = answers
    .filter((a) => a.answer && a.answer.trim().length > 0)
    .map((a) => {
      const short = a.answer.length > 180 ? a.answer.slice(0, 177).trim() + "…" : a.answer;
      return `- **${a.question.replace(/\?$/, "")}:** ${short}`;
    });
  const facts = [
    i.availability && `Availability: ${i.availability}`,
    i.notice && `Notice period: ${i.notice}`,
    i.salary && `Salary expectation: ${i.salary}`,
  ].filter(Boolean);
  return [
    `The candidate completed ${answers.filter((a) => a.answer).length} of ${answers.length} interview questions.`,
    facts.length ? facts.join(" · ") : "",
    "",
    ...lines,
  ]
    .filter((x) => x !== undefined)
    .join("\n")
    .trim();
}

function draftEmail(i: Record<string, any>): string {
  const lang = L(i.language);
  const n = i.candidateName ?? "";
  const job = i.jobTitle ?? "";
  const co = i.companyName ?? "";
  const r = i.recruiterName ?? "Ihr Recruiting-Team";
  const kind = i.kind ?? "interview_invitation";
  if (lang === "de") {
    const bodies: Record<string, [string, string]> = {
      interview_invitation: [
        `Einladung zum persönlichen Gespräch – ${job}`,
        `Guten Tag ${n}\n\nVielen Dank für Ihr Interesse an der Stelle als ${job} bei ${co} und für das Vorabgespräch. Gerne möchten wir Sie persönlich kennenlernen.\n\nBitte wählen Sie über den folgenden Link einen passenden Termin:\n{{schedulingLink}}\n\nBei Fragen stehe ich Ihnen gerne zur Verfügung.\n\nFreundliche Grüsse\n${r}\n${co}`,
      ],
      rejection: [
        `Ihre Bewerbung als ${job}`,
        `Guten Tag ${n}\n\nVielen Dank für Ihre Bewerbung als ${job} und die Zeit, die Sie investiert haben. Nach sorgfältiger Prüfung haben wir uns entschieden, mit anderen Kandidierenden weiterzugehen, deren Profil unseren aktuellen Anforderungen näher entspricht.\n\nWir wünschen Ihnen für Ihre berufliche Zukunft alles Gute.\n\nFreundliche Grüsse\n${r}\n${co}`,
      ],
      follow_up: [
        `Kurze Rückfrage zu Ihrer Bewerbung – ${job}`,
        `Guten Tag ${n}\n\nVielen Dank für Ihre Bewerbung. Für die weitere Prüfung fehlt uns noch eine Information: ${i.context || "…"}\n\nKönnten Sie uns diese kurz zukommen lassen?\n\nFreundliche Grüsse\n${r}\n${co}`,
      ],
    };
    const [s, b] = bodies[kind] ?? bodies.interview_invitation;
    return `Subject: ${s}\n\n${b}`;
  }
  const bodies: Record<string, [string, string]> = {
    interview_invitation: [
      `Invitation to a personal interview – ${job}`,
      `Dear ${n}\n\nThank you for your interest in the ${job} position at ${co} and for completing the pre-screening. We would be glad to meet you in person.\n\nPlease choose a suitable time using the following link:\n{{schedulingLink}}\n\nIf you have any questions, feel free to reply to this email.\n\nKind regards\n${r}\n${co}`,
    ],
    rejection: [
      `Your application – ${job}`,
      `Dear ${n}\n\nThank you for applying for the ${job} position and for the time you invested. After careful review, we have decided to proceed with candidates whose profiles more closely match our current requirements.\n\nWe wish you all the best for your professional future.\n\nKind regards\n${r}\n${co}`,
    ],
    follow_up: [
      `A quick question about your application – ${job}`,
      `Dear ${n}\n\nThank you for your application. To continue our review we need one more piece of information: ${i.context || "…"}\n\nCould you send this to us?\n\nKind regards\n${r}\n${co}`,
    ],
  };
  const [s, b] = bodies[kind] ?? bodies.interview_invitation;
  return `Subject: ${s}\n\n${b}`;
}

function generateQuestions(i: Record<string, any>): string {
  const lang = L(i.language);
  const title: string = i.title ?? "";
  const reqs: { label: string; category: string; kind: string }[] = i.requirements ?? [];
  const de = lang === "de";
  const screening: string[] = [];
  const knockout: string[] = [];
  const phone: string[] = [
    de ? `Was interessiert Sie an der Stelle als ${title}?` : `What interests you about the ${title} position?`,
  ];
  for (const r of reqs) {
    if (r.category === "EXPERIENCE" || r.category === "SKILL")
      screening.push(de ? `Wie viel Erfahrung haben Sie mit ${r.label.replace(/^\d+\+?\s*(Jahre|years)\s*/i, "")}?` : `How much experience do you have with ${r.label.replace(/^\d+\+?\s*(years)\s*/i, "")}?`);
    if (r.category === "LICENSE") knockout.push(de ? `Besitzen Sie folgenden Ausweis: ${r.label}?` : `Do you hold the following: ${r.label}?`);
    if (r.category === "LANGUAGE") phone.push(de ? `In welchen Situationen haben Sie ${r.label.split(" ")[0]} beruflich eingesetzt?` : `In which work situations have you used ${r.label.split(" ")[0]}?`);
  }
  knockout.unshift(de ? "Sind Sie berechtigt, in der Schweiz zu arbeiten?" : "Are you legally allowed to work in Switzerland?");
  phone.push(
    de ? "Beschreiben Sie ein technisches Problem, das Sie kürzlich gelöst haben. Wie sind Sie vorgegangen?" : "Describe a technical problem you solved recently. How did you approach it?",
    de ? "Ab wann wären Sie verfügbar und wie lange ist Ihre Kündigungsfrist?" : "When would you be available and what is your notice period?",
    de ? "Was sind Ihre Lohnvorstellungen (Jahreslohn brutto)?" : "What are your salary expectations (gross annual)?",
  );
  return JSON.stringify({ screening: screening.slice(0, 4), phone, knockout });
}

function followup(i: Record<string, any>): string {
  const lang = L(i.language);
  const a: string = i.answer ?? "";
  if (lang === "de") return a.split(/\s+/).length < 6 ? "Können Sie das etwas genauer ausführen – vielleicht mit einem konkreten Beispiel?" : "Danke. Welche Rolle hatten Sie dabei konkret?";
  return a.split(/\s+/).length < 6 ? "Could you elaborate a bit more — perhaps with a concrete example?" : "Thank you. What was your specific role in that?";
}

function videoAnalysis(i: Record<string, any>): string {
  const t: string = i.transcript ?? "";
  const sentences = t.split(/(?<=[.!?])\s+/).filter((s) => s.split(" ").length > 4);
  const reqs: { id: string; label: string; keywords: string[] }[] = i.requirements ?? [];
  const mentioned = reqs.filter((r) => [r.label, ...r.keywords].some((k) => k && t.toLowerCase().includes(k.toLowerCase().split(" ")[0])));
  return JSON.stringify({
    keyPoints: sentences.slice(0, 3),
    relatedRequirements: mentioned.map((r) => r.id),
    note: "Analysis is based solely on the spoken content of the answer.",
  });
}

export function mockGenerate(req: LLMRequest): string {
  const input = (req.input ?? {}) as Record<string, any>;
  switch (req.task) {
    case "job_ad":
      return jobAd(input);
    case "candidate_summary":
      return candidateSummary(input);
    case "interview_summary":
      return interviewSummary(input);
    case "draft_email":
      return draftEmail(input);
    case "generate_questions":
      return generateQuestions(input);
    case "followup_question":
      return followup(input);
    case "parse_cv":
      return JSON.stringify(parseCvHeuristic(String(input.text ?? "")));
    case "video_answer_analysis":
      return videoAnalysis(input);
    case "assistant":
      return String(input.fallback ?? "I can help with candidates, interviews, jobs and drafting messages.");
  }
}
