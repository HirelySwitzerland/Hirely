import {
  ArrowRight, BarChart3, CalendarCheck, CheckCircle2, ClipboardList, FileSearch, FileText, Library, Lock, MailCheck, MessagesSquare,
  PhoneCall, Plug, Scale, ShieldCheck, UserCheck, Users, Video, Workflow, XCircle,
} from "lucide-react";
import { HeroVisual, WorkflowStrip } from "@/components/marketing/hero-visual";
import { LinkButton } from "@/components/ui";
import { PLANS, chf } from "@/lib/billing";

const PROBLEMS = [
  "Reading hundreds of CVs",
  "Sending repetitive emails",
  "Calling candidates",
  "Asking the same questions",
  "Taking interview notes",
  "Coordinating appointments",
  "Updating candidate records",
];

const SOLUTION = [
  { i: FileSearch, t: "Analyzes applications", d: "Every CV is parsed into a structured profile and checked against your requirements — with evidence." },
  { i: MailCheck, t: "Contacts candidates", d: "Personal, on-brand messages by email, SMS or WhatsApp — within minutes, in the candidate's language." },
  { i: PhoneCall, t: "Conducts phone interviews", d: "A transparent AI voice assistant runs your structured pre-screening call, 24/7." },
  { i: Video, t: "Conducts digital interviews", d: "Asynchronous video or browser interviews for candidates who prefer to answer on their own time." },
  { i: ClipboardList, t: "Summarizes interviews", d: "Transcripts, key answers, availability, notice period and salary expectations — structured." },
  { i: Users, t: "Organizes candidates", d: "A clean pipeline with stages, comments and a searchable talent pool." },
  { i: CalendarCheck, t: "Schedules interviews", d: "Candidates pick a slot from your real calendar availability. Invites and reminders go out automatically." },
  { i: MessagesSquare, t: "Notifies HR", d: "“New candidate ready for review.” Your team only steps in when a decision is needed." },
];

const STEPS = [
  { t: "Create your position", d: "Describe the role in a few notes — Hirely writes a professional job ad and suggests requirements and questions." },
  { t: "Applications arrive", d: "From your ATS, career page, email, CSV or API. jobs.ch, LinkedIn and Indeed flow in through your ATS." },
  { t: "Hirely analyzes candidates", d: "CVs are parsed, confirmed facts are separated from inferences, and every requirement is checked with evidence." },
  { t: "Hirely contacts candidates", d: "Qualified candidates receive a friendly invitation to a short pre-screening — reminders included." },
  { t: "AI interview", d: "By phone, in the browser or on video. Your questions, your follow-ups, your knockout criteria." },
  { t: "Structured candidate profile", d: "Transcript, summary, requirement evidence, availability and salary expectations in one place." },
  { t: "Personal interview", d: "Click “Invite to personal interview” — the candidate books a slot, the calendar event is created." },
];

const FEATURES = [
  { i: FileSearch, t: "AI CV Screening", d: "Structured extraction of experience, skills, languages and certificates. Confirmed vs. inferred, never mixed up." },
  { i: PhoneCall, t: "AI Phone Interviews", d: "Natural conversations with interruptions and follow-ups, in German, Swiss German, French, Italian and English." },
  { i: Video, t: "AI Video Interviews", d: "Asynchronous, mobile-friendly. Only the content of answers is analyzed — never appearance." },
  { i: MessagesSquare, t: "Candidate Communication", d: "Editable templates for every step, across email, SMS and WhatsApp." },
  { i: CalendarCheck, t: "Automated Scheduling", d: "Google Calendar and Microsoft 365 integration, self-service booking, reminders." },
  { i: FileText, t: "Candidate Reports", d: "Requirement-by-requirement evidence: “meets 8 of 10 configured requirements — here is why.”" },
  { i: Plug, t: "ATS Integration", d: "Personio, Workday, SAP SuccessFactors, Abacus, rexx and Recruitee via API and signed webhooks." },
  { i: BarChart3, t: "Recruiting Analytics", d: "Time to interview, time to hire, source performance, conversion rates and HR time saved." },
  { i: Library, t: "Talent Pool", d: "Consent-based pool you can search in plain language: “electrical engineers in Eastern Switzerland”." },
  { i: Workflow, t: "AI Recruiting Agent", d: "Visual automations: wait, analyze, invite, remind, report, notify — your process, on autopilot." },
];

export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Made for Swiss SMEs · Hosted in Switzerland
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-ink sm:text-6xl sm:leading-[1.05]">
            Your AI Recruiting Employee.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            Hirely automates the repetitive parts of recruiting — from application screening to AI interviews and interview scheduling — so your HR team can focus on people, not paperwork.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LinkButton href="/register" size="lg">
              Start free <ArrowRight className="h-4 w-4" />
            </LinkButton>
            <LinkButton href="/demo" size="lg" variant="secondary">
              Book a demo
            </LinkButton>
          </div>
          <p className="mt-4 text-xs text-slate-500">14-day trial · No credit card · Set up in under 10 minutes</p>
          <WorkflowStrip />
          <div className="mt-12">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-t border-slate-100 bg-slate-50/70">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-brand-600">The problem</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Traditional recruiting creates unnecessary manual work.</h2>
            <p className="mt-4 text-slate-600">
              An HR generalist in a 300-person company spends most of a hiring cycle on administration, not on people. Every open position means hours of reading, calling, writing and coordinating — the same steps, over and over.
            </p>
          </div>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {PROBLEMS.map((p) => (
              <li key={p} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-card">
                <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Solution */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand-600">The solution</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Hirely acts as a digital recruiting employee.</h2>
          <p className="mt-4 text-slate-600">It works alongside your HR team, follows your process and hands over qualified candidates — with every step documented and every recommendation explained.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SOLUTION.map(({ i: Icon, t, d }) => (
            <div key={t} className="rounded-xl border border-slate-200 p-5">
              <Icon className="h-5 w-5 text-brand-600" />
              <p className="mt-3 font-semibold text-ink">{t}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-slate-100 bg-slate-50/70">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-brand-600">How it works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">From application to interview — automatically.</h2>
          </div>
          <ol className="mt-12 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.t} className="relative">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">{i + 1}</div>
                <p className="mt-4 font-semibold text-ink">{s.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.d}</p>
              </li>
            ))}
            <li className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-5">
              <UserCheck className="h-5 w-5 text-brand-600" />
              <p className="mt-3 font-semibold text-ink">You decide.</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">Hirely never makes the hiring decision. It prepares it — transparently.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand-600">Product</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Everything your recruiting desk does — handled.</h2>
        </div>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map(({ i: Icon, t, d }) => (
            <div key={t} className="bg-white p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-4 font-semibold text-ink">{t}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Evidence example */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid items-center gap-10 rounded-2xl bg-ink p-8 text-white sm:p-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-brand-300">Explainable by design</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">No black box. No “AI says this is the best candidate.”</h2>
            <p className="mt-4 text-slate-300">
              Hirely reports what it found and where: <span className="text-white">“This candidate meets 8 of 10 configured job requirements. Here is the evidence.”</span> Every statement links to the CV line or the interview answer it comes from. Recruiters can override any evaluation.
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 text-ink shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <p className="text-sm font-semibold">Requirements · Marco Rossi</p>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">7 of 8 met</span>
            </div>
            {[
              ["German B2", "CV: “Deutsch (Muttersprache)”", "Confirmed"],
              ["3 years CNC experience", "Interview: “I have been working on 5-axis machines for nine years.”", "Confirmed"],
              ["Driver's license cat. B", "Interview: “Yes, I have a category B licence.”", "Confirmed"],
              ["SAP experience", "No evidence found yet", "Missing info"],
            ].map(([r, e, s]) => (
              <div key={r} className="grid grid-cols-12 gap-2 border-b border-slate-50 py-2.5 text-[13px] last:border-0">
                <span className="col-span-4 font-medium">{r}</span>
                <span className="col-span-5 text-slate-500">{e}</span>
                <span className={`col-span-3 text-right text-xs font-medium ${s === "Confirmed" ? "text-emerald-600" : "text-amber-600"}`}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="border-y border-slate-100 bg-slate-50/70">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-20 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-4">
            <p className="text-sm font-semibold text-brand-600">Trust & privacy</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-ink">Trustworthy enough for a Swiss HR department.</h2>
          </div>
          {[
            { i: Scale, t: "Humans decide", d: "AI prepares, people decide. Hirely cannot reject or hire anyone on its own." },
            { i: ShieldCheck, t: "revDSG & GDPR", d: "Consent management, retention periods, deletion and export on request, full audit log." },
            { i: Lock, t: "Security", d: "Encryption at rest and in transit, strict tenant isolation, RBAC, 2FA and signed webhooks." },
            { i: CheckCircle2, t: "Fair & transparent", d: "Candidates always know they talk to an AI. No protected characteristics, no appearance analysis." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
              <Icon className="h-5 w-5 text-brand-600" />
              <p className="mt-3 font-semibold text-ink">{t}</p>
              <p className="mt-1.5 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold text-brand-600">Pricing</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Simple plans. Usage that scales with your hiring.</h2>
          <p className="mt-3 text-slate-600">Prices in CHF, excl. VAT. Annual billing saves ~17%.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div key={p.id} className={`flex flex-col rounded-2xl border p-6 ${p.id === "GROWTH" ? "border-brand-500 shadow-pop ring-1 ring-brand-500" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">{p.name}</p>
                {p.id === "GROWTH" && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">Most popular</span>}
              </div>
              <p className="mt-1 text-sm text-slate-500">{p.tagline}</p>
              <p className="mt-5 text-3xl font-semibold tracking-tight text-ink">
                {p.monthlyCents ? chf(p.monthlyCents, { decimals: false }) : "Custom"}
                {p.monthlyCents && <span className="text-sm font-normal text-slate-500"> / month</span>}
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-600">
                <li>{p.positions ? `${p.positions} open positions` : "Unlimited positions"} · {p.seats ? `${p.seats} users` : "unlimited users"}</li>
                <li>{p.included.VOICE_MINUTES.toLocaleString("de-CH")} AI phone minutes</li>
                <li>{p.included.VIDEO_INTERVIEWS.toLocaleString("de-CH")} video interviews</li>
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <LinkButton href={p.id === "ENTERPRISE" ? "/demo" : "/register"} variant={p.id === "GROWTH" ? "primary" : "secondary"} className="mt-6 w-full">
                {p.id === "ENTERPRISE" ? "Contact sales" : "Start free"}
              </LinkButton>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">Usage beyond included quotas: AI phone minute CHF 0.45 · SMS CHF 0.12 · Video interview CHF 2.00 · CV analysis CHF 0.15 · Additional position CHF 29 / month.</p>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-50 to-white px-8 py-14 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink">Hirely handles the repetitive recruiting work.<br className="hidden sm:block" /> Humans handle the important decisions.</h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LinkButton href="/register" size="lg">Start free</LinkButton>
            <LinkButton href="/demo" size="lg" variant="secondary">Book a demo</LinkButton>
          </div>
        </div>
      </section>
    </main>
  );
}
