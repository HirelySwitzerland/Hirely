import Link from "next/link";
import { pageContext } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui";
import { JobForm } from "@/components/jobs/job-form";

export const metadata = { title: "Neue Stelle" };

export default async function NewJobPage() {
  await pageContext("jobs.manage");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader breadcrumb={<Link href="/app/jobs" className="hover:text-ink">Stellen</Link>} title="Neue Stelle erstellen" description="Zuerst die Grundangaben. Danach legen Sie die KI-Kriterien und das Interview fest." />
      <JobForm managers={[]} />
    </div>
  );
}
