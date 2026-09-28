import { Tabs } from "@/components/ui";

export function AutomationTabs({ active }: { active: string }) {
  return <Tabs active={active} tabs={[{ id: "flows", label: "Workflows", href: "/app/automations" }, { id: "templates", label: "Message templates", href: "/app/automations/templates" }, { id: "messages", label: "Outbox", href: "/app/automations/messages" }]} />;
}
