import Link from "next/link";
import { db } from "@/lib/db";
import { getContext } from "@/lib/auth/session";
import { DEFAULT_AVAILABILITY } from "@/lib/services/scheduling";
import { Card, CardHeader } from "@/components/ui";
import { AvailabilityEditor } from "@/components/settings/availability-editor";

export const metadata = { title: "My availability" };

export default async function CalendarSettings() {
  const ctx = await getContext();
  const rows = await db.recruiterAvailability.findMany({ where: { orgId: ctx.orgId, userId: ctx.user.id } });
  const cal = await db.integration.findFirst({ where: { orgId: ctx.orgId, kind: "CALENDAR", status: "CONNECTED" } });
  return (
    <Card>
      <CardHeader title="My interview availability" description={`Candidates can only book personal interviews inside these windows (Europe/Zurich). ${cal ? `Busy times from your ${cal.provider === "google" ? "Google" : "Outlook"} calendar are excluded automatically.` : "Connect a calendar under Integrations to exclude busy times."}`} />
      <div className="p-5">
        <AvailabilityEditor initial={rows.length ? rows.map((r) => ({ weekday: r.weekday, startMinute: r.startMinute, endMinute: r.endMinute })) : DEFAULT_AVAILABILITY} />
        {!cal && <p className="mt-4 text-xs text-slate-500"><Link href="/app/integrations" className="link">Connect Google Calendar or Outlook</Link></p>}
      </div>
    </Card>
  );
}
