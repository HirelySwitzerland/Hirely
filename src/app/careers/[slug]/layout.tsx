import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Avatar } from "@/components/ui";

export default async function CareersLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await db.organization.findUnique({ where: { slug } });
  if (!org || !org.careerPageEnabled) notFound();
  return (
    <div className="min-h-screen bg-white" style={{ ["--brand" as string]: org.brandColor }}>
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href={`/careers/${org.slug}`} className="flex items-center gap-2.5">
            <Avatar name={org.name} size={32} color={org.brandColor} className="rounded-lg" />
            <span className="font-semibold text-ink">{org.name}</span>
          </Link>
          {org.website && <a href={org.website} className="text-sm text-slate-500 hover:text-ink" rel="noopener">{org.website.replace(/^https?:\/\//, "")}</a>}
        </div>
      </header>
      {children}
      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        <Link href={`/careers/${org.slug}/privacy`} className="hover:text-slate-600">Datenschutz / Privacy</Link> · Recruiting powered by <Link href="/" className="font-medium text-slate-500 hover:text-ink">Hirely</Link>
      </footer>
    </div>
  );
}
