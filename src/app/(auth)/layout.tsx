import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col bg-white px-4 py-8 sm:px-10">
        <Link href="/" className="w-fit">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-center text-xs text-slate-400">Geschützt durch Verschlüsselung, 2FA und Hosting in der Schweiz.</p>
      </div>
      <div className="relative hidden overflow-hidden bg-night lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(122,104,230,0.35),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-center px-16">
          <p className="text-sm font-medium text-brand-300">Recruit24</p>
          <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">Ihr KI-Mitarbeiter fürs Recruiting.</h2>
          <ul className="mt-8 space-y-4 text-[15px] text-slate-300">
            {["Jede Bewerbung in Minuten ausgewertet", "Strukturierte KI-Interviews per Telefon, Browser oder Video", "Nachvollziehbare Belege für jede Anforderung", "Jeden Entscheid trifft ein Mensch"].map((x) => (
              <li key={x} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" />
                {x}
              </li>
            ))}
          </ul>
          <div className="mt-12 max-w-md rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
            <p className="text-white">„Neue Bewerbung bereit zur Prüfung.“</p>
            <p className="mt-1 text-slate-400">Lukas Meier · Maschinenbauingenieur/in · erfüllt 7 von 7 Anforderungen</p>
          </div>
        </div>
      </div>
    </div>
  );
}
