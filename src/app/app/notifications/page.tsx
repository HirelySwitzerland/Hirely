import Link from "next/link";
import { Bell } from "lucide-react";
import { db } from "@/lib/db";
import { getContext } from "@/lib/auth/session";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { ago, cn } from "@/lib/utils";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const ctx = await getContext();
  const items = await db.notification.findMany({ where: { userId: ctx.user.id, orgId: ctx.orgId }, orderBy: { createdAt: "desc" }, take: 100 });
  const dot: Record<string, string> = { error: "bg-rose-500", warning: "bg-amber-500", success: "bg-emerald-500", info: "bg-brand-500" };
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" description="Everything Hirely wants you to know — new applications, candidates ready for review, scheduled interviews and anything that needs attention." actions={<LinkButton href="/app/settings/notifications" variant="secondary">Preferences</LinkButton>} />
      <Card>
        {items.length === 0 ? <EmptyState icon={<Bell className="h-5 w-5" />} title="No notifications" /> : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => (
              <li key={n.id}>
                <Link href={n.link ?? "#"} className={cn("flex gap-3 px-5 py-3.5 hover:bg-slate-50", !n.readAt && "bg-brand-50/40")}>
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-slate-200" : dot[n.severity] ?? dot.info)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-[13px] text-slate-600">{n.body}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{ago(n.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
