import {
  ArrowRight, BarChart3, CalendarCheck, CheckCircle2, ClipboardList, FileSearch, FileText, Library, Lock, MailCheck, MessagesSquare,
  PhoneCall, Plug, Scale, ShieldCheck, UserCheck, Users, Video, Workflow, XCircle,
} from "lucide-react";
import { HeroVisual, WorkflowStrip } from "@/components/marketing/hero-visual";
import { LinkButton } from "@/components/ui";
import { PLANS, chf } from "@/lib/billing";

const PROBLEMS = [
  "Hunderte Lebensläufe lesen",
  "Immer gleiche E-Mails schreiben",
  "Kandidierende anrufen",
  "Immer dieselben Fragen stellen",
  "Gesprächsnotizen tippen",
  "Termine koordinieren",
  "Datensätze nachführen",
];

const SOLUTION = [
  { i: FileSearch, t: "Prüft Bewerbungen", d: "Jeder Lebenslauf wird strukturiert erfasst und mit Ihren Anforderungen abgeglichen – mit Belegen." },
  { i: MailCheck, t: "Kontaktiert Kandidierende", d: "Persönliche Nachrichten per E-Mail, SMS oder WhatsApp – innert Minuten und in der Sprache der Person." },
  { i: PhoneCall, t: "Führt Telefoninterviews", d: "Ein transparenter KI-Sprachassistent führt Ihr strukturiertes Vorabgespräch – rund um die Uhr." },
  { i: Video, t: "Führt digitale Interviews", d: "Video- oder Browser-Interviews für alle, die lieber dann antworten, wenn es ihnen passt." },
  { i: ClipboardList, t: "Fasst Gespräche zusammen", d: "Transkript, wichtigste Antworten, Verfügbarkeit, Kündigungsfrist und Lohnvorstellung – strukturiert." },
  { i: Users, t: "Ordnet Kandidierende", d: "Ein klarer Prozess mit Stufen, Notizen und durchsuchbarem Talent-Pool." },
  { i: CalendarCheck, t: "Vereinbart Termine", d: "Kandidierende wählen einen freien Termin aus Ihrem Kalender. Einladungen und Erinnerungen gehen automatisch raus." },
  { i: MessagesSquare, t: "Informiert HR", d: "„Neue Bewerbung bereit zur Prüfung.“ Ihr Team kommt erst ins Spiel, wenn ein Entscheid nötig ist." },
];

const STEPS = [
  { t: "Stelle erfassen", d: "Ein paar Stichworte genügen – Recruit24 schreibt ein professionelles Inserat und schlägt Anforderungen und Fragen vor." },
  { t: "Bewerbungen kommen rein", d: "Aus ATS, Karriereseite, E-Mail, CSV oder API. jobs.ch, LinkedIn und Indeed laufen über Ihr ATS." },
  { t: "Recruit24 prüft", d: "Lebensläufe werden ausgewertet, Fakten von Ableitungen getrennt und jede Anforderung mit Belegen geprüft." },
  { t: "Recruit24 meldet sich", d: "Passende Kandidierende erhalten eine freundliche Einladung zu einem kurzen Vorabgespräch – inklusive Erinnerungen." },
  { t: "KI-Interview", d: "Per Telefon, im Browser oder per Video. Ihre Fragen, Ihre Nachfragen, Ihre Ausschlusskriterien." },
  { t: "Klares Kandidatenprofil", d: "Transkript, Zusammenfassung, Belege, Verfügbarkeit und Lohnvorstellung an einem Ort." },
  { t: "Persönliches Gespräch", d: "Klick auf „Zum Gespräch einladen“ – die Person bucht einen Termin, der Kalendereintrag entsteht automatisch." },
];

const FEATURES = [
  { i: FileSearch, t: "KI-CV-Prüfung", d: "Erfahrung, Skills, Sprachen und Zertifikate strukturiert erfasst. Fakten und Ableitungen sauber getrennt." },
  { i: PhoneCall, t: "KI-Telefoninterviews", d: "Natürliche Gespräche mit Nachfragen – auf Deutsch, Schweizerdeutsch, Französisch, Italienisch und Englisch." },
  { i: Video, t: "KI-Video-Interviews", d: "Zeitversetzt und handytauglich. Ausgewertet wird nur der Inhalt – nie das Aussehen." },
  { i: MessagesSquare, t: "Kommunikation", d: "Anpassbare Vorlagen für jeden Schritt – per E-Mail, SMS und WhatsApp." },
  { i: CalendarCheck, t: "Terminbuchung", d: "Anbindung an Google Kalender und Microsoft 365, Selbstbuchung, Erinnerungen." },
  { i: FileText, t: "Kandidatenberichte", d: "Belege pro Anforderung: „Erfüllt 8 von 10 Anforderungen – und zwar deshalb.“" },
  { i: Plug, t: "ATS-Anbindung", d: "Personio, Workday, SAP SuccessFactors, Abacus, rexx und Recruitee über API und signierte Webhooks." },
  { i: BarChart3, t: "Auswertungen", d: "Zeit bis zum Interview, Zeit bis zur Einstellung, beste Quellen, Quoten und gesparte HR-Zeit." },
  { i: Library, t: "Talent-Pool", d: "Einwilligungsbasiert und in normaler Sprache durchsuchbar: „Elektroingenieure in der Ostschweiz“." },
  { i: Workflow, t: "KI-Recruiting-Assistent", d: "Visuelle Abläufe: warten, prüfen, einladen, erinnern, berichten, informieren – Ihr Prozess auf Autopilot." },
];

export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Für Schweizer KMU · Gehostet in der Schweiz
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-ink sm:text-6xl sm:leading-[1.05]">
            Ihr KI-Mitarbeiter fürs Recruiting.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            Recruit24 übernimmt die Routinearbeit im Recruiting – von der Bewerbungsprüfung über KI-Interviews bis zur Terminvereinbarung. So kann sich Ihr HR-Team auf Menschen konzentrieren statt auf Papierkram.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LinkButton href="/register" size="lg">
              Kostenlos starten <ArrowRight className="h-4 w-4" />
            </LinkButton>
            <LinkButton href="/demo" size="lg" variant="secondary">
              Demo vereinbaren
            </LinkButton>
          </div>
          <p className="mt-4 text-xs text-slate-500">14 Tage gratis · Keine Kreditkarte · In 10 Minuten eingerichtet</p>
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
            <p className="text-sm font-semibold text-brand-600">Das Problem</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Klassisches Recruiting macht viel unnötige Handarbeit.</h2>
            <p className="mt-4 text-slate-600">
              In einer Firma mit 300 Mitarbeitenden verbringt HR den Grossteil einer Rekrutierung mit Administration statt mit Menschen. Jede offene Stelle bedeutet Stunden mit Lesen, Telefonieren, Schreiben und Koordinieren – immer dieselben Schritte.
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
          <p className="text-sm font-semibold text-brand-600">Die Lösung</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Recruit24 arbeitet wie ein digitaler Recruiting-Mitarbeiter.</h2>
          <p className="mt-4 text-slate-600">Recruit24 arbeitet mit Ihrem HR-Team, folgt Ihrem Prozess und übergibt passende Kandidierende – jeder Schritt dokumentiert, jede Empfehlung begründet.</p>
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
            <p className="text-sm font-semibold text-brand-600">So funktioniert's</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Von der Bewerbung zum Gespräch – automatisch.</h2>
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
              <p className="mt-3 font-semibold text-ink">Sie entscheiden.</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">Recruit24 trifft nie den Anstellungsentscheid. Es bereitet ihn vor – nachvollziehbar.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand-600">Produkt</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Alles, was im Recruiting anfällt – erledigt.</h2>
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
            <p className="text-sm font-semibold text-brand-300">Nachvollziehbar von Grund auf</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Keine Blackbox. Kein „Die KI sagt, das ist die beste Person“.</h2>
            <p className="mt-4 text-slate-300">
              Recruit24 zeigt, was es gefunden hat und wo: <span className="text-white">„Diese Person erfüllt 8 von 10 Anforderungen. Hier sind die Belege.“</span> Jede Aussage verweist auf die Stelle im CV oder die Antwort im Interview. Ihr Team kann jede Bewertung anpassen.
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 text-ink shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <p className="text-sm font-semibold">Anforderungen · Marco Rossi</p>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">7 von 8 erfüllt</span>
            </div>
            {[
              ["Deutsch B2", "CV: „Deutsch (Muttersprache)“", "Erfüllt"],
              ["3 Jahre CNC-Erfahrung", "Interview: „Ich arbeite seit neun Jahren an 5-Achs-Maschinen.“", "Erfüllt"],
              ["Führerausweis Kat. B", "Interview: „Ja, ich habe den Ausweis Kategorie B.“", "Erfüllt"],
              ["SAP-Erfahrung", "Noch kein Beleg gefunden", "Info fehlt"],
            ].map(([r, e, s]) => (
              <div key={r} className="grid grid-cols-12 gap-2 border-b border-slate-50 py-2.5 text-[13px] last:border-0">
                <span className="col-span-4 font-medium">{r}</span>
                <span className="col-span-5 text-slate-500">{e}</span>
                <span className={`col-span-3 text-right text-xs font-medium ${s === "Erfüllt" ? "text-emerald-600" : "text-amber-600"}`}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="border-y border-slate-100 bg-slate-50/70">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-20 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-4">
            <p className="text-sm font-semibold text-brand-600">Vertrauen & Datenschutz</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-ink">Vertrauenswürdig genug für eine Schweizer HR-Abteilung.</h2>
          </div>
          {[
            { i: Scale, t: "Menschen entscheiden", d: "Die KI bereitet vor, Menschen entscheiden. Recruit24 kann niemandem selbst absagen oder jemanden einstellen." },
            { i: ShieldCheck, t: "revDSG & DSGVO", d: "Einwilligungen, Aufbewahrungsfristen, Löschung und Export auf Anfrage, lückenloses Protokoll." },
            { i: Lock, t: "Sicherheit", d: "Verschlüsselte Speicherung und Übertragung, strikte Mandantentrennung, Rollenrechte, 2FA und signierte Webhooks." },
            { i: CheckCircle2, t: "Fair & transparent", d: "Kandidierende wissen immer, dass sie mit einer KI sprechen. Keine geschützten Merkmale, keine Analyse des Aussehens." },
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
          <p className="text-sm font-semibold text-brand-600">Preise</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Einfache Pläne. Der Verbrauch wächst mit Ihrem Recruiting.</h2>
          <p className="mt-3 text-slate-600">Preise in CHF, exkl. MwSt. Bei jährlicher Zahlung sparen Sie rund 17 %.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div key={p.id} className={`flex flex-col rounded-2xl border p-6 ${p.id === "GROWTH" ? "border-brand-500 shadow-pop ring-1 ring-brand-500" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">{p.name}</p>
                {p.id === "GROWTH" && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">Am beliebtesten</span>}
              </div>
              <p className="mt-1 text-sm text-slate-500">{p.tagline}</p>
              <p className="mt-5 text-3xl font-semibold tracking-tight text-ink">
                {p.monthlyCents ? chf(p.monthlyCents, { decimals: false }) : "Individuell"}
                {p.monthlyCents && <span className="text-sm font-normal text-slate-500"> / Monat</span>}
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-600">
                <li>{p.positions ? `${p.positions} offene Stellen` : "Unbegrenzt Stellen"} · {p.seats ? `${p.seats} Benutzer` : "unbegrenzt Benutzer"}</li>
                <li>{p.included.VOICE_MINUTES.toLocaleString("de-CH")} KI-Telefonminuten</li>
                <li>{p.included.VIDEO_INTERVIEWS.toLocaleString("de-CH")} Video-Interviews</li>
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <LinkButton href={p.id === "ENTERPRISE" ? "/demo" : "/register"} variant={p.id === "GROWTH" ? "primary" : "secondary"} className="mt-6 w-full">
                {p.id === "ENTERPRISE" ? "Kontakt aufnehmen" : "Kostenlos starten"}
              </LinkButton>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">Mehrverbrauch: KI-Telefonminute CHF 0.45 · SMS CHF 0.12 · Video-Interview CHF 2.00 · CV-Auswertung CHF 0.15 · Zusätzliche Stelle CHF 29 / Monat.</p>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-50 to-white px-8 py-14 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink">Recruit24 erledigt die Routinearbeit im Recruiting.<br className="hidden sm:block" /> Die wichtigen Entscheide treffen Menschen.</h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LinkButton href="/register" size="lg">Kostenlos starten</LinkButton>
            <LinkButton href="/demo" size="lg" variant="secondary">Demo vereinbaren</LinkButton>
          </div>
        </div>
      </section>
    </main>
  );
}
