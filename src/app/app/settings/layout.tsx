import { getContext } from "@/lib/auth/session";
import { SettingsNav, type SettingsLink } from "@/components/settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  const all: (SettingsLink & { perm?: Parameters<typeof ctx.can>[0] })[] = [
    { href: "/app/settings", label: "Company", group: "Organization", perm: "settings.manage" },
    { href: "/app/settings/users", label: "Users", group: "Organization", perm: "users.manage" },
    { href: "/app/settings/roles", label: "Roles & permissions", group: "Organization" },
    { href: "/app/settings/billing", label: "Billing", group: "Organization", perm: "billing.manage" },
    { href: "/app/settings/usage", label: "AI usage & costs", group: "Organization", perm: "usage.view" },
    { href: "/app/settings/implementation", label: "Implementation", group: "Organization", perm: "settings.manage" },
    { href: "/app/settings/ai", label: "AI settings", group: "Recruiting", perm: "settings.manage" },
    { href: "/app/settings/voice", label: "Voice settings", group: "Recruiting", perm: "settings.manage" },
    { href: "/app/settings/communication", label: "Email & SMS", group: "Recruiting", perm: "settings.manage" },
    { href: "/app/integrations", label: "Integrations", group: "Recruiting", perm: "integrations.manage" },
    { href: "/app/settings/privacy", label: "Privacy & retention", group: "Compliance", perm: "privacy.manage" },
    { href: "/app/settings/audit", label: "Audit log", group: "Compliance", perm: "audit.view" },
    { href: "/app/settings/system", label: "System status", group: "Compliance", perm: "settings.manage" },
    { href: "/app/settings/profile", label: "Profile & security", group: "Personal" },
    { href: "/app/settings/calendar", label: "My availability", group: "Personal" },
    { href: "/app/settings/notifications", label: "Notifications", group: "Personal" },
  ];
  const links = all.filter((l) => !l.perm || ctx.can(l.perm));
  return (
    <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <h1 className="mb-4 hidden text-xl font-semibold tracking-tight text-ink lg:block">Settings</h1>
        <SettingsNav links={links} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
