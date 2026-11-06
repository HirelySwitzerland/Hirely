import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui";
import { CONTACT_EMAIL, PUBLIC_DEMO, SHOW_PRICES, SITE_ONLY } from "@/lib/site";

const NAV = [
  { href: "/#vorteile", label: "Vorteile" },
  { href: "/#fuer-wen", label: "Für wen" },
  { href: "/#funktionen", label: "Funktionen" },
  { href: "/#rechner", label: "Ersparnis" },
  { href: "/#preise", label: "Preise" },
  { href: "/#vertrauen", label: "Datenschutz" },
  { href: "/#fragen", label: "Fragen" },
].filter((n) => SHOW_PRICES || n.href !== "/#preise");

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white text-ink antialiased [scroll-behavior:smooth]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-night/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-8">
          <Link href="/" aria-label="Recruit24 Startseite">
            <Logo onDark className="h-10" />
          </Link>
          <nav className="hidden items-center gap-8 text-[14px] font-medium text-white/70 lg:flex" aria-label="Hauptnavigation">
            {NAV.map((n) => <a key={n.href} href={n.href} className="transition hover:text-white">{n.label}</a>)}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            {(!SITE_ONLY || PUBLIC_DEMO) && <Link href="/login" className="inline-flex h-9 items-center rounded-lg border border-white/20 px-3.5 text-[14px] font-medium text-white/90 transition hover:border-white/40 hover:text-white">Login</Link>}
            <Link href={SITE_ONLY ? "/demo" : "/register"} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-[14px] font-semibold text-night shadow-sm transition hover:bg-brand-50">
              {SITE_ONLY ? <span>Demo vereinbaren</span> : <><span className="hidden sm:inline">Jetzt starten</span><span className="sm:hidden">Starten</span></>}<ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-slate-200 bg-[#F8F9FB]">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-8 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo className="h-11" />
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-slate-600">Recruiting rund um die Uhr – automatisiert. Entwickelt in der Schweiz für HR-Abteilungen, Personalvermittler und Headhunter.</p>
            <p className="mt-6 text-[13px] text-slate-500">revDSG- & DSGVO-konform · Jeden Entscheid trifft ein Mensch.</p>
          </div>
          <FooterCol title="Produkt" links={[["/#ablauf", "So funktioniert's"], ["/#vorteile", "Vorteile"], ["/#fuer-wen", "Für wen"], ["/#funktionen", "Funktionen"], ["/#mobil", "Auf dem Handy"], ["/#hoerprobe", "Hörprobe"], ["/#rechner", "Ersparnis-Rechner"], ...(SHOW_PRICES ? [["/#preise", "Preise"] as [string, string]] : []), ...(SITE_ONLY ? [] : [["/careers/helvetic-engineering", "Beispiel-Karriereseite"] as [string, string]])]} />
          <FooterCol title="Für Unternehmen" links={SITE_ONLY ? [["/demo", "Demo vereinbaren"], [`mailto:${CONTACT_EMAIL}`, CONTACT_EMAIL]] : [["/register", "Konto erstellen"], ["/login", "Anmelden"], ["/demo", "Demo vereinbaren"]]} />
          <FooterCol title="Vertrauen" links={[["/#vertrauen", "Datenschutz & Sicherheit"], ["/#fragen", "Häufige Fragen"], ["/datenschutz", "Datenschutzerklärung"], ["/impressum", "Impressum"]]} />
        </div>
        <div className="border-t border-slate-200">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-[13px] text-slate-500 sm:flex-row sm:justify-between sm:px-8">
            <span>© {new Date().getFullYear()} Recruit24. Alle Rechte vorbehalten.</span>
            {SHOW_PRICES && <span>Preise in CHF, exkl. MwSt.</span>}
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="md:col-span-2 lg:col-span-2">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-slate-900">{title}</p>
      <ul className="mt-4 space-y-2.5 text-[15px] text-slate-600">
        {links.map(([href, label]) => (
          <li key={href}>{href.startsWith("/#") || href.startsWith("mailto:") ? <a href={href} className="hover:text-ink">{label}</a> : <Link href={href} className="hover:text-ink">{label}</Link>}</li>
        ))}
      </ul>
    </div>
  );
}
