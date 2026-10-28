import { getContext } from "@/lib/auth/session";
import { SettingsNav, type SettingsLink } from "@/components/settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  const all: (SettingsLink & { perm?: Parameters<typeof ctx.can>[0] })[] = [
    { href: "/app/settings", label: "Firma", group: "Firma", perm: "settings.manage" },
    { href: "/app/settings/users", label: "Benutzer", group: "Firma", perm: "users.manage" },
    { href: "/app/settings/roles", label: "Rollen & Rechte", group: "Firma" },
    { href: "/app/settings/billing", label: "Abrechnung", group: "Firma", perm: "billing.manage" },
    { href: "/app/settings/usage", label: "Verbrauch & Kosten", group: "Firma", perm: "usage.view" },
    { href: "/app/settings/implementation", label: "Einführung", group: "Firma", perm: "settings.manage" },
    { href: "/app/settings/ai", label: "KI-Einstellungen", group: "Recruiting", perm: "settings.manage" },
    { href: "/app/settings/voice", label: "Telefon-Interview", group: "Recruiting", perm: "settings.manage" },
    { href: "/app/settings/communication", label: "E-Mail & SMS", group: "Recruiting", perm: "settings.manage" },
    { href: "/app/integrations", label: "Integrationen", group: "Recruiting", perm: "integrations.manage" },
    { href: "/app/settings/privacy", label: "Datenschutz", group: "Datenschutz & System", perm: "privacy.manage" },
    { href: "/app/settings/audit", label: "Protokoll", group: "Datenschutz & System", perm: "audit.view" },
    { href: "/app/settings/system", label: "Systemstatus", group: "Datenschutz & System", perm: "settings.manage" },
    { href: "/app/settings/profile", label: "Profil & Sicherheit", group: "Persönlich" },
    { href: "/app/settings/calendar", label: "Meine Verfügbarkeit", group: "Persönlich" },
    { href: "/app/settings/notifications", label: "Mitteilungen", group: "Persönlich" },
  ];
  const links = all.filter((l) => !l.perm || ctx.can(l.perm));
  return (
    <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <h1 className="mb-4 hidden text-xl font-semibold tracking-tight text-ink lg:block">Einstellungen</h1>
        <SettingsNav links={links} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
