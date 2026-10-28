"use client";

import { useState } from "react";
import { CalendarPlus, ChevronDown, Mail, Phone, Video } from "lucide-react";
import { ActionForm, SubmitButton, ActionButton } from "@/components/forms";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { callNowFromProfile, invitePersonal, inviteAi, inviteVideo, moveStage, sendCandidateMessage } from "@/app/actions/candidates";
import type { Stage } from "@prisma/client";
import { cn } from "@/lib/utils";
import { STAGES } from "@/lib/stages";

const STAGE_OPTIONS: [Stage, string][] = STAGES.map((s) => [s.id, s.label]);

function Panel({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open) return null;
  return <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-pop">{children}</div>;
}

export function ProfileActions({
  applicationId, stage, firstName, canStage, canMessage, canInterview, interviewers, defaultLocation, hasPhone,
}: {
  applicationId: string; stage: Stage; firstName: string; canStage: boolean; canMessage: boolean; canInterview: boolean;
  interviewers: { id: string; name: string }[]; defaultLocation: string; hasPhone: boolean;
}) {
  const [open, setOpen] = useState<"invite" | "stage" | "message" | "ai" | null>(null);
  const toggle = (k: typeof open) => setOpen((o) => (o === k ? null : k));
  const [target, setTarget] = useState<Stage>(stage === "REVIEW" ? "SHORTLISTED" : stage);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {canMessage && !["HIRED", "REJECTED"].includes(stage) && (
          <Button onClick={() => toggle("invite")}><CalendarPlus className="h-4 w-4" />Zum Gespräch einladen</Button>
        )}
        {canStage && <Button variant="secondary" onClick={() => toggle("stage")}>Stufe ändern <ChevronDown className="h-3.5 w-3.5" /></Button>}
        {canMessage && <Button variant="secondary" onClick={() => toggle("message")}><Mail className="h-4 w-4" />Nachricht</Button>}
        {canInterview && <Button variant="secondary" onClick={() => toggle("ai")}><Phone className="h-4 w-4" />KI-Interview</Button>}
      </div>

      <Panel open={open === "invite"}>
        <ActionForm action={invitePersonal} className="space-y-3" onSuccess={() => setOpen(null)}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <p className="text-sm text-slate-600">{firstName} erhält einen Link mit Ihren freien Terminen. Sobald ein Termin gewählt ist, werden Kalendereintrag, Bestätigung und Erinnerungen automatisch erstellt und die Stufe wechselt zu <strong>Persönliches Gespräch</strong>.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Gesprächsleitung">
              <Select name="interviewerId" defaultValue={interviewers[0]?.id}>
                {interviewers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </Select>
            </Field>
            <Field label="Dauer">
              <Select name="durationMin" defaultValue="60">
                <option value="30">30 Min.</option><option value="45">45 Min.</option><option value="60">60 Min.</option><option value="90">90 Min.</option>
              </Select>
            </Field>
            <Field label="Ort / Videolink"><Input name="location" defaultValue={defaultLocation} /></Field>
          </div>
          <SubmitButton pendingText="Wird gesendet…">Terminlink senden</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel open={open === "stage"}>
        <ActionForm action={moveStage} className="space-y-3" onSuccess={() => setOpen(null)}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Neue Stufe">
              <Select name="stage" value={target} onChange={(e) => setTarget(e.target.value as Stage)}>
                {STAGE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Grund (wird protokolliert)"><Input name="reason" placeholder={target === "REJECTED" ? "Stellenbezogener Grund" : "Optional"} required={target === "REJECTED"} /></Field>
          </div>
          {["REJECTED", "TALENT_POOL", "OFFER"].includes(target) && (
            <Checkbox name="notify" defaultChecked label={target === "REJECTED" ? "Absage-E-Mail senden" : target === "OFFER" ? "Angebots-E-Mail senden" : "Per E-Mail um Talent-Pool-Einwilligung bitten"} description="Verwendet Ihre anpassbare Vorlage." />
          )}
          {target === "REJECTED" && <p className="text-xs text-slate-500">Absagen sind immer menschliche Entscheide. Bitte nur stellenbezogene Gründe angeben.</p>}
          <SubmitButton>Stufe ändern</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel open={open === "message"}>
        <ActionForm action={sendCandidateMessage} className="space-y-3" resetOnSuccess onSuccess={() => setOpen(null)}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kanal">
              <Select name="channel" defaultValue="EMAIL">
                <option value="EMAIL">E-Mail</option>
                <option value="SMS" disabled={!hasPhone}>SMS{!hasPhone ? " (keine Nummer)" : ""}</option>
                <option value="WHATSAPP" disabled={!hasPhone}>WhatsApp{!hasPhone ? " (keine Nummer)" : ""}</option>
              </Select>
            </Field>
            <Field label="Vorlage (optional)">
              <Select name="templateKey" defaultValue="">
                <option value="">– Freier Text –</option>
                <option value="interview_reminder">Gesprächserinnerung</option>
                <option value="ai_interview_invitation">Einladung KI-Interview</option>
                <option value="rejection">Absage</option>
                <option value="talent_pool_invitation">Einladung Talent-Pool</option>
                <option value="offer">Angebot</option>
              </Select>
            </Field>
          </div>
          <Field label="Betreff (E-Mail)"><Input name="subject" placeholder="Leer lassen für Betreff der Vorlage" /></Field>
          <Field label="Nachricht" hint="Platzhalter wie {{candidateName}}, {{jobTitle}}, {{portalLink}} werden automatisch ausgefüllt."><Textarea name="body" rows={5} /></Field>
          <SubmitButton>Senden</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel open={open === "ai"}>
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">KI-Vorabgespräch starten oder erneut senden. Die Person erfährt immer, dass sie mit einer KI spricht, und wird um Einwilligung zur Aufnahme gebeten.</p>
          <div className={cn("flex flex-wrap gap-2")}>
            <ActionButton action={inviteAi} fields={{ applicationId, channel: "EMAIL" }} variant="secondary" size="md"><Mail className="h-4 w-4" />Einladung per E-Mail</ActionButton>
            {hasPhone && <ActionButton action={inviteAi} fields={{ applicationId, channel: "SMS" }} variant="secondary" size="md">Einladung per SMS</ActionButton>}
            {hasPhone && <ActionButton action={callNowFromProfile} fields={{ applicationId }} variant="secondary" size="md" confirm={`${firstName} jetzt mit dem KI-Assistenten anrufen?`}><Phone className="h-4 w-4" />Jetzt anrufen</ActionButton>}
            <ActionButton action={inviteVideo} fields={{ applicationId }} variant="secondary" size="md"><Video className="h-4 w-4" />Zum Video-Interview einladen</ActionButton>
          </div>
        </div>
      </Panel>
    </div>
  );
}
