import Link from "next/link";
import { pageContext } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui";
import { JobForm } from "@/components/jobs/job-form";

export const metadata = { title: "New job" };

export default async function NewJobPage() {
  await pageContext("jobs.manage");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader breadcrumb={<Link href="/app/jobs" className="hover:text-ink">Jobs</Link>} title="Create a position" description="Start with the basics. Next you'll define the AI screening criteria and interview." />
      <JobForm managers={[]} />
    </div>
  );
}
