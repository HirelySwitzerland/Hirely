import { getContext } from "@/lib/auth/session";
import { NOTIFICATION_TYPES } from "@/lib/services/notifications";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, CardHeader, Checkbox } from "@/components/ui";
import { saveNotificationPrefs } from "@/app/actions/settings";

export const metadata = { title: "Notification settings" };

export default async function NotificationSettings() {
  const ctx = await getContext();
  const prefs = (ctx.membership.notifyPrefs ?? {}) as Record<string, boolean>;
  const types = Object.entries(NOTIFICATION_TYPES).filter(([, d]) => ctx.can(d.permission));
  return (
    <Card>
      <CardHeader title="Notifications" description="Choose which in-app notifications you receive in this organization." />
      <ActionForm action={saveNotificationPrefs} className="space-y-3 p-5">
        <input type="hidden" name="types" value={types.map(([k]) => k).join(",")} />
        {types.map(([k, d]) => <Checkbox key={k} name={k} defaultChecked={prefs[k] !== false} label={d.label} />)}
        <SubmitButton>Save preferences</SubmitButton>
      </ActionForm>
    </Card>
  );
}
