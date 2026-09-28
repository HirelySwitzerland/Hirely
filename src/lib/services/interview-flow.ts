/**
 * Interview flow model + execution engine (pure, no I/O).
 *
 * The same engine drives: live phone calls (Twilio <Gather>), the in-browser
 * voice/text interview, and the simulated mock-voice call. A flow is an ordered
 * list of nodes; `condition` nodes can jump to any node, and nodes marked
 * `branchOnly` are skipped in linear order unless a condition jumps to them.
 */

export type ConditionOp = "is_yes" | "is_no" | "gt" | "lt" | "contains" | "not_contains" | "is_empty";
export type Condition = { source: "answer" | "profile"; key: string; op: ConditionOp; value?: string | number };

export type NodeCategory = "general" | "motivation" | "experience" | "knockout" | "availability" | "salary" | "notice" | "closing";

export type FlowNode =
  | { id: string; type: "welcome"; text: string }
  | { id: string; type: "consent"; text: string; declineText: string }
  | {
      id: string;
      type: "question";
      text: string;
      category: NodeCategory;
      required: boolean;
      branchOnly?: boolean;
      requirementId?: string;
      expected?: "yes" | "no";
      followUp?: { mode: "none" | "if_short" | "always"; text?: string };
      personalized?: boolean;
    }
  | { id: string; type: "condition"; label: string; rules: { when: Condition; goto: string }[] }
  | { id: string; type: "message"; text: string; branchOnly?: boolean }
  | { id: string; type: "end"; text: string };

export type FlowAnswer = { nodeId: string; question: string; answer: string; category: NodeCategory; requirementId?: string; followUps: { q: string; a: string }[]; at: number };

export type FlowState = {
  cursor: string | null;
  pendingFollowUp?: { nodeId: string; text: string } | null;
  answers: Record<string, FlowAnswer>;
  visited: string[];
  done: boolean;
  outcome?: "completed" | "declined_consent" | "knockout";
  consent?: boolean;
};

export type FlowVars = Record<string, string | number | undefined>;
export type FlowProfile = { yearsExperience?: number; licenses?: string[]; languages?: string[]; skills?: string[]; latestRole?: string; latestCompany?: string };

export type Turn = { say: string[]; awaitingAnswer: boolean; state: FlowState; currentNodeId: string | null };

// ─────────────── answer interpretation (multilingual) ───────────────

const YES = /\b(ja|jawohl|genau|klar|natürlich|sicher|selbstverständlich|yes|yeah|yep|sure|of course|correct|oui|bien sûr|sì|si|certo|esatto|jo|jä|gärn|scho)\b/i;
const NO = /\b(nein|nicht|kein|keine|leider nicht|no|nope|not|don't|do not|haven't|non|pas|nessun|nö|nei)\b/i;

export function interpretYesNo(answer: string): "yes" | "no" | "unclear" {
  const a = answer.trim().toLowerCase();
  if (!a) return "unclear";
  const no = NO.test(a);
  const yes = YES.test(a);
  if (no && !/^(ja|yes|oui|sì)\b/.test(a)) return "no";
  if (yes) return "yes";
  if (no) return "no";
  return "unclear";
}

const NUM_WORDS: Record<string, number> = {
  ein: 1, eins: 1, einem: 1, one: 1, un: 1, uno: 1, zwei: 2, two: 2, deux: 2, due: 2, drei: 3, three: 3, trois: 3, tre: 3,
  vier: 4, four: 4, quatre: 4, quattro: 4, fünf: 5, five: 5, cinq: 5, cinque: 5, sechs: 6, six: 6, sei: 6, sieben: 7, seven: 7, sept: 7, sette: 7,
  acht: 8, eight: 8, huit: 8, otto: 8, neun: 9, nine: 9, neuf: 9, nove: 9, zehn: 10, ten: 10, dix: 10, dieci: 10, elf: 11, eleven: 11, zwölf: 12, twelve: 12,
  fünfzehn: 15, fifteen: 15, zwanzig: 20, twenty: 20,
};

export function extractNumber(answer: string): number | null {
  const m = answer.match(/(\d+(?:[.,]\d+)?)/);
  if (m) return Number(m[1].replace(",", "."));
  for (const w of answer.toLowerCase().split(/[^a-zäöüéèàì]+/)) if (NUM_WORDS[w] != null) return NUM_WORDS[w];
  return null;
}

export function extractSalary(answer: string): string | null {
  const vals: number[] = [];
  const re = /(\d{2,3})(?:\s*['’.\s]\s*000|\s*k\b|\s*tausend|\s*mille)|\b(\d{5,6})\b/gi;
  for (const m of answer.matchAll(re)) {
    const n = m[2] ? Number(m[2]) : Number(m[1]) * 1000;
    if (n >= 20000 && n <= 500000) vals.push(n);
  }
  if (!vals.length) return null;
  const sw = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return vals.length > 1 ? `CHF ${sw(Math.min(...vals))}–${sw(Math.max(...vals))}` : `CHF ${sw(vals[0])}`;
}

export function extractNotice(answer: string): string | null {
  const m = answer.match(/(\d+|ein|einen|eine|zwei|drei|vier|sechs|one|two|three|four|six)\s*(monat|monate|months?|mois|mesi|wochen|weeks?|semaines)/i);
  if (m) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUM_WORDS[m[1].toLowerCase().replace(/^einen?$|^eine$/, "ein")] ?? 1;
    const unit = /woche|week|semaine/i.test(m[2]) ? "week" : "month";
    return `${n} ${unit}${n > 1 ? "s" : ""}`;
  }
  if (/sofort|immediately|tout de suite|subito|keine kündigungsfrist|no notice/i.test(answer)) return "Immediately";
  return null;
}

export function extractAvailability(answer: string): string | null {
  const m = answer.match(/\b(ab|from|dès|dal|per)\b\s+/i);
  if (m && m.index != null) {
    const rest = answer.slice(m.index);
    const cut = rest.search(/(?<!\d)\.(\s|$)|[,;!?]/);
    return (cut > 0 ? rest.slice(0, cut) : rest).trim().slice(0, 60);
  }
  if (/sofort|immediately|right away|tout de suite|subito/i.test(answer)) return "Immediately";
  return answer.trim().length > 0 ? answer.trim().slice(0, 80) : null;
}

// ─────────────── engine ───────────────

export function fillVars(text: string, vars: FlowVars): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ""));
}

function indexOf(nodes: FlowNode[], id: string | null) {
  return id ? nodes.findIndex((n) => n.id === id) : -1;
}

function nextLinear(nodes: FlowNode[], fromIdx: number): FlowNode | null {
  for (let i = fromIdx + 1; i < nodes.length; i++) {
    const n = nodes[i];
    if ((n.type === "question" || n.type === "message") && n.branchOnly) continue;
    return n;
  }
  return null;
}

function evalCondition(c: Condition, state: FlowState, profile: FlowProfile): boolean {
  let value: unknown;
  if (c.source === "answer") value = state.answers[c.key]?.answer ?? "";
  else value = (profile as Record<string, unknown>)[c.key];
  const s = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  switch (c.op) {
    case "is_yes":
      return c.source === "answer" ? interpretYesNo(s) === "yes" : Boolean(Array.isArray(value) ? value.length : value);
    case "is_no":
      return c.source === "answer" ? interpretYesNo(s) === "no" : !(Array.isArray(value) ? value.length : value);
    case "gt": {
      const n = typeof value === "number" ? value : extractNumber(s);
      return n != null && n > Number(c.value);
    }
    case "lt": {
      const n = typeof value === "number" ? value : extractNumber(s);
      return n != null && n < Number(c.value);
    }
    case "contains":
      return s.toLowerCase().includes(String(c.value ?? "").toLowerCase());
    case "not_contains":
      return !s.toLowerCase().includes(String(c.value ?? "").toLowerCase());
    case "is_empty":
      return s.trim() === "";
  }
}

/** Walks forward from `node` emitting utterances until a node that needs an answer (or the end). */
function run(nodes: FlowNode[], node: FlowNode | null, state: FlowState, vars: FlowVars, profile: FlowProfile, say: string[]): Turn {
  let guard = 0;
  while (node && guard++ < 200) {
    state.visited.push(node.id);
    if (node.type === "welcome" || node.type === "message") {
      say.push(fillVars(node.text, vars));
      node = nextLinear(nodes, indexOf(nodes, node.id));
      continue;
    }
    if (node.type === "condition") {
      const hit = node.rules.find((r) => evalCondition(r.when, state, profile));
      node = hit ? nodes.find((n) => n.id === hit.goto) ?? nextLinear(nodes, indexOf(nodes, node.id)) : nextLinear(nodes, indexOf(nodes, node.id));
      continue;
    }
    if (node.type === "end") {
      say.push(fillVars(node.text, vars));
      state.cursor = null;
      state.done = true;
      state.outcome = state.outcome ?? "completed";
      return { say, awaitingAnswer: false, state, currentNodeId: null };
    }
    // consent / question → ask and wait
    say.push(fillVars(node.text, vars));
    state.cursor = node.id;
    return { say, awaitingAnswer: true, state, currentNodeId: node.id };
  }
  state.cursor = null;
  state.done = true;
  state.outcome = state.outcome ?? "completed";
  return { say, awaitingAnswer: false, state, currentNodeId: null };
}

export function startFlow(nodes: FlowNode[], vars: FlowVars, profile: FlowProfile = {}): Turn {
  const state: FlowState = { cursor: null, answers: {}, visited: [], done: false, pendingFollowUp: null };
  return run(nodes, nodes[0] ?? null, state, withProfileVars(vars, profile), profile, []);
}

function withProfileVars(vars: FlowVars, profile: FlowProfile): FlowVars {
  return { latestRole: profile.latestRole ?? "", latestCompany: profile.latestCompany ?? "", ...vars };
}

const DEFAULT_PROBE: Record<string, string> = {
  de: "Können Sie das bitte etwas genauer ausführen, zum Beispiel mit einem konkreten Beispiel?",
  en: "Could you tell me a bit more about that, perhaps with a concrete example?",
  fr: "Pourriez-vous préciser un peu, par exemple avec un exemple concret ?",
  it: "Potrebbe spiegare un po' meglio, magari con un esempio concreto?",
};

export function answerFlow(nodes: FlowNode[], prev: FlowState, answer: string, vars: FlowVars, profile: FlowProfile = {}, language = "de"): Turn {
  const state: FlowState = JSON.parse(JSON.stringify(prev));
  const v = withProfileVars(vars, profile);
  if (state.done || !state.cursor) return { say: [], awaitingAnswer: false, state, currentNodeId: null };
  const node = nodes.find((n) => n.id === state.cursor);
  if (!node) {
    state.done = true;
    return { say: [], awaitingAnswer: false, state, currentNodeId: null };
  }
  const clean = answer.trim().slice(0, 4000);

  if (node.type === "consent") {
    const yn = interpretYesNo(clean);
    state.consent = yn !== "no";
    state.answers[node.id] = { nodeId: node.id, question: node.text, answer: clean, category: "general", followUps: [], at: Date.now() };
    if (yn === "no") {
      state.done = true;
      state.cursor = null;
      state.outcome = "declined_consent";
      return { say: [fillVars(node.declineText, v)], awaitingAnswer: false, state, currentNodeId: null };
    }
    return run(nodes, nextLinear(nodes, indexOf(nodes, node.id)), state, v, profile, []);
  }

  if (node.type !== "question") return run(nodes, nextLinear(nodes, indexOf(nodes, node.id)), state, v, profile, []);

  // Answer to a pending follow-up
  if (state.pendingFollowUp && state.pendingFollowUp.nodeId === node.id) {
    state.answers[node.id]?.followUps.push({ q: state.pendingFollowUp.text, a: clean });
    state.pendingFollowUp = null;
    return run(nodes, nextLinear(nodes, indexOf(nodes, node.id)), state, v, profile, []);
  }

  state.answers[node.id] = { nodeId: node.id, question: fillVars(node.text, v), answer: clean, category: node.category, requirementId: node.requirementId, followUps: [], at: Date.now() };

  // Required question left empty → ask once more
  if (node.required && clean.length === 0) {
    state.pendingFollowUp = { nodeId: node.id, text: language === "de" ? "Entschuldigung, ich habe Sie nicht verstanden. Könnten Sie das bitte wiederholen?" : "Sorry, I didn't catch that. Could you please repeat?" };
    return { say: [state.pendingFollowUp.text], awaitingAnswer: true, state, currentNodeId: node.id };
  }

  const words = clean.split(/\s+/).filter(Boolean).length;
  const fu = node.followUp;
  const needsFollowUp = fu && (fu.mode === "always" || (fu.mode === "if_short" && words < 8)) && node.category !== "knockout";
  if (needsFollowUp) {
    const text = fillVars(fu!.text || DEFAULT_PROBE[language] || DEFAULT_PROBE.en, v);
    state.pendingFollowUp = { nodeId: node.id, text };
    return { say: [text], awaitingAnswer: true, state, currentNodeId: node.id };
  }
  return run(nodes, nextLinear(nodes, indexOf(nodes, node.id)), state, v, profile, []);
}

/** Structured extraction of the key logistics answers, used on the candidate profile. */
export function extractStructured(state: FlowState) {
  const answers = Object.values(state.answers);
  const byCat = (c: NodeCategory) => answers.find((a) => a.category === c);
  const joined = (a?: FlowAnswer) => (a ? [a.answer, ...a.followUps.map((f) => f.a)].join(" ") : "");
  const salaryA = byCat("salary");
  const noticeA = byCat("notice");
  const availA = byCat("availability");
  return {
    salaryExpectation: salaryA ? extractSalary(joined(salaryA)) ?? joined(salaryA).slice(0, 80) : null,
    noticePeriod: noticeA ? extractNotice(joined(noticeA)) ?? joined(noticeA).slice(0, 80) : availA ? extractNotice(joined(availA)) : null,
    availability: availA ? extractAvailability(joined(availA)) : null,
    knockoutFailures: answers
      .filter((a) => a.category === "knockout")
      .filter((a) => {
        const yn = interpretYesNo(a.answer);
        return yn !== "unclear" && yn !== "yes";
      })
      .map((a) => a.question),
    answered: answers.filter((a) => a.answer.trim()).length,
  };
}

// ─────────────── defaults ───────────────

const T = {
  de: {
    welcome: "Grüezi {{candidate}}, hier ist der Hirely Recruiting-Assistent von {{company}}. Sie haben sich für die Stelle als {{position}} beworben. Ich bin ein automatisierter KI-Interview-Assistent – das Gespräch dauert etwa 10 Minuten, und die Entscheidung über das weitere Vorgehen trifft immer ein Mensch aus unserem HR-Team.",
    consent: "Sind Sie damit einverstanden, dass dieses Gespräch aufgezeichnet und transkribiert wird, damit das HR-Team Ihre Antworten nachlesen kann?",
    decline: "Kein Problem, vielen Dank. Wir melden uns per E-Mail mit einer Alternative bei Ihnen. Auf Wiederhören!",
    motivation: "Was interessiert Sie an der Stelle als {{position}}?",
    personalized: "In Ihrem Lebenslauf erwähnen Sie Ihre Tätigkeit als {{latestRole}} bei {{latestCompany}}. Welche Aufgaben haben Sie dort hauptsächlich übernommen?",
    availability: "Ab wann könnten Sie die neue Stelle antreten?",
    notice: "Wie lange ist Ihre aktuelle Kündigungsfrist?",
    salary: "Was sind Ihre Lohnvorstellungen, brutto pro Jahr?",
    closing: "Gibt es noch etwas, das Sie uns mitteilen möchten, oder haben Sie Fragen zur Stelle?",
    end: "Vielen Dank für das Gespräch, {{candidate}}. Das HR-Team von {{company}} prüft Ihre Antworten persönlich und meldet sich in den nächsten Tagen bei Ihnen. Auf Wiederhören!",
    workPermit: "Sind Sie berechtigt, in der Schweiz zu arbeiten?",
    whyNot: "Können Sie kurz erläutern, wie Ihre Situation diesbezüglich aussieht?",
    leadership: "Sie haben bereits mehrjährige Erfahrung. Haben Sie in dieser Zeit auch Personen geführt oder angeleitet?",
  },
  en: {
    welcome: "Hello {{candidate}}, this is the Hirely recruiting assistant for {{company}}. You applied for the position of {{position}}. I am an automated AI interview assistant — this conversation takes about 10 minutes, and any decision about next steps is always made by a person from our HR team.",
    consent: "Do you agree that this conversation is recorded and transcribed so the HR team can review your answers?",
    decline: "No problem, thank you. We will contact you by email with an alternative. Goodbye!",
    motivation: "What interests you about the {{position}} position?",
    personalized: "Your CV mentions your role as {{latestRole}} at {{latestCompany}}. What were your main responsibilities there?",
    availability: "When could you start the new position?",
    notice: "What is your current notice period?",
    salary: "What are your salary expectations, gross per year?",
    closing: "Is there anything else you would like to share, or do you have questions about the role?",
    end: "Thank you for your time, {{candidate}}. The HR team at {{company}} will personally review your answers and get back to you in the next few days. Goodbye!",
    workPermit: "Are you legally allowed to work in Switzerland?",
    whyNot: "Could you briefly explain your situation?",
    leadership: "You already have several years of experience. Have you led or mentored other people during that time?",
  },
};

let seq = 0;
export const nid = (p: string) => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}`;

export type JobConfigForFlow = {
  language: string;
  questions: { id: string; type: "SCREENING" | "PHONE" | "KNOCKOUT"; text: string; requirementId: string | null; expectedAnswer: string | null; required: boolean }[];
  requirements: { id: string; category: string; label: string; minYears: number | null }[];
};

/** Builds a sensible default interview flow from the job's AI configuration. */
export function defaultFlow(cfg: JobConfigForFlow): FlowNode[] {
  const t = cfg.language === "en" ? T.en : T.de;
  const nodes: FlowNode[] = [
    { id: "welcome", type: "welcome", text: t.welcome },
    { id: "consent", type: "consent", text: t.consent, declineText: t.decline },
  ];
  const knockouts = cfg.questions.filter((q) => q.type === "KNOCKOUT");
  if (!knockouts.length) knockouts.push({ id: "ko_permit", type: "KNOCKOUT", text: t.workPermit, requirementId: null, expectedAnswer: "yes", required: true });
  for (const q of knockouts) {
    const id = `q_${q.id}`;
    nodes.push({ id, type: "question", text: q.text, category: "knockout", required: true, requirementId: q.requirementId ?? undefined, expected: (q.expectedAnswer as "yes" | "no") ?? "yes" });
    const whyId = `${id}_why`;
    nodes.push({ id: `c_${q.id}`, type: "condition", label: "If the answer is negative → ask why", rules: [{ when: { source: "answer", key: id, op: q.expectedAnswer === "no" ? "is_yes" : "is_no", value: undefined }, goto: whyId }] });
    nodes.push({ id: whyId, type: "question", text: t.whyNot, category: "general", required: false, branchOnly: true });
  }
  nodes.push({ id: "q_motivation", type: "question", text: t.motivation, category: "motivation", required: true, followUp: { mode: "if_short" } });
  nodes.push({ id: "q_personal", type: "question", text: t.personalized, category: "experience", required: false, personalized: true, followUp: { mode: "none" } });
  for (const q of cfg.questions.filter((x) => x.type !== "KNOCKOUT")) {
    nodes.push({ id: `q_${q.id}`, type: "question", text: q.text, category: "experience", required: q.required, requirementId: q.requirementId ?? undefined, followUp: { mode: q.type === "PHONE" ? "if_short" : "none" } });
  }
  nodes.push({ id: "c_leadership", type: "condition", label: "If candidate has more than 5 years experience → ask leadership question", rules: [{ when: { source: "profile", key: "yearsExperience", op: "gt", value: 5 }, goto: "q_leadership" }] });
  nodes.push({ id: "q_leadership", type: "question", text: t.leadership, category: "experience", required: false, branchOnly: true, followUp: { mode: "if_short" } });
  nodes.push({ id: "q_availability", type: "question", text: t.availability, category: "availability", required: true });
  nodes.push({ id: "q_notice", type: "question", text: t.notice, category: "notice", required: true });
  nodes.push({ id: "q_salary", type: "question", text: t.salary, category: "salary", required: false });
  nodes.push({ id: "q_closing", type: "question", text: t.closing, category: "closing", required: false });
  nodes.push({ id: "end", type: "end", text: t.end });
  return nodes;
}

export function validateFlow(nodes: FlowNode[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const n of nodes) {
    if (ids.has(n.id)) errors.push(`Duplicate node id "${n.id}".`);
    ids.add(n.id);
  }
  if (!nodes.some((n) => n.type === "end")) errors.push("The flow needs an End node.");
  if (nodes[0] && nodes[0].type !== "welcome") errors.push("The first node should be a Welcome node that discloses the AI.");
  for (const n of nodes) {
    if (n.type === "condition") for (const r of n.rules) if (!ids.has(r.goto)) errors.push(`Condition "${n.label}" jumps to a missing node.`);
    if ("text" in n && !n.text.trim()) errors.push(`Node "${n.id}" has no text.`);
  }
  const welcome = nodes.find((n) => n.type === "welcome");
  if (welcome && "text" in welcome && !/(KI|AI|automatis|IA|artificiel)/i.test(welcome.text))
    errors.push("The welcome message must clearly state that the candidate is talking to an AI.");
  return errors;
}
