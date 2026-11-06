import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, CircleSlash, EyeOff, Play, ScrollText, Smartphone, UserRound } from "lucide-react";
import type { CSSProperties } from "react";
import fs from "node:fs";
import path from "node:path";
import { StackedStory } from "@/components/marketing/photo-story";
import { ScrollFilm } from "@/components/marketing/scroll-film";
import { AudienceTabs, BenefitGrid } from "@/components/marketing/recruiter-sections";
import { SavingsCalculator, StudyFacts } from "@/components/marketing/savings-calculator";
import { Film } from "@/components/marketing/film";
import { type StoryStep } from "@/components/marketing/scroll-story";
import { Hoerprobe } from "@/components/marketing/hoerprobe";
import { PLANS, chf, setupLabel } from "@/lib/billing";
import { SHOW_PRICES, SITE_ONLY } from "@/lib/site";
import { StartButtons } from "@/components/marketing/cta";
import { HERO } from "@/components/marketing/story-texts";
import { MobileShowcase, Promises, SECTION, SectionHead } from "@/components/marketing/sections";
import { cn } from "@/lib/utils";

/** The photo/video story switches on once its pictures are in public/story (generated with Higgsfield); until then the 3D film runs. */
const STORY_READY = fs.existsSync(path.join(process.cwd(), "public", "story", "hero.webp"));

export const metadata = {
  title: { absolute: "Recruit24 – Recruiting rund um die Uhr, automatisiert" },
  description: "Recruit24 prüft jede Bewerbung, führt das Vorabgespräch und vereinbart den Termin – rund um die Uhr. Mehr Zeit für das Wichtige, Entscheide auch unterwegs auf dem Handy. Für HR-Abteilungen, Personalvermittler und Headhunter in der Schweiz.",
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

const NEVER = [
  { i: CircleSlash, t: "Sagt nie selbst ab", d: "Absagen und Einstellungen sind technisch Menschen vorbehalten." },
  { i: EyeOff, t: "Bewertet nie Aussehen oder Stimme", d: "Keine geschützten Merkmale, keine Gesichts- oder Stimmanalyse." },
  { i: UserRound, t: "Gibt sich nie als Mensch aus", d: "Bewerbende wissen immer, dass sie mit einer KI sprechen." },
  { i: ScrollText, t: "Arbeitet nie im Verborgenen", d: "Jeder Schritt wird protokolliert – Export und Löschung auf Anfrage." },
];

const FAQ = [
  ["Was erledigt Recruit24 – und was bleibt bei uns?", "Recruit24 prüft Bewerbungen, führt das Vorabgespräch, fasst zusammen und vereinbart Termine – rund um die Uhr. Bei Ihnen bleibt, was zählt: entscheiden, wen Sie kennenlernen, und die Gespräche selbst führen. Zu- und Absagen trifft immer ein Mensch – das ist technisch so eingebaut."],
  ["Funktioniert Recruit24 auch auf dem Handy?", "Ja. Recruit24 läuft im Browser auf Computer, Tablet und Handy, ohne App-Installation. Auf dem Handy legen Sie Recruit24 mit «Zum Home-Bildschirm» wie eine App ab. Auch Bewerbende brauchen nur ihr Handy: Sie bewerben sich, führen das Vorabgespräch und wählen den Termin – ohne Konto."],
  ["Was liest Recruit24 aus einer Bewerbung?", "Alles, was eingereicht wird: Lebenslauf, Anschreiben, Arbeitszeugnisse und Diplome, dazu die Antworten im Formular und das Vorabgespräch. Jede Aussage, die Recruit24 daraus ableitet, ist mit Dokument und Zeile verknüpft – ein Klick zeigt die markierte Stelle."],
  ["Wissen Bewerbende, dass sie mit einer KI sprechen?", "Ja, immer. Die KI stellt sich zu Beginn als KI vor, erklärt, dass am Schluss ein Mensch entscheidet, und fragt nach dem Einverständnis zur Aufnahme."],
  ["Deutet Recruit24 die Zeugnissprache?", "Nein. Recruit24 übernimmt aus Zeugnissen nur Fakten mit Fundstelle – etwa Aufgaben, Abschlüsse oder den Führerausweis. Wie eine Formulierung gemeint ist, beurteilen Sie."],
  ["Wie steht es um den Datenschutz?", "Recruit24 ist auf das Schweizer Datenschutzgesetz (revDSG) und die DSGVO ausgelegt: Einwilligungen, Aufbewahrungsfristen, Export und Löschung auf Anfrage, lückenloses Protokoll. Daten werden verschlüsselt gespeichert und übertragen. Speicherort und Auftragsverarbeitung regeln wir mit Ihnen im Vertrag."],
  ["Wir sind Personalvermittler – passt Recruit24 für uns?", "Ja. Recruit24 übernimmt die Erstqualifikation: Unterlagen prüfen, Vorabgespräch führen, Verfügbarkeit und Lohnvorstellung erfassen, Termine vereinbaren. Pro Kunde führen Sie einen eigenen Bereich mit getrennten Daten. Für Ihre Kunden erstellen Sie mit einem Klick ein Kandidatendossier – auf Wunsch anonymisiert."],
  ["In welchen Sprachen führt Recruit24 die Gespräche?", "Auf Deutsch, Französisch, Italienisch und Englisch – pro Stelle einstellbar. Inserate, Nachrichten und das Bewerbungsformular gibt es in denselben Sprachen."],
  ["Woher kommen die Bewerbungen?", "Von überall, wo Ihre Stelle steht: Karriereseite, Google-Jobsuche, LinkedIn, Indeed, jobs.ch, jobup.ch oder Ihr bestehendes Bewerbermanagement. Jeder Kanal hat einen eigenen Bewerbungs-Link – so sehen Sie, welcher sich lohnt."],
  ["Brauchen wir ein neues Bewerbermanagement?", "Nein. Recruit24 arbeitet mit Ihrem bestehenden System zusammen, zum Beispiel Personio, Abacus oder SuccessFactors. Ohne System nutzen Sie die mitgelieferte Karriereseite."],
  ["Wie schnell sind wir startklar?", "Die erste Stelle ist in rund zehn Minuten eingerichtet: Stichworte eingeben, Recruit24 schlägt Inserat, Anforderungen und Interviewfragen vor, Sie passen an und veröffentlichen."],
  ["Was passiert nach den 14 Testtagen?", "Sie wählen einen Plan, der zu Ihrem Recruiting passt. Für die Testphase brauchen Sie keine Kreditkarte."],
];

export default function LandingPage() {
  return (
    <main className="marketing-root">
      {STORY_READY ? (
        <>
          {/* Desktop: the start of the page as one scroll-driven camera journey */}
          <div className="hidden lg:motion-safe:block"><ScrollFilm /></div>
          {/* Phones and reduced motion: photo start, the two people and the story as a calm column */}
          <div className="lg:motion-safe:hidden">
            <section className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-night">
              <div className="kenburns absolute inset-0 -z-10"><Image src="/story/intro.webp" alt="Eine Schweizer Altstadt im Morgennebel von oben" fill priority quality={85} sizes="100vw" className="object-cover" /></div>
              <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(270deg,rgba(14,17,26,0.94)_0%,rgba(14,17,26,0.8)_38%,rgba(14,17,26,0.25)_70%,rgba(14,17,26,0.1)_100%)] max-lg:bg-[linear-gradient(0deg,rgba(14,17,26,0.97)_0%,rgba(14,17,26,0.8)_55%,rgba(14,17,26,0.3)_100%)]" />
              <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8">
                <div className="max-w-xl lg:ml-auto">
                  <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3.5 py-1.5 text-[13px] font-medium text-white/85 backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F97A3A]" />{HERO.pill}
                  </p>
                  <h1 className="mt-7 text-[42px] font-semibold leading-[1.03] tracking-[-0.035em] text-white sm:text-[64px] xl:text-[76px]">
                    {HERO.title}<br /><span className="text-[#FDB48C]">{HERO.accent}</span>
                  </h1>
                  <p className="mt-6 text-[18px] leading-relaxed text-white/80 sm:text-[20px]">{HERO.text}</p>
                  <p className="mt-4 flex items-center gap-2.5 text-[16px] text-white"><Smartphone className="h-[18px] w-[18px] shrink-0 text-[#FDB48C]" />{HERO.mobile}</p>
                  <StartButtons className="mt-9 !items-stretch sm:!items-start sm:!justify-start" />
                  <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[14px] text-white/75 sm:flex sm:flex-wrap sm:gap-x-5">
                    {HERO.facts.map((f) => <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-[#FDB48C]" />{f}</li>)}
                  </ul>
                  <a href="#hoerprobe" className="mt-6 inline-flex items-center gap-2 text-[14px] text-white/70 transition hover:text-white">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/25"><Play className="ml-px h-3 w-3" /></span>
                    Hörprobe: So klingt ein KI-Vorabgespräch
                  </a>
                </div>
              </div>
            </section>

            {/* The two people of the story */}
            <section id="menschen" className="scroll-mt-16 bg-night">
              <div className="mx-auto grid max-w-7xl gap-10 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-5">
                  <SectionHead left dark eyebrow="Eine Bewerbung, vier Tage" title="Das sind Sandra und Max." lead="Sandra leitet das HR einer Maschinenbaufirma in Winterthur und sucht einen Servicetechniker. Max ist Servicetechniker und sucht eine neue Stelle. Begleiten Sie die beiden – und sehen Sie, was Recruit24 dazwischen erledigt." />
                </div>
                <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:col-span-7">
                  {[["/story/sandra.webp", "Sandra", "HR-Leiterin"], ["/story/max.webp", "Max", "Servicetechniker"]].map(([src, name, role]) => (
                    <figure key={name} className="group relative aspect-[3/4] overflow-hidden rounded-2xl">
                      <Image src={src} alt={`${name}, ${role}`} fill sizes="(min-width: 1024px) 30vw, 50vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" />
                      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-14 sm:p-5">
                        <p className="text-[19px] font-semibold text-white sm:text-[22px]">{name}</p>
                        <p className="text-[13px] text-white/75 sm:text-[14px]">{role}</p>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </section>

            {/* The story: one application with Recruit24 */}
            <StackedStory />
          </div>
        </>
      ) : (
        <>
          <section className="relative overflow-hidden bg-night">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-[-20%] h-[720px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(249,122,58,0.22),transparent)]" />
            </div>
            <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-20 text-center sm:px-8 sm:pt-28">
              <h1 className="mx-auto max-w-5xl text-[42px] font-semibold leading-[1.03] tracking-[-0.035em] text-white sm:text-[72px]">
                {HERO.title}<br /><span className="text-[#FDB48C]">{HERO.accent}</span>
              </h1>
              <p className="mx-auto mt-7 max-w-2xl text-[18px] leading-relaxed text-white/75 sm:text-[20px]">{HERO.text}</p>
              <StartButtons className="mt-10" />
            </div>
          </section>
          <Film fallback={STEPS} />
        </>
      )}

      <div id="nach-story" className="scroll-mt-16" />
      <div id="nach-film" className="scroll-mt-16" />

      {/* Drei Versprechen */}
      <section id="vorteile" className="scroll-mt-16 bg-white">
        <div className={SECTION}>
          <SectionHead
            eyebrow="Warum Recruit24"
            title="Weniger Routine. Mehr Zeit für das, was zählt."
            lead="Recruit24 übernimmt die Arbeit zwischen Bewerbung und Gespräch – automatisch, rund um die Uhr und überall erreichbar."
          />
          <Promises />
        </div>
      </section>

      {/* Für wen */}
      <section id="fuer-wen" className="scroll-mt-16 bg-[#F8F9FB]">
        <div className={SECTION}>
          <SectionHead
            eyebrow="Für wen"
            title="Für HR-Abteilungen und Personalvermittler."
            lead="Ob Sie selbst rekrutieren oder für Ihre Kunden: Recruit24 erledigt die Vorarbeit. Jeden Entscheid treffen Sie."
          />
          <div className="mt-14"><AudienceTabs /></div>
        </div>
      </section>

      {/* Funktionen */}
      <section id="funktionen" className="scroll-mt-16 relative overflow-hidden bg-night">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(249,122,58,0.14),transparent)]" />
        <div className={cn(SECTION, "relative")}>
          <SectionHead
            dark
            eyebrow="Funktionen"
            title="Alles zwischen Bewerbung und Gespräch."
            lead="Recruit24 erledigt die Routine automatisch und rund um die Uhr – nachvollziehbar bis zur einzelnen Zeile im Arbeitszeugnis."
          />
          <div className="mt-16"><BenefitGrid /></div>
        </div>
      </section>

      {/* Auf dem Handy */}
      <section id="mobil" className="scroll-mt-16 overflow-hidden bg-white">
        <div className={SECTION}><MobileShowcase /></div>
      </section>

      {/* Hörprobe */}
      <section id="hoerprobe" className="scroll-mt-16 bg-night">
        <div className={cn(SECTION, "grid items-center gap-14 lg:grid-cols-12")}>
          <div className="lg:col-span-5">
            <SectionHead
              left
              dark
              eyebrow="Hörprobe"
              title="So klingt ein Vorabgespräch."
              lead="Recruit24 ruft an, stellt sich als KI vor, bittet um das Einverständnis zur Aufnahme und stellt die Fragen Ihrer Stelle. Ist eine Antwort zu knapp, fragt es freundlich nach."
            />
            <ul className="mt-8 space-y-3 text-[16px] text-white/80">
              {["Transkript und Aufnahme landen im Profil", "Verfügbarkeit, Kündigungsfrist und Lohn werden erfasst", "Am Telefon und im Browser gleich"].map((x) => (
                <li key={x} className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-brand-300" />{x}</li>
              ))}
            </ul>
            <p className="mt-8 text-[13px] text-white/45">Beispielgespräch mit einer erfundenen Person. Die Stimmen sind künstlich erzeugt.</p>
          </div>
          <div className="sd-tilt lg:col-span-7"><Hoerprobe /></div>
        </div>
      </section>

      {/* Ersparnis */}
      <section id="rechner" className="scroll-mt-16 bg-[#F8F9FB]">
        <div className={SECTION}>
          <SectionHead
            eyebrow="Ersparnis"
            title="Was Recruit24 Ihnen bringt."
            lead="Zuerst, was Studien zeigen. Dann rechnen Sie selbst – vorsichtig, und jede Annahme können Sie aufklappen."
          />
          <div className="sd-rise mt-16"><StudyFacts /></div>
          <p className="sd-rise mt-20 text-center text-[26px] font-semibold tracking-[-0.02em] text-ink">Und was heisst das für Ihr Team?</p>
          <div className="sd-tilt mt-8"><SavingsCalculator /></div>
        </div>
      </section>

      {/* Datenschutz */}
      <section id="vertrauen" className="scroll-mt-16 bg-white">
        <div className={SECTION}>
          <SectionHead
            eyebrow="Vertrauen & Datenschutz"
            title="Was Recruit24 nie tut."
            lead="Klare Regeln für KI im Recruiting – für Ihr Team, Ihre Datenschutzberatung und Ihre Bewerbenden."
          />
          <div className="sd-flip mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {NEVER.map(({ i: Icon, t, d }, k) => (
              <div key={t} style={stagger(k)} className="rounded-3xl border border-slate-200 bg-white p-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Icon className="h-6 w-6" /></span>
                <p className="mt-7 text-[18px] font-semibold text-ink">{t}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{d}</p>
              </div>
            ))}
          </div>
          <div className="sd-rise mt-5 grid gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 text-[15px] sm:grid-cols-3">
            {[["revDSG & DSGVO", "Einwilligungen, Aufbewahrungsfristen, Export und Löschung auf Anfrage."], ["Sicherheit", "Verschlüsselte Speicherung und Übertragung, Rollenrechte, Zwei-Faktor-Anmeldung."], ["Getrennte Firmenbereiche", "Jede Firma sieht nur ihre eigenen Daten – strikt getrennt."]].map(([t, d]) => (
              <div key={t} className="bg-[#FBFBFC] p-7"><p className="font-semibold text-ink">{t}</p><p className="mt-1.5 leading-relaxed text-slate-600">{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Preise (hidden for now, see SHOW_PRICES) */}
      {SHOW_PRICES && (
      <section id="preise" className="scroll-mt-16 border-t border-slate-200 bg-white">
        <div className={SECTION}>
        <SectionHead eyebrow="Preise" title="Klare Preise in Franken." lead={<>{SITE_ONLY ? "Preise in CHF, exkl. MwSt." : "14 Tage kostenlos testen, ohne Kreditkarte."} Bei jährlicher Zahlung sparen Sie rund 17 %.</>} />
        <div className="sd-stagger mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p, k) => {
            const hot = p.id === "GROWTH";
            return (
              <div key={p.id} style={stagger(k)} className={cn("relative flex flex-col rounded-3xl border p-7", hot ? "border-night bg-night text-white shadow-[0_40px_80px_-40px_rgba(20,24,36,0.6)]" : "border-slate-200 bg-white")}>
                {hot && <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-brand-500 to-[#F97A3A] px-3 py-1 text-[12px] font-semibold text-white">Am beliebtesten</span>}
                <p className={cn("text-[17px] font-semibold", hot ? "text-white" : "text-ink")}>{p.name}</p>
                <p className={cn("mt-1.5 min-h-[44px] text-[14px] leading-snug", hot ? "text-white/65" : "text-slate-500")}>{p.tagline}</p>
                <p className="mt-6 flex flex-wrap items-baseline gap-x-1.5">
                  <span className={cn("whitespace-nowrap text-[36px] font-semibold tracking-[-0.03em]", hot ? "text-white" : "text-ink")}>{p.monthlyCents ? chf(p.monthlyCents, { decimals: false }) : "Auf Anfrage"}</span>
                  {p.monthlyCents && <span className={cn("text-[14px]", hot ? "text-white/60" : "text-slate-500")}>/ Monat</span>}
                </p>
                <p className={cn("mt-1 min-h-[20px] text-[13px]", hot ? "text-white/55" : "text-slate-500")}>{p.annualMonthlyCents ? `jährlich ${chf(p.annualMonthlyCents, { decimals: false })} / Monat` : "Auf Ihr Volumen zugeschnitten"}</p>
                <p className={cn("min-h-[20px] text-[13px] font-medium", hot ? "text-white/75" : "text-slate-600")}>{setupLabel(p)}</p>
                <Link
                  href={p.id === "ENTERPRISE" || SITE_ONLY ? "/demo" : "/register"}
                  className={cn("mt-6 inline-flex h-11 items-center justify-center rounded-xl text-[15px] font-semibold transition", hot ? "bg-white text-night hover:bg-brand-50" : "border border-slate-300 text-ink hover:border-slate-400 hover:bg-slate-50")}
                >
                  {p.id === "ENTERPRISE" ? "Kontakt aufnehmen" : SITE_ONLY ? "Demo vereinbaren" : "Kostenlos testen"}
                </Link>
                <ul className={cn("mt-7 flex-1 space-y-2.5 border-t pt-6 text-[14px]", hot ? "border-white/10 text-white/80" : "border-slate-100 text-slate-600")}>
                  <li className={cn("font-medium", hot ? "text-white" : "text-ink")}>{p.positions ? `${p.positions} offene Stellen` : "Unbegrenzt Stellen"} · {p.seats ? `${p.seats} Benutzer` : "unbegrenzt Benutzer"}</li>
                  <li>{p.monthlyCents ? `${p.included.VOICE_MINUTES.toLocaleString("de-CH")} KI-Telefonminuten` : "KI-Telefonminuten nach Bedarf"}</li>
                  <li>{p.monthlyCents ? `${p.included.VIDEO_INTERVIEWS.toLocaleString("de-CH")} Video-Interviews` : "Video-Interviews nach Bedarf"}</li>
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5"><Check className={cn("mt-0.5 h-4 w-4 shrink-0", hot ? "text-brand-300" : "text-brand-600")} />{f}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-8 text-center text-[13px] text-slate-500">Preise in CHF, exkl. MwSt. Die Einrichtung umfasst Stellen, Fragen, Kalender, Vorlagen und eine Schulung. Mehrverbrauch: KI-Telefonminute CHF 0.45 · SMS CHF 0.12 · Video-Interview CHF 2.00 · CV-Auswertung CHF 0.15 · zusätzliche Stelle CHF 29 / Monat.</p>
        </div>
      </section>
      )}

      {/* So starten Sie */}
      <section className="border-t border-slate-200 bg-[#F8F9FB]">
        <div className={SECTION}>
          <SectionHead eyebrow="So starten Sie" title="In drei Schritten startklar." lead="Ohne Systemwechsel und ohne lange Einführung – die erste Stelle läuft in wenigen Tagen." />
          <ol className="sd-stagger mt-16 grid gap-5 md:grid-cols-3">
            {[
              ["Demo vereinbaren", "30 Minuten, an einer Ihrer echten Stellen. Wir zeigen den ganzen Ablauf – von der Bewerbung bis zum gebuchten Gespräch."],
              ["Stelle einrichten", "Stichworte eingeben: Recruit24 schlägt Inserat, Muss-Kriterien und Interviewfragen vor. Sie passen an und veröffentlichen."],
              ["Recruit24 arbeitet", "Ab jetzt rund um die Uhr: Bewerbungen prüfen, Vorabgespräche führen, Termine planen. Sie entscheiden – auch unterwegs."],
            ].map(([t, d], k) => (
              <li key={t} style={stagger(k)} className="relative rounded-3xl border border-slate-200 bg-white p-8">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-night text-[16px] font-semibold text-white">{k + 1}</span>
                <p className="mt-7 text-[20px] font-semibold text-ink">{t}</p>
                <p className="mt-2 text-[16px] leading-relaxed text-slate-600">{d}</p>
              </li>
            ))}
          </ol>
          <div className="sd-rise mt-6 flex flex-col items-start gap-5 rounded-3xl bg-night p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <p className="text-[22px] font-semibold tracking-[-0.01em]">Sehen Sie Recruit24 an Ihrer eigenen Stelle.</p>
              <p className="mt-1.5 text-[15px] text-white/65">30 Minuten, unverbindlich – für HR-Abteilungen, Personalvermittler und Headhunter.</p>
            </div>
            <Link href="/demo" className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 text-[16px] font-semibold text-night transition hover:bg-brand-50 sm:w-auto">Demo vereinbaren <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      {/* Fragen */}
      <section id="fragen" className="scroll-mt-16 bg-white">
        <div className={cn(SECTION, "grid gap-12 lg:grid-cols-12")}>
          <div className="lg:col-span-4">
            <SectionHead left eyebrow="Häufige Fragen" title="Gut zu wissen." lead={<>Noch etwas offen? <Link href="/demo" className="font-medium text-brand-700 underline-offset-4 hover:underline">Sprechen Sie mit uns.</Link></>} />
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
        <div className="sd-rise relative mx-auto max-w-4xl px-5 py-32 text-center sm:px-8 sm:py-40">
          <h2 className="text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] text-white [text-wrap:balance] sm:text-[60px]">Mehr Zeit für das, was zählt.</h2>
          <p className="mx-auto mt-6 max-w-xl text-[18px] leading-relaxed text-white/75 sm:text-[20px]">Recruit24 arbeitet rund um die Uhr. Sie entscheiden – im Büro oder unterwegs auf dem Handy.</p>
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
