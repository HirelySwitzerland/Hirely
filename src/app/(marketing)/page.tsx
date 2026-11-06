import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, Check, ChevronDown, CircleSlash, EyeOff, FileSearch, Globe2, Play, ScrollText, ShieldCheck, UserCheck, UserRound } from "lucide-react";
import type { CSSProperties } from "react";
import fs from "node:fs";
import path from "node:path";
import { StackedStory } from "@/components/marketing/photo-story";
import { ScrollFilm } from "@/components/marketing/scroll-film";
import { AudienceTabs, BenefitGrid } from "@/components/marketing/recruiter-sections";
import { SavingsCalculator, SpeedAndStudies } from "@/components/marketing/savings-calculator";
import { Film } from "@/components/marketing/film";
import { type StoryStep } from "@/components/marketing/scroll-story";
import { Hoerprobe } from "@/components/marketing/hoerprobe";
import { PLANS, chf } from "@/lib/billing";
import { SHOW_PRICES, SITE_ONLY } from "@/lib/site";
import { StartButtons } from "@/components/marketing/cta";
import { cn } from "@/lib/utils";

/** The photo/video story switches on once its pictures are in public/story (generated with Higgsfield); until then the 3D film runs. */
const STORY_READY = fs.existsSync(path.join(process.cwd(), "public", "story", "hero.webp"));

export const metadata = {
  title: { absolute: "Recruit24 – Ihr KI-Mitarbeiter fürs Recruiting" },
  description: "Der KI-Mitarbeiter fürs Recruiting – für HR-Abteilungen, Personalvermittler und Headhunter: Recruit24 liest jede Bewerbung komplett, führt das Vorabgespräch und plant den Termin, rund um die Uhr. Jede Aussage mit Fundstelle. Entwickelt in der Schweiz.",
};

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

const TRUST = [
  { i: Building2, t: "Entwickelt in der Schweiz" },
  { i: ShieldCheck, t: "revDSG & DSGVO" },
  { i: UserCheck, t: "Der Mensch entscheidet" },
  { i: Globe2, t: "DE · FR · IT · EN" },
  { i: FileSearch, t: "Jede Aussage mit Fundstelle" },
];


const NEVER = [
  { i: CircleSlash, t: "Sagt nie selbst ab", d: "Absagen und Einstellungen sind technisch Menschen vorbehalten." },
  { i: EyeOff, t: "Bewertet nie Aussehen oder Stimme", d: "Keine geschützten Merkmale, keine Gesichts- oder Stimmanalyse." },
  { i: UserRound, t: "Gibt sich nie als Mensch aus", d: "Bewerbende wissen immer, dass sie mit einer KI sprechen." },
  { i: ScrollText, t: "Arbeitet nie im Verborgenen", d: "Jeder Schritt wird protokolliert – Export und Löschung auf Anfrage." },
];

const FAQ = [
  ["Was liest Recruit24 aus einer Bewerbung?", "Alles, was eingereicht wird: Lebenslauf, Anschreiben, Arbeitszeugnisse und Diplome, dazu die Antworten im Formular und das Vorabgespräch. Jede Aussage, die Recruit24 daraus ableitet, ist mit Dokument und Zeile verknüpft – ein Klick zeigt die markierte Stelle."],
  ["Deutet Recruit24 die Zeugnissprache?", "Nein. Recruit24 übernimmt aus Zeugnissen nur Fakten mit Fundstelle – etwa Aufgaben, Abschlüsse oder den Führerausweis. Wie eine Formulierung gemeint ist, beurteilen Sie."],
  ["Entscheidet die KI, wen wir einstellen?", "Nein. Recruit24 prüft, fragt nach und fasst zusammen. Wer eingeladen, eingestellt oder abgesagt wird, entscheidet immer eine Person aus Ihrem Team – das ist technisch so eingebaut."],
  ["Wissen Bewerbende, dass sie mit einer KI sprechen?", "Ja, immer. Die KI stellt sich zu Beginn als KI vor, erklärt, dass am Schluss ein Mensch entscheidet, und fragt nach dem Einverständnis zur Aufnahme."],
  ["Wie steht es um den Datenschutz?", "Recruit24 ist auf das Schweizer Datenschutzgesetz (revDSG) und die DSGVO ausgelegt: Einwilligungen, Aufbewahrungsfristen, Export und Löschung auf Anfrage, lückenloses Protokoll. Daten werden verschlüsselt gespeichert und übertragen; im Business-Plan liegen sie ausschliesslich in der Schweiz."],
  ["Wir sind Personalvermittler – passt Recruit24 für uns?", "Ja. Recruit24 übernimmt die Erstqualifikation: Lebenslauf prüfen, Vorabgespräch führen, Verfügbarkeit und Lohnvorstellung erfassen, Termine vereinbaren. Pro Kunde führen Sie einen eigenen Bereich mit getrennten Daten und wechseln mit einem Login. Frühere Bewerbende finden Sie im Talent-Pool in normaler Sprache wieder – sofern sie eingewilligt haben."],
  ["In welchen Sprachen führt Recruit24 die Gespräche?", "Auf Deutsch, Französisch, Italienisch und Englisch – pro Stelle einstellbar. Inserate, Nachrichten und das Bewerbungsformular gibt es in denselben Sprachen."],
  ["Woher kommen die Bewerbungen?", "Von überall, wo Ihre Stelle steht: Karriereseite, Google-Jobsuche, LinkedIn, Indeed, jobs.ch, jobup.ch oder Ihr bestehendes ATS. Jeder Kanal hat einen eigenen Bewerbungs-Link, so sehen Sie, welcher sich lohnt."],
  ["Brauchen wir ein neues ATS?", "Nein. Recruit24 arbeitet mit Ihrem bestehenden System (z. B. Personio, Abacus, SuccessFactors) zusammen. Ohne ATS nutzen Sie einfach die mitgelieferte Karriereseite."],
  ["Was brauchen Bewerbende?", "Nichts ausser einem Telefon oder Browser. Sie erhalten einen Link per E-Mail oder SMS – ohne Konto, ohne App."],
  ["Wie schnell sind wir startklar?", "Die erste Stelle ist in rund zehn Minuten eingerichtet: Stichworte eingeben, Recruit24 schlägt Inserat, Anforderungen und Interviewfragen vor, Sie passen an und veröffentlichen."],
  ["Was passiert nach den 14 Testtagen?", "Sie wählen einen Plan, der zu Ihrem Recruiting passt. Für die Testphase brauchen Sie keine Kreditkarte."],
];

export default function LandingPage() {
  return (
    <main className="marketing-root">
      {STORY_READY ? (
        <>
      {/* Desktop: the whole start of the page as one scroll-driven camera journey */}
      <div className="hidden lg:motion-safe:block"><ScrollFilm /></div>
      {/* Phones and reduced motion: photo start, the two people and the story as a calm column */}
      <div className="lg:motion-safe:hidden">
      <section className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-night">
        <div className="kenburns absolute inset-0 -z-10"><Image src="/story/intro.webp" alt="Eine Schweizer Altstadt im Morgennebel von oben" fill priority quality={85} sizes="100vw" className="object-cover" /></div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(270deg,rgba(14,17,26,0.94)_0%,rgba(14,17,26,0.8)_38%,rgba(14,17,26,0.25)_70%,rgba(14,17,26,0.1)_100%)] max-lg:bg-[linear-gradient(0deg,rgba(14,17,26,0.96)_0%,rgba(14,17,26,0.75)_55%,rgba(14,17,26,0.25)_100%)]" />
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-8">
          <div className="max-w-xl lg:ml-auto">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3.5 py-1.5 text-[13px] font-medium text-white/80 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F97A3A]" />Für HR-Abteilungen und Personalvermittler
            </p>
            <h1 className="mt-7 text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-white sm:text-[64px] xl:text-[76px]">
              Ihr KI-Mitarbeiter<br /><span className="text-[#FDB48C]">fürs Recruiting.</span>
            </h1>
            <p className="mt-6 text-[18px] leading-relaxed text-white/80 sm:text-[20px]">
              Recruit24 liest jede Bewerbung komplett, führt das Vorabgespräch und plant den Termin – in Minuten, rund um die Uhr. Jede Aussage mit Fundstelle. <span className="text-white">Entscheiden tun Sie.</span>
            </p>
            <StartButtons className="mt-9 !items-start sm:!justify-start" />
            <a href="#hoerprobe" className="mt-6 inline-flex items-center gap-2 text-[14px] text-white/65 transition hover:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/25"><Play className="ml-px h-3 w-3" /></span>
              Hörprobe: So klingt ein KI-Vorabgespräch
            </a>
          </div>
        </div>
        <a href="#menschen" className="absolute inset-x-0 bottom-6 mx-auto hidden w-fit sm:flex flex-col items-center gap-2 text-[13px] text-white/60 transition hover:text-white">
          Die Geschichte einer Bewerbung<span className="h-8 w-px bg-gradient-to-b from-white/60 to-transparent" />
        </a>
      </section>

      {/* Die zwei Menschen der Geschichte */}
      <section id="menschen" className="scroll-mt-16 bg-night">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-24 sm:px-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <Eyebrow dark>Eine Bewerbung, vier Tage</Eyebrow>
            <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[46px]">Das sind Sandra und Max.</h2>
            <p className="mt-5 text-[18px] leading-relaxed text-white/70">Sandra leitet das HR einer Maschinenbaufirma in Winterthur und sucht einen Servicetechniker. Max ist Servicetechniker und sucht eine neue Stelle. Begleiten Sie die beiden – und sehen Sie, was Recruit24 dazwischen erledigt.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:col-span-7">
            {[["/story/sandra.webp", "Sandra", "HR-Leiterin · sucht einen Servicetechniker"], ["/story/max.webp", "Max", "Servicetechniker · sucht eine neue Stelle"]].map(([src, name, role]) => (
              <figure key={name} className="group relative aspect-[3/4] overflow-hidden rounded-2xl">
                <Image src={src} alt={`${name}, ${role}`} fill sizes="(min-width: 1024px) 30vw, 50vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 pt-16">
                  <p className="text-[22px] font-semibold text-white">{name}</p>
                  <p className="text-[14px] text-white/75">{role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Die Geschichte: eine Bewerbung mit Recruit24 */}
      <StackedStory />
      </div>
        </>
      ) : (
        <>
      {/* Start */}
      <section className="relative overflow-hidden bg-night">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-20%] h-[720px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(249,122,58,0.22),transparent)]" />
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
          <StartButtons className="mt-10" />
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
        </>
      )}

      <div id="nach-story" className="scroll-mt-16" />
      <div id="nach-film" className="scroll-mt-16" />
      {/* Vertrauensleiste */}
      <section className="border-b border-slate-200 bg-white">
        <ul className="sd-stagger mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-4 px-4 py-7 sm:px-8 md:grid-cols-5">
          {TRUST.map(({ i: Icon, t }, k) => (
            <li key={t} style={stagger(k)} className="flex items-center justify-center gap-2.5 text-[14px] font-medium text-slate-700 md:justify-start">
              <Icon className="h-[18px] w-[18px] shrink-0 text-brand-600" />{t}
            </li>
          ))}
        </ul>
      </section>

      {/* Für wen */}
      <section id="fuer-wen" className="scroll-mt-16 bg-[#F8F9FB]">
        <div className="mx-auto max-w-7xl px-4 py-28 sm:px-8">
          <div className="sd-rise max-w-3xl">
            <Eyebrow>Für wen</Eyebrow>
            <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[48px]">Für alle, die gute Leute schneller finden müssen.</h2>
            <p className="mt-5 text-[18px] leading-relaxed text-slate-600">Ob HR-Abteilung, Personalvermittlung oder Headhunter: Recruit24 übernimmt die Routine zwischen Bewerbung und Gespräch – Sie behalten jeden Entscheid.</p>
          </div>
          <div className="mt-12"><AudienceTabs /></div>
        </div>
      </section>

      {/* Vorteile */}
      <section id="vorteile" className="scroll-mt-16 relative overflow-hidden bg-night">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(249,122,58,0.14),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-28 sm:px-8">
          <div className="sd-rise grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <Eyebrow dark>Was Recruiter schätzen</Eyebrow>
              <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[48px]">Was Recruit24 Ihrem Team abnimmt.</h2>
            </div>
            <p className="text-[18px] leading-relaxed text-white/65 lg:col-span-5">Vom Eingang der Bewerbung bis zum gebuchten Gespräch – nachvollziehbar bis zur einzelnen Zeile im Arbeitszeugnis.</p>
          </div>
          <div className="mt-14"><BenefitGrid /></div>
        </div>
      </section>


      {/* Hörprobe */}
      <section id="hoerprobe" className="scroll-mt-16 bg-night">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-28 sm:px-8 lg:grid-cols-12">
          <div className="sd-rise lg:col-span-5">
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
          <div className="sd-tilt lg:col-span-7"><Hoerprobe /></div>
        </div>
      </section>

      {/* Rechner */}
      <section id="rechner" className="scroll-mt-16 bg-[#F8F9FB]">
        <div className="mx-auto max-w-7xl px-4 py-28 sm:px-8">
          <div className="sd-rise mx-auto max-w-3xl text-center">
            <Eyebrow center>Rechner</Eyebrow>
            <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[48px]">Was Recruit24 Ihnen spart – in Stunden und Franken.</h2>
            <p className="mt-5 text-[18px] text-slate-600">Stellen Sie Ihr Volumen und Ihre Stundenkosten ein. Jeder Schritt ist offen gerechnet – und Sie können jede Annahme anpassen.</p>
          </div>
          <div className="sd-tilt mt-14"><SavingsCalculator /></div>
          <div className="sd-rise mt-5"><SpeedAndStudies /></div>
        </div>
      </section>


      {/* Vertrauen */}
      <section id="vertrauen" className="scroll-mt-16 border-y border-slate-200 bg-[#F8F9FB]">
        <div className="mx-auto max-w-7xl px-4 py-28 sm:px-8">
          <div className="sd-rise grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <Eyebrow>Vertrauen & Datenschutz</Eyebrow>
              <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[48px]">Was Recruit24 nie tut.</h2>
            </div>
            <p className="text-[18px] leading-relaxed text-slate-600 lg:col-span-5">Gebaut für Schweizer HR-Abteilungen, Datenschutzberatungen und Bewerbende, die wissen wollen, woran sie sind.</p>
          </div>
          <div className="sd-flip mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {NEVER.map(({ i: Icon, t, d }, k) => (
              <div key={t} style={stagger(k)} className="rounded-2xl border border-slate-200 bg-white p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
                <p className="mt-6 text-[17px] font-semibold text-ink">{t}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{d}</p>
              </div>
            ))}
          </div>
          <div className="sd-rise mt-5 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 text-[15px] sm:grid-cols-3">
            {[["revDSG & DSGVO", "Einwilligungen, Aufbewahrungsfristen, Export und Löschung auf Anfrage."], ["Sicherheit", "Verschlüsselte Speicherung und Übertragung, Rollenrechte, Zwei-Faktor-Anmeldung."], ["Getrennte Firmenbereiche", "Jede Firma sieht nur ihre eigenen Daten – strikt getrennt."]].map(([t, d]) => (
              <div key={t} className="bg-white p-6"><p className="font-semibold text-ink">{t}</p><p className="mt-1.5 text-slate-600">{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Preise (hidden for now, see SHOW_PRICES) */}
      {SHOW_PRICES && (
      <section id="preise" className="scroll-mt-16 mx-auto max-w-7xl px-4 py-28 sm:px-8">
        <div className="sd-rise mx-auto max-w-3xl text-center">
          <Eyebrow center>Preise</Eyebrow>
          <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[48px]">Klare Preise in Franken.</h2>
          <p className="mt-5 text-[18px] text-slate-600">{SITE_ONLY ? "Preise in CHF, exkl. MwSt." : "14 Tage kostenlos testen, ohne Kreditkarte."} Bei jährlicher Zahlung sparen Sie rund 17 %.</p>
        </div>
        <div className="sd-stagger mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p, k) => {
            const hot = p.id === "GROWTH";
            return (
              <div key={p.id} style={stagger(k)} className={cn("relative flex flex-col rounded-2xl border p-7", hot ? "border-night bg-night text-white shadow-[0_40px_80px_-40px_rgba(20,24,36,0.6)]" : "border-slate-200 bg-white")}>
                {hot && <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-brand-500 to-[#F97A3A] px-3 py-1 text-[12px] font-semibold text-white">Am beliebtesten</span>}
                <p className={cn("text-[17px] font-semibold", hot ? "text-white" : "text-ink")}>{p.name}</p>
                <p className={cn("mt-1.5 min-h-[44px] text-[14px] leading-snug", hot ? "text-white/65" : "text-slate-500")}>{p.tagline}</p>
                <p className="mt-6 flex flex-wrap items-baseline gap-x-1.5">
                  <span className={cn("whitespace-nowrap text-[36px] font-semibold tracking-[-0.03em]", hot ? "text-white" : "text-ink")}>{p.monthlyCents ? chf(p.monthlyCents, { decimals: false }) : "Individuell"}</span>
                  {p.monthlyCents && <span className={cn("text-[14px]", hot ? "text-white/60" : "text-slate-500")}>/ Monat</span>}
                </p>
                <p className={cn("mt-1 min-h-[20px] text-[13px]", hot ? "text-white/55" : "text-slate-500")}>{p.annualMonthlyCents ? `jährlich ${chf(p.annualMonthlyCents, { decimals: false })} / Monat` : "Auf Ihr Volumen zugeschnitten"}</p>
                <Link
                  href={p.id === "ENTERPRISE" || SITE_ONLY ? "/demo" : "/register"}
                  className={cn("mt-6 inline-flex h-11 items-center justify-center rounded-xl text-[15px] font-semibold transition", hot ? "bg-white text-night hover:bg-brand-50" : "border border-slate-300 text-ink hover:border-slate-400 hover:bg-slate-50")}
                >
                  {p.id === "ENTERPRISE" ? "Kontakt aufnehmen" : SITE_ONLY ? "Demo vereinbaren" : "Kostenlos testen"}
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
      )}

      {/* So starten Sie */}
      <section className="mx-auto max-w-7xl px-4 py-28 sm:px-8">
        <div className="sd-rise max-w-3xl">
          <Eyebrow>So starten Sie</Eyebrow>
          <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[48px]">In drei Schritten zur ersten Stelle.</h2>
        </div>
        <ol className="sd-stagger mt-14 grid gap-5 md:grid-cols-3">
          {[
            ["Demo vereinbaren", "30 Minuten, an einer Ihrer echten Stellen. Wir zeigen den ganzen Ablauf – von der Bewerbung bis zum gebuchten Gespräch."],
            ["Stelle einrichten", "Stichworte eingeben: Recruit24 schlägt Inserat, Muss-Kriterien und Interviewfragen vor. Sie passen an und veröffentlichen."],
            ["Bewerbungen laufen", "Recruit24 prüft, führt die Vorabgespräche und plant Termine. Sie sehen die Ergebnisse und entscheiden."],
          ].map(([t, d], k) => (
            <li key={t} style={stagger(k)} className="relative rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_30px_60px_-45px_rgba(20,24,36,0.4)]">
              <span className="font-mono text-[44px] font-semibold leading-none text-brand-600/25">0{k + 1}</span>
              <p className="mt-6 text-[20px] font-semibold text-ink">{t}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{d}</p>
            </li>
          ))}
        </ol>
        <div className="sd-rise mt-10 flex flex-col items-start gap-4 rounded-3xl bg-night p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <p className="text-[22px] font-semibold">Lust auf eine Demo an Ihrer eigenen Stelle?</p>
            <p className="mt-1 text-[15px] text-white/65">Für HR-Abteilungen, Personalvermittler und Headhunter.</p>
          </div>
          <Link href="/demo" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-white px-6 text-[16px] font-semibold text-night transition hover:bg-brand-50">Demo vereinbaren <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>


      {/* Fragen */}
      <section id="fragen" className="scroll-mt-16 border-t border-slate-200 bg-[#F8F9FB]">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-28 sm:px-8 lg:grid-cols-12">
          <div className="sd-rise lg:col-span-4">
            <Eyebrow>Häufige Fragen</Eyebrow>
            <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[44px]">Gut zu wissen.</h2>
            <p className="mt-5 text-[17px] text-slate-600">Noch etwas offen? <Link href="/demo" className="font-medium text-brand-700 underline-offset-4 hover:underline">Sprechen Sie mit uns.</Link></p>
          </div>
          <div className="sd-stagger divide-y divide-slate-200 border-y border-slate-200 lg:col-span-8">
            {FAQ.filter(([q]) => !(SITE_ONLY && q.includes("Testtagen"))).map(([q, a]) => (
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
      <section className="relative isolate overflow-hidden bg-night">
        {STORY_READY && (
          <div aria-hidden className="sd-zoom absolute inset-0 -z-10">
            <Image src="/story/handshake.webp" alt="" fill sizes="100vw" className="object-cover opacity-45" />
          </div>
        )}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(20,24,36,0.55),rgba(20,24,36,0.92)_75%)]" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(249,122,58,0.3),transparent)]" />
        <div className="sd-rise relative mx-auto max-w-4xl px-4 py-36 text-center sm:px-8">
          <h2 className="text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-[60px]">Weniger Routine.<br />Mehr Zeit für Menschen.</h2>
          <p className="mx-auto mt-6 max-w-xl text-[18px] text-white/70">Recruit24 erledigt die Routinearbeit. Die wichtigen Entscheide treffen Sie.</p>
          <StartButtons className="mt-10" />
        </div>
      </section>
    </main>
  );
}

/** Delay for one item of a .sd-stagger / .sd-flip group (see globals.css). */
function stagger(i: number) {
  return { "--i": i } as CSSProperties;
}

function Eyebrow({ children, dark, center }: { children: React.ReactNode; dark?: boolean; center?: boolean }) {
  return (
    <p className={cn("flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.14em]", dark ? "text-brand-300" : "text-brand-600", center && "justify-center")}>
      <span className={cn("h-px w-8", dark ? "bg-brand-300/60" : "bg-brand-600/50")} />{children}
    </p>
  );
}
