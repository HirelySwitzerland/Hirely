import { LinkButton, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo />
      <p className="mt-8 text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Diese Seite gibt es nicht – oder Sie haben keinen Zugriff darauf.</h1>
      <p className="mt-2 text-sm text-slate-500">Wenn Sie einem Link aus einer E-Mail gefolgt sind, ist er vielleicht abgelaufen.</p>
      <LinkButton href="/" className="mt-6">Zur Startseite</LinkButton>
    </div>
  );
}
