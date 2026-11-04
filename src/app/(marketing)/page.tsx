import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, BarChart3, Building2, CalendarCheck, Check, ChevronDown, CircleSlash, EyeOff, FileSearch, Globe2, Library, Lock, MessagesSquare,
  PhoneCall, Play, Plug, ScrollText, ShieldCheck, UserCheck, UserRound, Video,
} from "lucide-react";
import { type StoryStep } from "@/components/marketing/scroll-story";
import { Film } from "@/components/marketing/film";
import { Hoerprobe } from "@/components/marketing/hoerprobe";
import { PLANS, chf } from "@/lib/billing";
import { cn } from "@/lib/utils";

export const metadata = {
  title: { absolute: "Recruit24 – Ihr KI-Mitarbeiter fürs Recruiting" },
  description: "Recruit24 prüft Bewerbungen, führt das Vorabgespräch am Telefon oder online und vereinbart Termine – rund um die Uhr. Entscheiden tun immer Sie. Entwickelt in der Schweiz.",
};

const TRUST = [
  { i: Building2, t: "Entwickelt in der Schweiz" },
  { i: ShieldCheck, t: "revDSG & DSGVO" },
  { i: UserCheck, t: "Der Mensch entscheidet" },
  { i: Globe2, t: "DE · FR · IT · EN" },
  { i: Lock, t: "Verschlüsselt & protokolliert" },
];

const STEPS: StoryStep[] = [
  {
    label: "Bewerbung", title: "In zwei Minuten beworben.",
    text: "Bewerbungen kommen über Ihre Karriereseite oder Ihr bestehendes ATS. Recruit24 liest jeden Lebenslauf und prüft ihn gegen die Anforderungen der Stelle.",
    points: ["Ohne Konto und ohne App – auch am Handy", "Kurze Ja/Nein-Fragen, z. B. zum Führerausweis", "Fakten und Belege statt Bauchgefühl"],
    image: "/marketing/schritt-bewerbung.webp", alt: "Stelleninserat Servicetechniker/in mit Bewerbungsformular",
  },
  {
    label: "KI-Interview", title: "Das Vorabgespräch führt Recruit24.",
    text: "Passende Personen werden in Minuten eingeladen und wählen selbst: Anruf sofort, Anruf zur Wunschzeit oder Gespräch im Browser – auch am Sonntagabend.",
    points: ["Stellt sich immer als KI vor", "Ihre Fragen, Ihre Nachfragen, Ihre Ausschlusskriterien", "Rund 10 Minuten, rund um die Uhr"],
    image: "/marketing/schritt-interview.webp", alt: "Laufendes KI-Vorabgespräch im Browser mit Fragen und Antworten",
  },
  {
    label: "Ihr Entscheid", title: "Sie sehen sofort, wer passt.",
    text: "Zusammenfassung, Belege pro Anforderung, Verfügbarkeit, Kündigungsfrist und Lohnvorstellung – auf einer Seite. Der nächste Schritt ist ein Klick.",
    points: ["Zum Gespräch einladen, vormerken oder absagen", "Jede Bewertung können Sie anpassen", "Absagen gehen nie automatisch raus"],
    image: "/marketing/schritt-entscheid.webp", alt: "Profil von Max Muster mit dem nächsten Schritt: einladen, engere Wahl oder absagen",
  },
  {
    label: "Termin", title: "Der Termin bucht sich selbst.",
    text: "Die Person wählt einen freien Termin aus Ihrem Kalender. Kalendereintrag, Bestätigung und Erinnerung entstehen automatisch.",
    points: ["Google Kalender und Microsoft 365", "Erinnerung vor dem Gespräch", "Kein Hin und Her per E-Mail"],
    image: "/marketing/schritt-termin.webp", alt: "Terminwahl für das persönliche Gespräch mit freien Zeiten",
  },
];

const FEATURES = [
  { i: FileSearch, t: "CV-Prüfung mit Belegen", d: "Erfahrung, Skills, Sprachen und Zertifikate – jede Anforderung mit Fundstelle im Lebenslauf." },
  { i: PhoneCall, t: "Telefon- & Browser-Interviews", d: "Natürliche Gespräche mit Nachfragen, auf Deutsch, Französisch, Italienisch und Englisch." },
  { i: Video, t: "Video-Interviews", d: "Zeitversetzt und handytauglich. Bewertet wird nur der Inhalt, nie das Aussehen." },
  { i: CalendarCheck, t: "Terminbuchung", d: "Selbstbuchung aus Ihrem Kalender, mit Bestätigung und Erinnerungen." },
  { i: MessagesSquare, t: "Kommunikation", d: "Anpassbare Vorlagen für jeden Schritt – per E-Mail, SMS und WhatsApp." },
  { i: Plug, t: "ATS & Karriereseite", d: "Anbindung an Personio, Abacus, SuccessFactors und weitere – oder die eigene Karriereseite." },
  { i: BarChart3, t: "Auswertungen", d: "Zeit bis zum Interview, beste Quellen, Quoten und gesparte HR-Zeit." },
  { i: Library, t: "Talent-Pool", d: "Mit Einwilligung, in normaler Sprache durchsuchbar: «Elektroingenieure in der Ostschweiz»." },
];

const NEVER = [
  { i: CircleSlash, t: "Sagt nie selbst ab", d: "Absagen und Einstellungen sind technisch Menschen vorbehalten." },
  { i: EyeOff, t: "Bewertet nie Aussehen oder Stimme", d: "Keine geschützten Merkmale, keine Gesichts- oder Stimmanalyse." },
  { i: UserRound, t: "Gibt sich nie als Mensch aus", d: "Bewerbende wissen immer, dass sie mit einer KI sprechen." },
  { i: ScrollText, t: "Arbeitet nie im Verborgenen", d: "Jeder Schritt wird protokolliert – Export und Löschung auf Anfrage." },
];

const FAQ = [
  ["Entscheidet die KI, wen wir einstellen?", "Nein. Recruit24 prüft, fragt nach und fasst zusammen. Wer eingeladen, eingestellt oder abgesagt wird, entscheidet immer eine Person aus Ihrem Team – das ist technisch so eingebaut."],
  ["Wissen Bewerbende, dass sie mit einer KI sprechen?", "Ja, immer. Die KI stellt sich zu Beginn als KI vor, erklärt, dass am Schluss ein Mensch entscheidet, und fragt nach dem Einverständnis zur Aufnahme."],
  ["Wie steht es um den Datenschutz?", "Recruit24 ist auf das Schweizer Datenschutzgesetz (revDSG) und die DSGVO ausgelegt: Einwilligungen, Aufbewahrungsfristen, Export und Löschung auf Anfrage, lückenloses Protokoll. Daten werden verschlüsselt gespeichert und übertragen; im Business-Plan liegen sie ausschliesslich in der Schweiz."],
  ["Brauchen wir ein neues ATS?", "Nein. Recruit24 arbeitet mit Ihrem bestehenden System (z. B. Personio, Abacus, SuccessFactors) zusammen. Ohne ATS nutzen Sie einfach die mitgelieferte Karriereseite."],
  ["Was brauchen Bewerbende?", "Nichts ausser einem Telefon oder Browser. Sie erhalten einen Link per E-Mail oder SMS – ohne Konto, ohne App."],
  ["Wie schnell sind wir startklar?", "Die erste Stelle ist in rund zehn Minuten eingerichtet: Stichworte eingeben, Recruit24 schlägt Inserat, Anforderungen und Interviewfragen vor, Sie passen an und veröffentlichen."],
  ["Was passiert nach den 14 Testtagen?", "Sie wählen einen Plan, der zu Ihrem Recruiting passt. Für die Testphase brauchen Sie keine Kreditkarte."],
];

export default function LandingPage() {
  return (
    <main className="marketing-root">
      {/* Start */}
      <section className="relative overflow-hidden bg-night">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-20%] h-[720px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(122,104,230,0.35),transparent)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-0 pt-20 text-center sm:px-8 sm:pt-28">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[13px] font-medium text-white/75">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />KI-Recruiting aus der Schweiz – für KMU
          </p>
          <h1 className="mx-auto mt-8 max-w-5xl text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-white sm:text-[72px] lg:text-[84px]">
            Ihr KI-Mitarbeiter<br /><span className="bg-gradient-to-r from-brand-300 via-brand-200 to-[#FDBA74] bg-clip-text text-transparent">fürs Recruiting.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-[18px] leading-relaxed text-white/70 [text-wrap:balance] sm:text-[20px]">
            Recruit24 prüft Bewerbungen, führt das Vorabgespräch am Telefon oder online und vereinbart Termine – rund um die Uhr. <span className="text-white">Entscheiden tun immer Sie.</span>
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-[16px] font-semibold text-night shadow-lg transition hover:bg-brand-50">
              14 Tage kostenlos testen <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/demo" className="inline-flex h-12 items-center rounded-xl border border-white/20 px-6 text-[16px] font-medium text-white transition hover:bg-white/10">
              Demo vereinbaren
            </Link>
          </div>
          <a href="#hoerprobe" className="mt-6 inline-flex items-center gap-2 text-[14px] text-white/60 transition hover:text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/25"><Play className="ml-px h-3 w-3" /></span>
            Hörprobe: So klingt ein KI-Vorabgespräch
          </a>
          <p className="mx-auto mt-20 flex max-w-md flex-col items-center gap-3 pb-16 text-[14px] text-white/55">
            <span className="h-10 w-px bg-gradient-to-b from-transparent to-white/40" />
            Begleiten Sie eine Bewerbung durch 24 Stunden
          </p>
        </div>
      </section>

      {/* Film: eine Bewerbung in 24 Stunden */}
      <Film fallback={STEPS} />

      <div id="nach-film" className="scroll-mt-16" />
      {/* Vertrauensleiste */}
      <section className="border-b border-slate-200 bg-white">
        <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-4 px-4 py-7 sm:px-8 md:grid-cols-5">
          {TRUST.map(({ i: Icon, t }) => (
            <li key={t} className="flex items-center justify-center gap-2.5 text-[14px] font-medium text-slate-700 md:justify-start">
              <Icon className="h-[18px] w-[18px] shrink-0 text-brand-600" />{t}
            </li>
          ))}
        </ul>
      </section>

      {/* Hörprobe */}
      <section id="hoerprobe" className="scroll-mt-16 bg-night">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-28 sm:px-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Eyebrow dark>Hörprobe</Eyebrow>
            <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[48px]">So klingt ein Vorabgespräch.</h2>
            <p className="mt-6 text-[18px] leading-relaxed text-white/70">
              Recruit24 ruft an, stellt sich als KI vor, bittet um das Einverständnis zur Aufnahme und stellt die Fragen Ihrer Stelle. Bei zu kurzen Antworten fragt es freundlich nach.
            </p>
            <ul className="mt-8 space-y-3 text-[15px] text-white/80">
              {["Transkript und Aufnahme landen im Profil", "Verfügbarkeit, Kündigungsfrist und Lohn werden erfasst", "Am Telefon und im Browser gleich"].map((x) => (
                <li key={x} className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />{x}</li>
              ))}
            </ul>
            <p className="mt-8 text-[13px] text-white/45">Beispielgespräch mit einer erfundenen Person. Die Stimmen sind künstlich erzeugt.</p>
          </div>
          <div className="lg:col-span-7"><Hoerprobe /></div>
        </div>
      </section>

      {/* Funktionen */}
      <section id="funktionen" className="scroll-mt-16 mx-auto max-w-7xl px-4 py-28 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow>Funktionen</Eyebrow>
            <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[48px]">Alles, was im Recruiting anfällt.</h2>
          </div>
          <p className="text-[18px] leading-relaxed text-slate-600 lg:col-span-5">Eine Software statt fünf Werkzeuge – und Ihr Team sieht jederzeit, was gerade passiert.</p>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ i: Icon, t, d }) => (
            <div key={t} className="bg-white p-7 transition hover:bg-[#FAFAFC]">
              <Icon className="h-6 w-6 text-brand-600" strokeWidth={1.75} />
              <p className="mt-6 text-[17px] font-semibold text-ink">{t}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Nachvollziehbar */}
      <section className="mx-auto max-w-7xl px-4 pb-28 sm:px-8">
        <div className="grid items-center gap-12 rounded-3xl border border-slate-200 bg-[#FAFAFC] p-8 sm:p-14 lg:grid-cols-2">
          <div>
            <Eyebrow>Nachvollziehbar</Eyebrow>
            <h2 className="mt-4 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[40px]">Keine Blackbox.<br />Keine geheime Punktzahl.</h2>
            <p className="mt-6 text-[17px] leading-relaxed text-slate-600">
              Recruit24 zeigt, was es gefunden hat und wo: <span className="font-medium text-ink">«Erfüllt 7 von 8 Anforderungen – hier sind die Belege.»</span> Jede Aussage verweist auf den Lebenslauf oder eine Antwort im Interview. Ihr Team kann jede Bewertung anpassen.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_30px_60px_-30px_rgba(19,17,42,0.25)]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <p className="text-[15px] font-semibold">Anforderungen · Marco Rossi</p>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">7 von 8 erfüllt</span>
            </div>
            {[
              ["Deutsch B2", "Lebenslauf: «Deutsch (Muttersprache)»", true],
              ["3 Jahre CNC-Erfahrung", "Interview: «Ich arbeite seit neun Jahren an 5-Achs-Maschinen.»", true],
              ["Führerausweis Kat. B", "Interview: «Ja, ich habe den Ausweis Kategorie B.»", true],
              ["SAP-Erfahrung", "Noch kein Beleg gefunden", false],
            ].map(([r, e, ok]) => (
              <div key={String(r)} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-b border-slate-50 py-3.5 text-[14px] last:border-0 sm:grid-cols-12">
                <span className="font-medium sm:col-span-4">{r}</span>
                <span className="order-3 col-span-2 text-slate-500 sm:order-none sm:col-span-5">{e}</span>
                <span className={cn("text-right text-[13px] font-medium sm:col-span-3", ok ? "text-emerald-600" : "text-amber-600")}>{ok ? "Erfüllt" : "Info fehlt"}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vertrauen */}
      <section id="vertrauen" className="scroll-mt-16 border-y border-slate-200 bg-[#FAFAFC]">
        <div className="mx-auto max-w-7xl px-4 py-28 sm:px-8">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <Eyebrow>Vertrauen & Datenschutz</Eyebrow>
              <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[48px]">Was Recruit24 nie tut.</h2>
            </div>
            <p className="text-[18px] leading-relaxed text-slate-600 lg:col-span-5">Gebaut für Schweizer HR-Abteilungen, Datenschutzberatungen und Bewerbende, die wissen wollen, woran sie sind.</p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {NEVER.map(({ i: Icon, t, d }) => (
              <div key={t} className="rounded-2xl border border-slate-200 bg-white p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
                <p className="mt-6 text-[17px] font-semibold text-ink">{t}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 text-[15px] sm:grid-cols-3">
            {[["revDSG & DSGVO", "Einwilligungen, Aufbewahrungsfristen, Export und Löschung auf Anfrage."], ["Sicherheit", "Verschlüsselte Speicherung und Übertragung, Rollenrechte, Zwei-Faktor-Anmeldung."], ["Getrennte Firmenbereiche", "Jede Firma sieht nur ihre eigenen Daten – strikt getrennt."]].map(([t, d]) => (
              <div key={t} className="bg-white p-6"><p className="font-semibold text-ink">{t}</p><p className="mt-1.5 text-slate-600">{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Preise */}
      <section id="preise" className="scroll-mt-16 mx-auto max-w-7xl px-4 py-28 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow center>Preise</Eyebrow>
          <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[48px]">Klare Preise in Franken.</h2>
          <p className="mt-5 text-[18px] text-slate-600">14 Tage kostenlos testen, ohne Kreditkarte. Bei jährlicher Zahlung sparen Sie rund 17 %.</p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p) => {
            const hot = p.id === "GROWTH";
            return (
              <div key={p.id} className={cn("relative flex flex-col rounded-2xl border p-7", hot ? "border-night bg-night text-white shadow-[0_40px_80px_-40px_rgba(19,17,42,0.6)]" : "border-slate-200 bg-white")}>
                {hot && <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-brand-500 to-[#F97A3A] px-3 py-1 text-[12px] font-semibold text-white">Am beliebtesten</span>}
                <p className={cn("text-[17px] font-semibold", hot ? "text-white" : "text-ink")}>{p.name}</p>
                <p className={cn("mt-1.5 min-h-[44px] text-[14px] leading-snug", hot ? "text-white/65" : "text-slate-500")}>{p.tagline}</p>
                <p className="mt-6 flex flex-wrap items-baseline gap-x-1.5">
                  <span className={cn("whitespace-nowrap text-[36px] font-semibold tracking-[-0.03em]", hot ? "text-white" : "text-ink")}>{p.monthlyCents ? chf(p.monthlyCents, { decimals: false }) : "Individuell"}</span>
                  {p.monthlyCents && <span className={cn("text-[14px]", hot ? "text-white/60" : "text-slate-500")}>/ Monat</span>}
                </p>
                <p className={cn("mt-1 min-h-[20px] text-[13px]", hot ? "text-white/55" : "text-slate-500")}>{p.annualMonthlyCents ? `jährlich ${chf(p.annualMonthlyCents, { decimals: false })} / Monat` : "Auf Ihr Volumen zugeschnitten"}</p>
                <Link
                  href={p.id === "ENTERPRISE" ? "/demo" : "/register"}
                  className={cn("mt-6 inline-flex h-11 items-center justify-center rounded-xl text-[15px] font-semibold transition", hot ? "bg-white text-night hover:bg-brand-50" : "border border-slate-300 text-ink hover:border-slate-400 hover:bg-slate-50")}
                >
                  {p.id === "ENTERPRISE" ? "Kontakt aufnehmen" : "Kostenlos testen"}
                </Link>
                <ul className={cn("mt-7 flex-1 space-y-2.5 border-t pt-6 text-[14px]", hot ? "border-white/10 text-white/80" : "border-slate-100 text-slate-600")}>
                  <li className={cn("font-medium", hot ? "text-white" : "text-ink")}>{p.positions ? `${p.positions} offene Stellen` : "Unbegrenzt Stellen"} · {p.seats ? `${p.seats} Benutzer` : "unbegrenzt Benutzer"}</li>
                  <li>{p.included.VOICE_MINUTES.toLocaleString("de-CH")} KI-Telefonminuten</li>
                  <li>{p.included.VIDEO_INTERVIEWS.toLocaleString("de-CH")} Video-Interviews</li>
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5"><Check className={cn("mt-0.5 h-4 w-4 shrink-0", hot ? "text-brand-300" : "text-brand-600")} />{f}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-8 text-center text-[13px] text-slate-500">Preise in CHF, exkl. MwSt. Mehrverbrauch: KI-Telefonminute CHF 0.45 · SMS CHF 0.12 · Video-Interview CHF 2.00 · CV-Auswertung CHF 0.15 · zusätzliche Stelle CHF 29 / Monat.</p>
      </section>

      {/* Für Unternehmen / Bewerbende */}
      <section className="mx-auto max-w-7xl px-4 pb-28 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="relative overflow-hidden rounded-3xl bg-night p-8 text-white sm:p-12 lg:col-span-3">
            <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(122,104,230,0.45),transparent)]" />
            <p className="relative text-[13px] font-semibold uppercase tracking-[0.14em] text-brand-300">Für Unternehmen</p>
            <h3 className="relative mt-4 text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-[36px]">Starten Sie mit Ihrer ersten Stelle – heute noch.</h3>
            <p className="relative mt-4 max-w-lg text-[17px] leading-relaxed text-white/70">Konto erstellen, Stelle erfassen, veröffentlichen. 14 Tage kostenlos, ohne Kreditkarte.</p>
            <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-[16px] font-semibold text-night transition hover:bg-brand-50">Konto erstellen <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 px-6 text-[16px] font-medium text-white transition hover:bg-white/10">Anmelden</Link>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-[#FAFAFC] p-8 sm:p-12 lg:col-span-2">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-500">Für Bewerbende</p>
            <h3 className="mt-4 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink">Sie haben eine Einladung erhalten?</h3>
            <p className="mt-4 text-[16px] leading-relaxed text-slate-600">Öffnen Sie einfach den Link in Ihrer E-Mail oder SMS. Sie brauchen kein Konto und keine App – und Sie sprechen immer mit einer gekennzeichneten KI.</p>
            <Image src="/marketing/interview-wahl.webp" alt="Auswahl für das Vorabgespräch: jetzt anrufen, Anruf planen oder im Browser" width={1240} height={1160} sizes="(min-width: 1024px) 420px, 100vw" className="mt-8 h-auto w-full max-w-sm rounded-xl border border-slate-200 shadow-[0_20px_40px_-24px_rgba(19,17,42,0.3)]" />
          </div>
        </div>
      </section>

      {/* Fragen */}
      <section id="fragen" className="scroll-mt-16 border-t border-slate-200 bg-[#FAFAFC]">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-28 sm:px-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Eyebrow>Häufige Fragen</Eyebrow>
            <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[44px]">Gut zu wissen.</h2>
            <p className="mt-5 text-[17px] text-slate-600">Noch etwas offen? <Link href="/demo" className="font-medium text-brand-700 underline-offset-4 hover:underline">Sprechen Sie mit uns.</Link></p>
          </div>
          <div className="divide-y divide-slate-200 border-y border-slate-200 lg:col-span-8">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[17px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {q}<ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Schluss */}
      <section className="relative overflow-hidden bg-night">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(122,104,230,0.3),transparent)]" />
        <div className="relative mx-auto max-w-4xl px-4 py-28 text-center sm:px-8">
          <h2 className="text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-[60px]">Weniger Routine.<br />Mehr Zeit für Menschen.</h2>
          <p className="mx-auto mt-6 max-w-xl text-[18px] text-white/70">Recruit24 erledigt die Routinearbeit. Die wichtigen Entscheide treffen Sie.</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-[16px] font-semibold text-night transition hover:bg-brand-50">14 Tage kostenlos testen <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/demo" className="inline-flex h-12 items-center rounded-xl border border-white/20 px-6 text-[16px] font-medium text-white transition hover:bg-white/10">Demo vereinbaren</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Eyebrow({ children, dark, center }: { children: React.ReactNode; dark?: boolean; center?: boolean }) {
  return (
    <p className={cn("flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.14em]", dark ? "text-brand-300" : "text-brand-600", center && "justify-center")}>
      <span className={cn("h-px w-8", dark ? "bg-brand-300/60" : "bg-brand-600/50")} />{children}
    </p>
  );
}
