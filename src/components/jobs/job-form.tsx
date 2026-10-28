"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Pencil, Sparkles } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { createJob, generateJobAd, updateJob } from "@/app/actions/jobs";
import type { ActionState } from "@/lib/action-state";
import { EMPLOYMENT_LABEL } from "@/lib/stages";

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
        <h2 className="mb-4 text-[15px] font-semibold text-ink">Stelle</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Stellentitel" className="md:col-span-2"><Input name="title" required defaultValue={job?.title ?? ""} placeholder="Servicetechniker/in" /></Field>
          <Field label="Abteilung"><Input name="department" defaultValue={job?.department ?? ""} /></Field>
          <Field label="Arbeitsort"><Input name="location" defaultValue={job?.location ?? ""} placeholder="Winterthur" /></Field>
          <Field label="Anstellungsart">
            <Select name="employmentType" defaultValue={job?.employmentType ?? "Full-time"}>
              {Object.entries(EMPLOYMENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Pensum"><Input name="workload" defaultValue={job?.workload ?? ""} placeholder="80–100%" /></Field>
          <Field label="Lohn von (CHF / Jahr)"><Input name="salaryMin" type="number" min={0} step={1000} defaultValue={job?.salaryMin ?? ""} /></Field>
          <Field label="Lohn bis (CHF / Jahr)"><Input name="salaryMax" type="number" min={0} step={1000} defaultValue={job?.salaryMax ?? ""} /></Field>
          <Field label="Arbeitszeit"><Input name="workingHours" defaultValue={job?.workingHours ?? ""} placeholder="42 Std./Woche, Gleitzeit" /></Field>
          <Field label="Sprache von Inserat & Interview">
            <Select name="language" defaultValue={job?.language ?? "de"}>
              <option value="de">Deutsch</option><option value="fr">Français</option><option value="it">Italiano</option><option value="en">English</option>
            </Select>
          </Field>
          <Field label="Erfahrung"><Input name="experience" defaultValue={job?.experience ?? ""} placeholder="3+ Jahre" /></Field>
          <Field label="Ausbildung"><Input name="education" defaultValue={job?.education ?? ""} placeholder="EFZ / HF / FH" /></Field>
          <Field label="Skills" hint="Mit Komma getrennt" className="md:col-span-2"><Input name="skills" defaultValue={job?.skills?.join(", ") ?? ""} /></Field>
          {job?.id && (
            <Field label="Linienvorgesetzte/r" hint="Sieht nur Kandidierende der eigenen Stellen.">
              <Select name="hiringManagerId" defaultValue={job.hiringManagerId ?? ""}>
                <option value="">– Keine –</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </Field>
          )}
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Stelleninserat</h2>
            <p className="text-[13px] text-slate-500">Stichworte notieren – Hirely schreibt daraus ein professionelles Inserat. Sie prüfen es vor der Veröffentlichung.</p>
          </div>
          <Button type="button" variant="subtle" onClick={generate} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Mit KI schreiben
          </Button>
        </div>
        <Field label="Stichworte" hint="Aufgaben, Team, Besonderheiten – Stichpunkte genügen.">
          <Textarea name="roughNotes" rows={4} defaultValue={job?.roughNotes ?? ""} placeholder={"Wartung und Reparatur beim Kunden\nFehlerdiagnose\nPikettdienst"} />
        </Field>
        <FormMessage state={genState} className="mt-4" />
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label mb-0">Beschreibung (Markdown)</span>
            <button type="button" onClick={() => setPreview((p) => !p)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">
              {preview ? <><Pencil className="h-3 w-3" />Bearbeiten</> : <><Eye className="h-3 w-3" />Vorschau</>}
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
        {!job?.id && <SubmitButton variant="secondary" name="publish" value="0">Als Entwurf speichern</SubmitButton>}
        <SubmitButton name="publish" value={job?.id ? undefined : "0"}>{job?.id ? "Änderungen speichern" : "Weiter zu den KI-Kriterien"}</SubmitButton>
      </div>
    </form>
  );
}
