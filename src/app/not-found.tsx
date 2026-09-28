import { LinkButton, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo />
      <p className="mt-8 text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">This page doesn't exist — or you don't have access to it.</h1>
      <p className="mt-2 text-sm text-slate-500">If you followed a link from an email, it may have expired.</p>
      <LinkButton href="/" className="mt-6">Go to homepage</LinkButton>
    </div>
  );
}
