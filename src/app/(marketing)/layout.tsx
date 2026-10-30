import Link from "next/link";
import { Logo, LinkButton } from "@/components/ui";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Recruit24 Startseite">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <a href="/#how" className="hover:text-ink">So funktioniert's</a>
            <a href="/#features" className="hover:text-ink">Produkt</a>
            <a href="/#trust" className="hover:text-ink">Datenschutz</a>
            <a href="/#pricing" className="hover:text-ink">Preise</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden px-3 text-sm font-medium text-slate-600 hover:text-ink sm:block">
              Anmelden
            </Link>
            <LinkButton href="/register" size="sm">
              Kostenlos starten
            </LinkButton>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-slate-500">Ihr KI-Mitarbeiter fürs Recruiting. Entwickelt in der Schweiz für KMU und mittelgrosse Firmen im DACH-Raum.</p>
            <p className="mt-4 text-xs text-slate-400">Gehostet in der Schweiz · revDSG- & DSGVO-konform · Jeden Anstellungsentscheid trifft ein Mensch.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Produkt</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><a href="/#features" className="hover:text-ink">Funktionen</a></li>
              <li><a href="/#pricing" className="hover:text-ink">Preise</a></li>
              <li><Link href="/careers/helvetic-engineering" className="hover:text-ink">Beispiel-Karriereseite</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Firma</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link href="/demo" className="hover:text-ink">Demo vereinbaren</Link></li>
              <li><Link href="/login" className="hover:text-ink">Anmelden</Link></li>
              <li><a href="/#trust" className="hover:text-ink">Datenschutz</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-200 py-5 text-center text-xs text-slate-400">© {new Date().getFullYear()} Recruit24. Alle Rechte vorbehalten.</div>
      </footer>
    </div>
  );
}
