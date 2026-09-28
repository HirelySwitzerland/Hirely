import Link from "next/link";
import { db } from "@/lib/db";
import { getContext } from "@/lib/auth/session";
import { getT } from "@/lib/i18n";
import { AssistantButton, GlobalSearch, MobileTabBar, NotificationBell, Sidebar, UserMenu, type NavItem } from "@/components/app-shell";
import { logout, switchOrganization } from "@/app/actions/auth";
import { ASSISTANT_SUGGESTIONS } from "@/lib/services/assistant";
import { applicationScope } from "@/lib/services/scope";
import { planById } from "@/lib/billing";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  const t = getT(ctx.user.locale);
  const [memberships, reviewCount, sub] = await Promise.all([
    db.membership.findMany({ where: { userId: ctx.user.id }, include: { org: { select: { id: true, name: true } } } }),
    db.application.count({ where: { ...applicationScope(ctx), stage: "REVIEW" } }),
    db.subscription.findUnique({ where: { orgId: ctx.orgId } }),
  ]);
  const items: NavItem[] = [
    { href: "/app", label: t("nav.dashboard"), icon: "dashboard" },
    ...(ctx.can("jobs.view") ? [{ href: "/app/jobs", label: t("nav.jobs"), icon: "jobs" as const }] : []),
    ...(ctx.can("candidates.view") ? [{ href: "/app/candidates", label: t("nav.candidates"), icon: "candidates" as const, badge: reviewCount || undefined }] : []),
    ...(ctx.can("interviews.view") ? [{ href: "/app/interviews", label: t("nav.interviews"), icon: "interviews" as const }] : []),
    ...(ctx.can("candidates.view") ? [{ href: "/app/talent-pool", label: t("nav.talentPool"), icon: "pool" as const }] : []),
    ...(ctx.can("analytics.view") ? [{ href: "/app/analytics", label: t("nav.analytics"), icon: "analytics" as const }] : []),
    ...(ctx.can("automations.manage") ? [{ href: "/app/automations", label: t("nav.automations"), icon: "automations" as const }] : []),
    ...(ctx.can("integrations.manage") ? [{ href: "/app/integrations", label: t("nav.integrations"), icon: "integrations" as const }] : []),
    { href: "/app/settings", label: t("nav.settings"), icon: "settings" },
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
          <div className="rounded-lg bg-white p-3 text-xs ring-1 ring-slate-200">
            <p className="font-semibold text-ink">{planById(sub?.plan ?? "GROWTH").name} plan{trialDays != null ? ` · trial` : ""}</p>
            <p className="mt-0.5 text-slate-500">{trialDays != null ? `${trialDays} days left in your trial` : "Usage & billing in settings"}</p>
            {ctx.can("usage.view") && <Link href="/app/settings/usage" className="mt-2 inline-block font-medium text-brand-600 hover:underline">View usage →</Link>}
          </div>
        }
      />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 pl-16 backdrop-blur-md sm:px-6 lg:pl-6">
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1.5">
            {ctx.can("assistant.use") && <AssistantButton suggestions={ASSISTANT_SUGGESTIONS} />}
            <NotificationBell />
            <UserMenu name={ctx.user.name} email={ctx.user.email} role={ctx.role} logoutAction={logout} />
          </div>
        </header>
        {demo && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900 sm:px-6">
            Demo workspace with fictional data. Phone calls use the simulated voice provider until Twilio is connected.
          </div>
        )}
        {!ctx.user.emailVerifiedAt && (
          <div className="border-b border-brand-200 bg-brand-50 px-4 py-1.5 text-center text-xs text-brand-900 sm:px-6">
            Please confirm your email address. <Link href="/app/settings/profile" className="font-semibold underline">Resend verification email</Link>
          </div>
        )}
        <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-6 sm:px-6 lg:pb-10">{children}</main>
      </div>
      <MobileTabBar items={items} />
    </div>
  );
}
