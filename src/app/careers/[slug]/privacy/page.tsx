import { db } from "@/lib/db";

export default async function PrivacyNotice({ params }: { params: Promise<{ slug: string }> }) {
  const org = await db.organization.findUniqueOrThrow({ where: { slug: (await params).slug } });
  const s = org.settings as Record<string, unknown>;
  const days = Number(s.retentionDays ?? 180);
  return (
    <main className="prose-hirely mx-auto max-w-3xl px-4 py-12 text-[15px]">
      <h2>Privacy notice for applicants</h2>
      <p><strong>{org.name}</strong> is responsible for processing your application data. Hirely acts as a processor on behalf of {org.name} (data hosted in Switzerland).</p>
      <h3>What we process</h3>
      <ul>
        <li>Your contact details, CV and the answers you provide.</li>
        <li>If you take part in the AI pre-screening: the conversation transcript and, with your consent, the recording.</li>
        <li>For video interviews: your recordings and their transcripts. Only the content of your answers is analyzed — never your appearance, voice characteristics, emotions or any protected characteristic.</li>
      </ul>
      <h3>How AI is used</h3>
      <p>An AI assistant structures your CV, asks every applicant the same job-related questions and summarizes answers. It shows recruiters for each configured requirement whether there is evidence and where it comes from. It does not make decisions: every decision about your application is made by a person.</p>
      <h3>Retention</h3>
      <p>Your data is deleted {days} days after the process ends, unless you agree to join our talent pool. You can withdraw consent at any time.</p>
      <h3>Your rights</h3>
      <p>You can access, export or delete your data at any time via the link in your confirmation email (candidate portal), or by contacting {org.name}.</p>
    </main>
  );
}
