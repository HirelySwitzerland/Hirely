/**
 * Where a job can be published and how applications from there are recognised.
 * Every channel gets its own apply link (`/careers/<org>/<job>?ref=<id>`); the ref is stored as the
 * application's source and shows up in the analytics ("beste Quellen").
 */

export type Channel = {
  id: string;
  name: string;
  blurb: string;
  steps: string[];
  open: { href: string; label: string };
};

/** Job boards where the company places the ad itself; the «Bewerben» button leads to Recruit24. */
export const BOARDS: Channel[] = [
  {
    id: "linkedin", name: "LinkedIn",
    blurb: "Gratis- oder bezahltes Inserat. Gut für Fachkräfte, Büro und Kader.",
    steps: ["Inserat-Text kopieren und bei LinkedIn einfügen.", "Als Bewerbungsweg «Externe Website» wählen und den Bewerbungs-Link einfügen."],
    open: { href: "https://www.linkedin.com/talent/post-a-job", label: "Bei LinkedIn inserieren" },
  },
  {
    id: "indeed", name: "Indeed",
    blurb: "Grösste Jobsuchmaschine, auch für Handwerk, Logistik und Pflege.",
    steps: ["Inserat-Text kopieren und bei Indeed einfügen.", "Wo Indeed nach dem Bewerbungsweg fragt, den Bewerbungs-Link angeben."],
    open: { href: "https://employers.indeed.com/", label: "Bei Indeed inserieren" },
  },
  {
    id: "jobs.ch", name: "jobs.ch",
    blurb: "Das bekannteste Schweizer Stellenportal (Deutschschweiz).",
    steps: ["Inserat bei jobs.ch erfassen und den Text einfügen.", "Als Bewerbungsweg den Bewerbungs-Link angeben."],
    open: { href: "https://www.jobs.ch/", label: "Zu jobs.ch" },
  },
  {
    id: "jobup.ch", name: "jobup.ch",
    blurb: "Das grosse Stellenportal der Romandie.",
    steps: ["Inserat bei jobup.ch erfassen – am besten mit der französischen Version der Stelle.", "Als Bewerbungsweg den Bewerbungs-Link angeben."],
    open: { href: "https://www.jobup.ch/", label: "Zu jobup.ch" },
  },
];

const LABELS: Record<string, string> = {
  linkedin: "LinkedIn", indeed: "Indeed", "jobs.ch": "jobs.ch", "jobup.ch": "jobup.ch", google: "Google",
  jobfeed: "Jobportale (Feed)", whatsapp: "WhatsApp", "e-mail": "E-Mail", facebook: "Facebook", instagram: "Instagram", x: "X",
};

/** Display name of a source ref («linkedin» → «LinkedIn»). */
export function refLabel(ref: string) {
  return LABELS[ref.toLowerCase()] ?? ref.charAt(0).toUpperCase() + ref.slice(1);
}

/** Turns free text into a ref for a link («Plakat Bahnhof» → «plakat-bahnhof»). */
export function toRef(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

/** Recognises the source of a visit without ?ref= from the page it came from. */
export function refFromReferrer(referrer: string) {
  let host = "";
  try { host = new URL(referrer).hostname.replace(/^www\./, ""); } catch { return ""; }
  const known: [RegExp, string][] = [
    [/(^|\.)google\./, "google"], [/(^|\.)linkedin\.com$|^lnkd\.in$/, "linkedin"], [/(^|\.)indeed\./, "indeed"],
    [/(^|\.)jobs\.ch$/, "jobs.ch"], [/(^|\.)jobup\.ch$/, "jobup.ch"], [/(^|\.)facebook\.com$|^fb\.me$/, "facebook"],
    [/(^|\.)instagram\.com$/, "instagram"], [/^t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/, "x"],
  ];
  return known.find(([re]) => re.test(host))?.[1] ?? "";
}
