import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input, Logo, Select, Textarea } from "@/components/ui";
import { onboardingBack, saveOnboardingStep } from "@/app/actions/onboarding";
import { cn } from "@/lib/utils";

export const metadata = { title: "Set up your workspace" };

const STEPS = ["Company", "Recruiting volume", "Recruiting setup", "Company profile", "First job"];

export default async function OnboardingPage() {
  const session = await requireUser();
  const membership = await db.membership.findFirst({
    where: { userId: session.userId, ...(session.activeOrgId ? { orgId: session.activeOrgId } : {}) },
    include: { org: true },
    orderBy: { createdAt: "asc" },
  });
  const org = membership?.org;
  if (org?.onboardingCompleted) redirect("/app");
  const step = org ? Math.min(5, org.onboardingStep) : 1;
  const rp = (org?.recruitingProfile ?? {}) as Record<string, string | number | null>;
  const setup = (org?.setup ?? {}) as Record<string, string>;

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo />
          <span className="text-sm text-slate-500">Setup takes about 3 minutes</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <ol className="mb-10 flex items-center gap-2" aria-label="Progress">
          {STEPS.map((s, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <li key={s} className="flex flex-1 flex-col gap-2">
                <div className={cn("h-1.5 rounded-full", done ? "bg-brand-600" : active ? "bg-brand-300" : "bg-slate-200")} />
                <span className={cn("hidden text-xs sm:flex sm:items-center sm:gap-1", active ? "font-medium text-ink" : "text-slate-500")}>
                  {done && <Check className="h-3 w-3 text-brand-600" />}
                  {n}. {s}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="card p-6 sm:p-8">
          <ActionForm action={saveOnboardingStep} className="space-y-5">
            <input type="hidden" name="step" value={step} />
            {step === 1 && (
              <>
                <Header title={`Welcome${session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}! Tell us about your company.`} sub="This creates your secure, isolated Hirely workspace." />
                <Field label="Company name"><Input name="name" required defaultValue={org?.name ?? ""} placeholder="e.g. Muster AG" autoFocus /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Industry">
                    <Select name="industry" defaultValue={org?.industry ?? "Mechanical & Plant Engineering"}>
                      {["Mechanical & Plant Engineering", "Manufacturing", "Construction", "Healthcare", "Logistics", "Retail", "Hospitality", "IT & Software", "Financial Services", "Public Sector", "Other"].map((x) => <option key={x}>{x}</option>)}
                    </Select>
                  </Field>
                  <Field label="Company size">
                    <Select name="companySize" defaultValue={org?.companySize ?? "51–200"}>
                      {["1–50", "51–200", "201–500", "501–1000", "1000+"].map((x) => <option key={x}>{x}</option>)}
                    </Select>
                  </Field>
                  <Field label="Country">
                    <Select name="country" defaultValue={org?.country ?? "CH"}>
                      <option value="CH">Switzerland</option><option value="DE">Germany</option><option value="AT">Austria</option><option value="LI">Liechtenstein</option>
                    </Select>
                  </Field>
                  <Field label="Main language" hint="Default language for job ads and candidate communication.">
                    <Select name="language" defaultValue={org?.language ?? "de"}>
                      <option value="de">Deutsch</option><option value="fr">Français</option><option value="it">Italiano</option><option value="en">English</option>
                    </Select>
                  </Field>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <Header title="How much do you recruit?" sub="We use this to recommend a plan and sensible automation defaults." />
                <Field label="Recruiting pattern">
                  <Select name="volume" defaultValue={String(rp.volume ?? "recurring")}>
                    <option value="occasional">Occasional hires</option><option value="recurring">Recurring hiring throughout the year</option><option value="high">High volume (seasonal / blue-collar)</option>
                  </Select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Number of employees"><Input name="employees" type="number" min={1} defaultValue={String(rp.employees ?? "")} placeholder="250" /></Field>
                  <Field label="Applications / month"><Input name="applicationsPerMonth" type="number" min={0} defaultValue={String(rp.applicationsPerMonth ?? "")} placeholder="120" /></Field>
                  <Field label="Open positions (avg.)"><Input name="openPositionsAvg" type="number" min={0} defaultValue={String(rp.openPositionsAvg ?? "")} placeholder="6" /></Field>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <Header title="Your current recruiting setup" sub="You can connect these later under Integrations. Hirely works without them from day one." />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Applicant tracking system (ATS)">
                    <Select name="ats" defaultValue={setup.ats ?? "none"}>
                      <option value="none">No ATS — use Hirely</option><option value="personio">Personio</option><option value="workday">Workday</option><option value="successfactors">SAP SuccessFactors</option><option value="abacus">Abacus</option><option value="rexx">rexx systems</option><option value="recruitee">Recruitee</option><option value="other">Other</option>
                    </Select>
                  </Field>
                  <Field label="Email provider">
                    <Select name="email" defaultValue={setup.email ?? "microsoft365"}>
                      <option value="microsoft365">Microsoft 365</option><option value="google">Google Workspace</option><option value="other">Other (SMTP)</option>
                    </Select>
                  </Field>
                  <Field label="Calendar">
                    <Select name="calendar" defaultValue={setup.calendar ?? "microsoft"}>
                      <option value="microsoft">Microsoft Outlook</option><option value="google">Google Calendar</option><option value="none">None</option>
                    </Select>
                  </Field>
                  <Field label="Phone provider for AI calls">
                    <Select name="phone" defaultValue={setup.phone ?? "hirely"}>
                      <option value="hirely">Use Hirely's Swiss number</option><option value="twilio">Own Twilio account</option><option value="none">No phone interviews</option>
                    </Select>
                  </Field>
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <Header title="How should Hirely represent you?" sub="Hirely uses this in job ads, messages and when introducing itself on calls." />
                <Field label="Company description"><Textarea name="description" rows={4} defaultValue={org?.description ?? ""} placeholder="What does your company do, where, how many people…" /></Field>
                <Field label="Company values"><Textarea name="values" rows={3} defaultValue={org?.values ?? ""} placeholder="e.g. Precision, reliability and respect." /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tone of communication">
                    <Select name="tone" defaultValue={org?.tone ?? "professional-warm"}>
                      <option value="professional-warm">Professional & warm (Sie)</option><option value="formal">Formal</option><option value="casual">Casual & modern (Du)</option>
                    </Select>
                  </Field>
                  <Field label="Website"><Input name="website" type="url" defaultValue={org?.website ?? ""} placeholder="https://" /></Field>
                </div>
              </>
            )}
            {step === 5 && (
              <>
                <Header title="Create your first job" sub="Write rough notes — Hirely turns them into a professional job ad and an AI interview. You can review everything before publishing." />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Job title"><Input name="title" placeholder="Servicetechniker/in" autoFocus /></Field>
                  <Field label="Workload"><Input name="workload" placeholder="80–100%" /></Field>
                  <Field label="Department"><Input name="department" placeholder="Kundendienst" /></Field>
                  <Field label="Location"><Input name="location" placeholder="Winterthur" /></Field>
                </div>
                <Field label="Rough notes" hint="Tasks, team, anything relevant. One per line is fine.">
                  <Textarea name="notes" rows={4} placeholder={"Wartung und Reparatur unserer Anlagen beim Kunden\nFehlerdiagnose elektrisch/mechanisch\nPikettdienst"} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Must-have requirements" hint="One per line — used for transparent screening."><Textarea name="musts" rows={4} placeholder={"Deutsch B2\nFührerausweis Kat. B\n2 Jahre Erfahrung im Service"} /></Field>
                  <Field label="Nice-to-have"><Textarea name="nices" rows={4} placeholder={"Englisch B1\nSPS-Kenntnisse"} /></Field>
                </div>
                <input type="hidden" name="language" value={org?.language ?? "de"} />
              </>
            )}
            <div className="flex items-center justify-between border-t border-slate-100 pt-5">
              <div>{step > 1 && <span className="text-xs text-slate-500">Step {step} of 5</span>}</div>
              <div className="flex gap-2">
                {step === 5 && <SubmitButton variant="ghost" name="skip" value="1">Skip for now</SubmitButton>}
                <SubmitButton pendingText={step === 5 ? "Generating job ad…" : "Saving…"}>{step === 5 ? "Create job with AI" : "Continue"}</SubmitButton>
              </div>
            </div>
          </ActionForm>
          {step > 1 && (
            <div className="-mt-12 w-fit">
              <ActionButton action={onboardingBack} fields={{ step: String(step) }} variant="ghost">Back</ActionButton>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-2">
      <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{sub}</p>
    </div>
  );
}
