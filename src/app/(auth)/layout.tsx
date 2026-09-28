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
        <p className="text-center text-xs text-slate-400">Protected by encryption, 2FA and Swiss hosting.</p>
      </div>
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(69,98,218,0.35),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-center px-16">
          <p className="text-sm font-medium text-brand-300">Hirely</p>
          <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">Your AI Recruiting Employee.</h2>
          <ul className="mt-8 space-y-4 text-[15px] text-slate-300">
            {["Every application analyzed within minutes", "Structured AI interviews by phone, browser or video", "Transparent evidence for every requirement", "Humans make every hiring decision"].map((x) => (
              <li key={x} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" />
                {x}
              </li>
            ))}
          </ul>
          <div className="mt-12 max-w-md rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
            <p className="text-white">“New candidate ready for review.”</p>
            <p className="mt-1 text-slate-400">Lukas Meier · Maschinenbauingenieur/in · meets 7 of 7 configured requirements</p>
          </div>
        </div>
      </div>
    </div>
  );
}
