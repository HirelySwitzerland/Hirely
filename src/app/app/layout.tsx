import Link from "next/link";
import { db } from "@/lib/db";
import { getContext } from "@/lib/auth/session";
import { AssistantButton, GlobalSearch, MobileTabBar, NotificationBell, Sidebar, UserMenu, type NavItem } from "@/components/app-shell";
import { logout, switchOrganization } from "@/app/actions/auth";
import { ASSISTANT_SUGGESTIONS } from "@/lib/services/assistant";
import { applicationScope } from "@/lib/services/scope";
import { myNextSteps } from "@/lib/services/next-steps";
import { planById } from "@/lib/billing";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  const [memberships, reviewCount, sub] = await Promise.all([
    db.membership.findMany({ where: { userId: ctx.user.id }, include: { org: { select: { id: true, name: true } } } }),
    ctx.can("candidates.view") ? myNextSteps(applicationScope(ctx)).then((l) => l.length) : 0,
    db.subscription.findUnique({ where: { orgId: ctx.orgId } }),
  ]);
  const items: NavItem[] = [
    { href: "/app", label: "Übersicht", icon: "dashboard" },
    ...(ctx.can("jobs.view") ? [{ href: "/app/jobs", label: "Stellen", icon: "jobs" as const, section: "Recruiting" }] : []),
    ...(ctx.can("candidates.view") ? [{ href: "/app/candidates", label: "Kandidierende", icon: "candidates" as const, badge: reviewCount || undefined, section: "Recruiting" }] : []),
    ...(ctx.can("interviews.view") ? [{ href: "/app/interviews", label: "Gespräche", icon: "interviews" as const, section: "Recruiting" }] : []),
    ...(ctx.can("candidates.view") ? [{ href: "/app/talent-pool", label: "Talent-Pool", icon: "pool" as const, section: "Recruiting" }] : []),
    ...(ctx.can("assistant.use") ? [{ href: "/app/assistant", label: "KI-Assistent", icon: "assistant" as const, section: "KI & Abläufe" }] : []),
    ...(ctx.can("automations.manage") ? [{ href: "/app/automations", label: "Automationen", icon: "automations" as const, section: "KI & Abläufe" }] : []),
    ...(ctx.can("analytics.view") ? [{ href: "/app/analytics", label: "Auswertungen", icon: "analytics" as const, section: "Verwaltung" }] : []),
    ...(ctx.can("integrations.manage") ? [{ href: "/app/integrations", label: "Integrationen", icon: "integrations" as const, section: "Verwaltung" }] : []),
    { href: "/app/settings", label: "Einstellungen", icon: "settings", section: "Verwaltung" },
  ];
  const demo = Boolean((ctx.org.settings as Record<string, unknown>).demo);
  const trialDays = sub?.status === "TRIALING" && sub.trialEndsAt ? Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - Date.now()) / 86400_000)) : null;
  return (
    <div className="min-h-screen">
      <Sidebar
        items={items}
        orgName={ctx.org.name}
        orgs={memberships.map((m) => m.org)}
        currentOrgId={ctx.orgId}
        switchAction={switchOrganization}
        footer={
          <div className="rounded-lg bg-white/5 p-3 text-xs ring-1 ring-white/10">
            <p className="font-semibold text-white">Plan {planById(sub?.plan ?? "GROWTH").name}{trialDays != null ? " · Testphase" : ""}</p>
            <p className="mt-0.5 text-slate-400">{trialDays != null ? `Noch ${trialDays} Tage Testphase` : "Verbrauch & Abrechnung"}</p>
            {ctx.can("usage.view") && <Link href="/app/settings/usage" className="mt-2 inline-block font-medium text-brand-300 hover:underline">Verbrauch ansehen →</Link>}
          </div>
        }
      />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/90 px-4 pl-16 backdrop-blur-md sm:px-6 lg:pl-10">
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1.5">
            {ctx.can("assistant.use") && <AssistantButton suggestions={ASSISTANT_SUGGESTIONS} />}
            <NotificationBell />
            <UserMenu name={ctx.user.name} email={ctx.user.email} role={ctx.role} logoutAction={logout} />
          </div>
        </header>
        {demo && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900 sm:px-6">
            Demo-Firma mit erfundenen Daten. Telefonanrufe werden simuliert, bis Twilio verbunden ist.
          </div>
        )}
        {!ctx.user.emailVerifiedAt && (
          <div className="border-b border-brand-200 bg-brand-50 px-4 py-1.5 text-center text-xs text-brand-900 sm:px-6">
            Bitte bestätigen Sie Ihre E-Mail-Adresse. <Link href="/app/settings/profile" className="font-semibold underline">Bestätigungs-E-Mail erneut senden</Link>
          </div>
        )}
        <main className="mx-auto max-w-[1320px] px-4 pb-24 pt-8 sm:px-6 lg:px-10 lg:pb-12">{children}</main>
      </div>
      <MobileTabBar items={items} />
    </div>
  );
}
