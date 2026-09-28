"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Pencil, Sparkles } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { createJob, generateJobAd, updateJob } from "@/app/actions/jobs";
import type { ActionState } from "@/lib/action-state";

type JobValues = {
  id?: string; title?: string; department?: string | null; location?: string | null; employmentType?: string | null; workload?: string | null;
  salaryMin?: number | null; salaryMax?: number | null; description?: string | null; roughNotes?: string | null; language?: string; workingHours?: string | null;
  experience?: string | null; education?: string | null; skills?: string[]; hiringManagerId?: string | null;
};

export function JobForm({ job, managers, requirementsText }: { job?: JobValues; managers: { id: string; name: string }[]; requirementsText?: string }) {
  const [state, action] = useActionState(job?.id ? updateJob : createJob, null);
  const [genState, setGenState] = useState<ActionState>(null);
  const [description, setDescription] = useState(job?.description ?? "");
  const [preview, setPreview] = useState(false);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) state.redirect ? router.push(state.redirect) : router.refresh();
  }, [state, router]);

  const generate = () => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.set("requirementsText", requirementsText ?? "");
    start(async () => {
      const r = await generateJobAd(null, fd);
      setGenState(r);
      const d = (r?.data as { description?: string } | undefined)?.description;
      if (d) {
        setDescription(d);
        setPreview(true);
      }
    });
  };

  return (
    <form ref={formRef} action={action} className="space-y-6">
      {job?.id && <input type="hidden" name="id" value={job.id} />}
      <FormMessage state={state} />
      <div className="card p-5 sm:p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-ink">Position</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Job title" className="md:col-span-2"><Input name="title" required defaultValue={job?.title ?? ""} placeholder="Servicetechniker/in" /></Field>
          <Field label="Department"><Input name="department" defaultValue={job?.department ?? ""} /></Field>
          <Field label="Location"><Input name="location" defaultValue={job?.location ?? ""} placeholder="Winterthur" /></Field>
          <Field label="Employment type">
            <Select name="employmentType" defaultValue={job?.employmentType ?? "Full-time"}>
              {["Full-time", "Part-time", "Temporary", "Apprenticeship", "Internship"].map((x) => <option key={x}>{x}</option>)}
            </Select>
          </Field>
          <Field label="Workload"><Input name="workload" defaultValue={job?.workload ?? ""} placeholder="80–100%" /></Field>
          <Field label="Salary from (CHF / year)"><Input name="salaryMin" type="number" min={0} step={1000} defaultValue={job?.salaryMin ?? ""} /></Field>
          <Field label="Salary to (CHF / year)"><Input name="salaryMax" type="number" min={0} step={1000} defaultValue={job?.salaryMax ?? ""} /></Field>
          <Field label="Working hours"><Input name="workingHours" defaultValue={job?.workingHours ?? ""} placeholder="42h/week, flexitime" /></Field>
          <Field label="Language of the ad & interview">
            <Select name="language" defaultValue={job?.language ?? "de"}>
              <option value="de">Deutsch</option><option value="fr">Français</option><option value="it">Italiano</option><option value="en">English</option>
            </Select>
          </Field>
          <Field label="Experience"><Input name="experience" defaultValue={job?.experience ?? ""} placeholder="3+ years" /></Field>
          <Field label="Education"><Input name="education" defaultValue={job?.education ?? ""} placeholder="EFZ / HF / FH" /></Field>
          <Field label="Skills" hint="Comma-separated" className="md:col-span-2"><Input name="skills" defaultValue={job?.skills?.join(", ") ?? ""} /></Field>
          {job?.id && (
            <Field label="Hiring manager" hint="Hiring managers only see candidates for their own positions.">
              <Select name="hiringManagerId" defaultValue={job.hiringManagerId ?? ""}>
                <option value="">— None —</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </Field>
          )}
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Job advertisement</h2>
            <p className="text-[13px] text-slate-500">Write rough notes and let Hirely draft a professional ad. You always review before publishing.</p>
          </div>
          <Button type="button" variant="subtle" onClick={generate} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate with AI
          </Button>
        </div>
        <Field label="Rough notes" hint="Tasks, team, what makes the role special — bullet points are fine.">
          <Textarea name="roughNotes" rows={4} defaultValue={job?.roughNotes ?? ""} placeholder={"Wartung und Reparatur beim Kunden\nFehlerdiagnose\nPikettdienst"} />
        </Field>
        <FormMessage state={genState} className="mt-4" />
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label mb-0">Description (Markdown)</span>
            <button type="button" onClick={() => setPreview((p) => !p)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">
              {preview ? <><Pencil className="h-3 w-3" />Edit</> : <><Eye className="h-3 w-3" />Preview</>}
            </button>
          </div>
          <input type="hidden" name="description" value={description} />
          {preview ? (
            <div className="min-h-[200px] rounded-lg border border-slate-200 p-5"><Markdown text={description || "_Nothing yet._"} /></div>
          ) : (
            <Textarea rows={14} value={description} onChange={(e) => setDescription(e.target.value)} className="font-mono text-[13px]" placeholder="## Job title&#10;&#10;### Your responsibilities&#10;- …" />
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {!job?.id && <SubmitButton variant="secondary" name="publish" value="0">Save as draft</SubmitButton>}
        <SubmitButton name="publish" value={job?.id ? undefined : "0"}>{job?.id ? "Save changes" : "Continue to AI configuration"}</SubmitButton>
      </div>
    </form>
  );
}
