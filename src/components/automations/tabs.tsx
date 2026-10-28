import { Tabs } from "@/components/ui";

export function AutomationTabs({ active }: { active: string }) {
  return <Tabs active={active} tabs={[{ id: "flows", label: "Abläufe", href: "/app/automations" }, { id: "templates", label: "Nachrichtenvorlagen", href: "/app/automations/templates" }, { id: "messages", label: "Postausgang", href: "/app/automations/messages" }]} />;
}
