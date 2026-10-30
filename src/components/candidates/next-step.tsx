"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowRight, CalendarPlus, Check, CheckCircle2, Clock, FileWarning, Hourglass, Library, Mail, Phone, RefreshCw, Send, Star, Trophy, UserX,
} from "lucide-react";
import type { Stage } from "@prisma/client";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { callNowFromProfile, invitePersonal, inviteAi, moveStage, rerunScreening, retryInterview, sendCandidateMessage } from "@/app/actions/candidates";
import { PROCESS_STEPS, type NextAction, type NextStep } from "@/lib/next-step";
import { cn } from "@/lib/utils";

type Perms = { canStage: boolean; canMessage: boolean; canInterview: boolean; canManage: boolean };

const NEEDS: Record<NextAction, keyof Perms> = {
  invite_ai: "canInterview", call_now: "canInterview", resend_ai: "canInterview", rerun_screening: "canManage", ask_cv: "canMessage",
  invite_personal: "canMessage", shortlist: "canStage", offer: "canStage", hire: "canStage", reject: "canStage", talent_pool: "canStage",
};

function choice(a: NextAction, n: string, stage: Stage): { label: string; sub: string; icon: ReactNode } {
  switch (a) {
    case "invite_ai": return { label: "Zum KI-Interview einladen", sub: "Recruit24 führt das Vorabgespräch", icon: <Phone className="h-5 w-5" /> };
    case "call_now": return { label: "Nochmals anrufen", sub: "Recruit24 ruft jetzt an", icon: <Phone className="h-5 w-5" /> };
    case "resend_ai": return { label: "Link per E-Mail senden", sub: "Interview im Browser oder Rückruf", icon: <Send className="h-5 w-5" /> };
    case "rerun_screening": return { label: "Neu prüfen", sub: "Nachdem ein neuer CV da ist", icon: <RefreshCw className="h-5 w-5" /> };
    case "ask_cv": return { label: "Um neuen Lebenslauf bitten", sub: "E-Mail ist schon vorbereitet", icon: <FileWarning className="h-5 w-5" /> };
    case "invite_personal": return stage === "PERSONAL_INTERVIEW"
      ? { label: "Weiteres Gespräch", sub: `${n} wählt wieder selbst einen Termin`, icon: <CalendarPlus className="h-5 w-5" /> }
      : { label: "Zum Gespräch einladen", sub: `${n} wählt selbst einen Termin`, icon: <CalendarPlus className="h-5 w-5" /> };
    case "shortlist": return { label: "Engere Wahl", sub: "Vormerken, später einladen", icon: <Star className="h-5 w-5" /> };
    case "offer": return { label: "Angebot machen", sub: "Mit Angebots-E-Mail", icon: <Trophy className="h-5 w-5" /> };
    case "hire": return { label: "Hat zugesagt", sub: "Als eingestellt markieren", icon: <CheckCircle2 className="h-5 w-5" /> };
    case "reject": return stage === "OFFER"
      ? { label: "Hat abgelehnt", sub: "Ablauf beenden", icon: <UserX className="h-5 w-5" /> }
      : { label: "Absagen", sub: "Mit freundlicher Absage-E-Mail", icon: <UserX className="h-5 w-5" /> };
    case "talent_pool": return { label: "In den Talent-Pool", sub: "Für spätere Stellen vormerken", icon: <Library className="h-5 w-5" /> };
  }
}

export function NextStepCard({
  step, stage, applicationId, interviewId, firstName, hasPhone, perms, interviewers, defaultLocation,
}: {
  step: NextStep; stage: Stage; applicationId: string; interviewId: string | null; firstName: string; hasPhone: boolean; perms: Perms;
  interviewers: { id: string; name: string }[]; defaultLocation: string;
}) {
  const [open, setOpen] = useState<NextAction | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const actions = step.actions.filter((a) => perms[NEEDS[a]] && (a !== "resend_ai" || interviewId));
  const done = (s: { message?: string } | null) => { setOpen(null); setFlash(s?.message ?? "Erledigt."); };
  const mine = step.owner === "you";

  return (
    <section className={cn("mb-5 overflow-hidden rounded-2xl border bg-white shadow-card", mine ? "border-brand-300 ring-4 ring-brand-50" : "border-slate-200")} aria-label="Nächster Schritt">
      {step.step >= 0 && <ProcessLine current={step.step} finished={stage === "HIRED"} />}
      <div className="p-5 sm:p-6">
        <p className={cn("text-[12px] font-semibold uppercase tracking-wider", mine ? "text-brand-700" : "text-slate-500")}>
          {mine ? "Nächster Schritt · Sie sind dran" : step.owner === "done" ? "Abgeschlossen" : step.owner === "candidate" ? `Nächster Schritt · ${firstName} ist dran` : "Nächster Schritt · läuft automatisch"}
        </p>
        <div className="mt-1.5 flex items-start gap-3">
          {!mine && <span className="mt-0.5 shrink-0 text-slate-400">{step.owner === "done" ? <Check className="h-5 w-5" /> : step.owner === "candidate" ? <Hourglass className="h-5 w-5" /> : <Clock className="h-5 w-5" />}</span>}
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">{step.title}</h2>
            <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-slate-600">{step.text}</p>
          </div>
        </div>

        {flash && <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{flash}</p>}

        {actions.length > 0 && (
          <>
            {mine && <p className="mt-5 text-sm font-medium text-ink">Bitte wählen:</p>}
            <div className={cn("mt-2 grid gap-3", actions.length === 1 ? "sm:grid-cols-1 sm:max-w-sm" : actions.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
              {actions.map((a, i) => {
                const c = choice(a, firstName, stage);
                const active = open === a;
                const primary = mine && i === 0;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => { setFlash(null); setOpen(active ? null : a); }}
                    aria-expanded={active}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200",
                      active ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : primary ? "border-brand-600 bg-brand-600 text-white hover:bg-brand-700" : a === "reject" ? "border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/40" : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40",
                    )}
                  >
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", primary && !active ? "bg-white/15 text-white" : a === "reject" ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-700")}>{c.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[15px] font-semibold", primary && !active ? "text-white" : "text-ink")}>{c.label}</span>
                      <span className={cn("block text-[13px]", primary && !active ? "text-white/80" : "text-slate-500")}>{c.sub}</span>
                    </span>
                    <ArrowRight className={cn("h-4 w-4 shrink-0 transition", active ? "rotate-90 text-brand-700" : primary ? "text-white/80" : "text-slate-300 group-hover:text-brand-600")} />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {open && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <Confirm
              action={open} stage={stage} applicationId={applicationId} interviewId={interviewId} firstName={firstName} hasPhone={hasPhone}
              interviewers={interviewers} defaultLocation={defaultLocation} onDone={done} onCancel={() => setOpen(null)}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function ProcessLine({ current, finished }: { current: number; finished: boolean }) {
  return (
    <ol className="scrollbar-thin flex items-center gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50/60 px-5 py-3 sm:px-6">
      {PROCESS_STEPS.map((label, i) => {
        const state = finished || i < current ? "done" : i === current ? "now" : "todo";
        return (
          <li key={label} className="flex shrink-0 items-center gap-1">
            {i > 0 && <span className={cn("mx-1 h-px w-4 sm:w-6", state === "todo" ? "bg-slate-200" : "bg-brand-300")} />}
            <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold", state === "done" ? "bg-brand-600 text-white" : state === "now" ? "bg-white text-brand-700 ring-2 ring-brand-600" : "bg-slate-200 text-slate-500")}>
              {state === "done" ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className={cn("text-[13px]", state === "now" ? "font-semibold text-ink" : state === "done" ? "text-slate-600" : "text-slate-400")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Buttons({ children, onCancel }: { children: ReactNode; onCancel: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {children}
      <button type="button" onClick={onCancel} className="h-9 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-ink">Abbrechen</button>
    </div>
  );
}

function Confirm({
  action, stage, applicationId, interviewId, firstName: n, hasPhone, interviewers, defaultLocation, onDone, onCancel,
}: {
  action: NextAction; stage: Stage; applicationId: string; interviewId: string | null; firstName: string; hasPhone: boolean;
  interviewers: { id: string; name: string }[]; defaultLocation: string; onDone: (s: { message?: string } | null) => void; onCancel: () => void;
}) {
  const id = <input type="hidden" name="applicationId" value={applicationId} />;
  const stageForm = (to: Stage, text: ReactNode, button: string, extra?: ReactNode, danger?: boolean) => (
    <ActionForm action={moveStage} onSuccess={onDone}>
      {id}<input type="hidden" name="stage" value={to} />
      <p className="text-sm text-slate-700">{text}</p>
      {extra}
      <Buttons onCancel={onCancel}><SubmitButton variant={danger ? "danger" : "primary"} pendingText="Wird gespeichert…">{button}</SubmitButton></Buttons>
    </ActionForm>
  );

  switch (action) {
    case "invite_personal":
      return (
        <ActionForm action={invitePersonal} onSuccess={onDone}>
          {id}
          <p className="text-sm text-slate-700">{n} erhält einen Link mit Ihren freien Terminen und wählt selbst. Kalendereintrag, Bestätigung und Erinnerungen entstehen automatisch.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Wer führt das Gespräch?">
              <Select name="interviewerId" defaultValue={interviewers[0]?.id}>{interviewers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</Select>
            </Field>
            <Field label="Dauer">
              <Select name="durationMin" defaultValue="60"><option value="30">30 Min.</option><option value="45">45 Min.</option><option value="60">60 Min.</option><option value="90">90 Min.</option></Select>
            </Field>
            <Field label="Ort oder Videolink"><Input name="location" defaultValue={defaultLocation} /></Field>
          </div>
          <Buttons onCancel={onCancel}><SubmitButton pendingText="Wird gesendet…"><Send className="h-4 w-4" />Einladung senden</SubmitButton></Buttons>
        </ActionForm>
      );
    case "shortlist":
      return stageForm("SHORTLISTED", <>{n} kommt in die <strong>engere Wahl</strong>. Die Person erhält noch keine Nachricht – Sie laden später zum Gespräch ein.</>, "In die engere Wahl");
    case "offer":
      return stageForm("OFFER", <>{n} erhält ein <strong>Angebot</strong>. Danach halten Sie hier fest, ob die Person zusagt.</>, "Angebot machen",
        <div className="mt-3"><Checkbox name="notify" defaultChecked label="Angebots-E-Mail senden" description="Verwendet Ihre Vorlage „Angebot“." /></div>);
    case "hire":
      return stageForm("HIRED", <>{n} wird als <strong>eingestellt</strong> markiert. Damit ist der Ablauf für diese Stelle abgeschlossen.</>, "Als eingestellt markieren");
    case "talent_pool":
      return stageForm("TALENT_POOL", <>{n} wird für spätere Stellen im <strong>Talent-Pool</strong> vorgemerkt.</>, "In den Talent-Pool",
        <div className="mt-3"><Checkbox name="notify" defaultChecked label="Per E-Mail um Einwilligung bitten" description="Nötig nach Datenschutzgesetz, bevor Sie die Daten länger aufbewahren." /></div>);
    case "reject":
      return (
        <ActionForm action={moveStage} onSuccess={onDone}>
          {id}<input type="hidden" name="stage" value="REJECTED" />
          <p className="text-sm text-slate-700">{stage === "OFFER" ? <>Der Ablauf mit {n} wird beendet.</> : <>{n} erhält eine <strong>Absage</strong>. Absagen sind immer Ihr Entscheid – Recruit24 sagt nie selbst ab.</>}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Grund (nur intern, wird protokolliert)" hint="Bitte nur stellenbezogene Gründe.">
              <Input name="reason" required placeholder={stage === "OFFER" ? "z. B. Angebot abgelehnt" : "z. B. Zu wenig Erfahrung mit CNC"} />
            </Field>
            <div className="sm:pt-6"><Checkbox name="notify" defaultChecked={stage !== "OFFER"} label="Absage-E-Mail senden" description="Freundliche Vorlage, ohne Begründung." /></div>
          </div>
          <Buttons onCancel={onCancel}><SubmitButton variant="danger" pendingText="Wird gespeichert…">{stage === "OFFER" ? "Ablauf beenden" : "Absage senden"}</SubmitButton></Buttons>
        </ActionForm>
      );
    case "invite_ai":
      return (
        <ActionForm action={inviteAi} onSuccess={onDone}>
          {id}
          <p className="text-sm text-slate-700">{n} erhält eine Einladung zum kurzen Vorabgespräch (etwa 10 Minuten) und wählt selbst: sofortiger Anruf, Anruf zur Wunschzeit oder Interview im Browser.</p>
          <Buttons onCancel={onCancel}>
            <SubmitButton name="channel" value="EMAIL" pendingText="Wird gesendet…"><Mail className="h-4 w-4" />Per E-Mail einladen</SubmitButton>
            {hasPhone && <SubmitButton name="channel" value="SMS" variant="secondary">Per SMS einladen</SubmitButton>}
          </Buttons>
        </ActionForm>
      );
    case "call_now":
      return (
        <ActionForm action={callNowFromProfile} onSuccess={onDone}>
          {id}
          <p className="text-sm text-slate-700">Recruit24 ruft {n} jetzt an und führt das Vorabgespräch.</p>
          <Buttons onCancel={onCancel}><SubmitButton pendingText="Anruf wird gestartet…"><Phone className="h-4 w-4" />Jetzt anrufen</SubmitButton></Buttons>
        </ActionForm>
      );
    case "resend_ai":
      return (
        <ActionForm action={retryInterview} onSuccess={onDone}>
          <input type="hidden" name="interviewId" value={interviewId ?? ""} /><input type="hidden" name="mode" value="browser" />
          <p className="text-sm text-slate-700">{n} erhält per E-Mail einen neuen Link und kann das Interview im Browser machen oder einen Rückruf wählen.</p>
          <Buttons onCancel={onCancel}><SubmitButton pendingText="Wird gesendet…"><Send className="h-4 w-4" />Link senden</SubmitButton></Buttons>
        </ActionForm>
      );
    case "rerun_screening":
      return (
        <ActionForm action={rerunScreening} onSuccess={onDone}>
          {id}
          <p className="text-sm text-slate-700">Recruit24 liest den neuesten Lebenslauf noch einmal und prüft ihn gegen die Anforderungen der Stelle.</p>
          <Buttons onCancel={onCancel}><SubmitButton pendingText="Wird geprüft…"><RefreshCw className="h-4 w-4" />Jetzt neu prüfen</SubmitButton></Buttons>
        </ActionForm>
      );
    case "ask_cv":
      return (
        <ActionForm action={sendCandidateMessage} onSuccess={onDone}>
          {id}<input type="hidden" name="channel" value="EMAIL" />
          <Field label="Betreff"><Input name="subject" defaultValue="Ihre Bewerbung – bitte Lebenslauf erneut senden" /></Field>
          <Field label="Nachricht" className="mt-3">
            <Textarea name="body" rows={5} defaultValue={`Guten Tag {{candidateName}}\n\nVielen Dank für Ihre Bewerbung als {{jobTitle}}. Leider konnten wir Ihren Lebenslauf nicht öffnen. Bitte senden Sie ihn uns als PDF erneut zu, am einfachsten als Antwort auf diese E-Mail.\n\nFreundliche Grüsse\n{{recruiterName}}\n{{companyName}}`} />
          </Field>
          <Buttons onCancel={onCancel}><SubmitButton pendingText="Wird gesendet…"><Send className="h-4 w-4" />E-Mail senden</SubmitButton></Buttons>
        </ActionForm>
      );
  }
}
