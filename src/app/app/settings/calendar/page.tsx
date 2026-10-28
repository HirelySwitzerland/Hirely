import Link from "next/link";
import { db } from "@/lib/db";
import { getContext } from "@/lib/auth/session";
import { DEFAULT_AVAILABILITY } from "@/lib/services/scheduling";
import { Card, CardHeader } from "@/components/ui";
import { AvailabilityEditor } from "@/components/settings/availability-editor";

export const metadata = { title: "Meine Verfügbarkeit" };

export default async function CalendarSettings() {
  const ctx = await getContext();
  const rows = await db.recruiterAvailability.findMany({ where: { orgId: ctx.orgId, userId: ctx.user.id } });
  const cal = await db.integration.findFirst({ where: { orgId: ctx.orgId, kind: "CALENDAR", status: "CONNECTED" } });
  return (
    <Card>
      <CardHeader title="Meine Zeiten für Gespräche" description={`Kandidierende können nur in diesen Zeitfenstern buchen (Schweizer Zeit). ${cal ? `Belegte Zeiten aus Ihrem ${cal.provider === "google" ? "Google" : "Outlook"}-Kalender werden automatisch ausgeschlossen.` : "Verbinden Sie unter Integrationen einen Kalender, damit belegte Zeiten ausgeschlossen werden."}`} />
      <div className="p-5">
        <AvailabilityEditor initial={rows.length ? rows.map((r) => ({ weekday: r.weekday, startMinute: r.startMinute, endMinute: r.endMinute })) : DEFAULT_AVAILABILITY} />
        {!cal && <p className="mt-4 text-xs text-slate-500"><Link href="/app/integrations" className="link">Google Kalender oder Outlook verbinden</Link></p>}
      </div>
    </Card>
  );
}
