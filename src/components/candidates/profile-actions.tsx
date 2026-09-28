"use client";

import { useState } from "react";
import { CalendarPlus, ChevronDown, Mail, Phone, Video } from "lucide-react";
import { ActionForm, SubmitButton, ActionButton } from "@/components/forms";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { callNowFromProfile, invitePersonal, inviteAi, inviteVideo, moveStage, sendCandidateMessage } from "@/app/actions/candidates";
import type { Stage } from "@prisma/client";
import { cn } from "@/lib/utils";

const STAGE_OPTIONS: [Stage, string][] = [
  ["NEW", "New"], ["AI_SCREENING", "AI Screening"], ["AI_INTERVIEW", "AI Interview"], ["REVIEW", "Review"], ["SHORTLISTED", "Shortlisted"],
  ["PERSONAL_INTERVIEW", "Personal Interview"], ["OFFER", "Offer"], ["HIRED", "Hired"], ["REJECTED", "Rejected"], ["TALENT_POOL", "Talent Pool"],
];

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
          <Button onClick={() => toggle("invite")}><CalendarPlus className="h-4 w-4" />Invite to personal interview</Button>
        )}
        {canStage && <Button variant="secondary" onClick={() => toggle("stage")}>Change stage <ChevronDown className="h-3.5 w-3.5" /></Button>}
        {canMessage && <Button variant="secondary" onClick={() => toggle("message")}><Mail className="h-4 w-4" />Message</Button>}
        {canInterview && <Button variant="secondary" onClick={() => toggle("ai")}><Phone className="h-4 w-4" />AI interview</Button>}
      </div>

      <Panel open={open === "invite"}>
        <ActionForm action={invitePersonal} className="space-y-3" onSuccess={() => setOpen(null)}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <p className="text-sm text-slate-600">{firstName} receives a scheduling link showing your real availability. When they pick a time, the calendar event, confirmation and reminders are created automatically and the stage moves to <strong>Personal Interview</strong>.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Interviewer">
              <Select name="interviewerId" defaultValue={interviewers[0]?.id}>
                {interviewers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </Select>
            </Field>
            <Field label="Duration">
              <Select name="durationMin" defaultValue="60">
                <option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option>
              </Select>
            </Field>
            <Field label="Location / video link"><Input name="location" defaultValue={defaultLocation} /></Field>
          </div>
          <SubmitButton pendingText="Sending…">Send scheduling link</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel open={open === "stage"}>
        <ActionForm action={moveStage} className="space-y-3" onSuccess={() => setOpen(null)}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="New stage">
              <Select name="stage" value={target} onChange={(e) => setTarget(e.target.value as Stage)}>
                {STAGE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Reason (logged)"><Input name="reason" placeholder={target === "REJECTED" ? "Job-related reason" : "Optional"} required={target === "REJECTED"} /></Field>
          </div>
          {["REJECTED", "TALENT_POOL", "OFFER"].includes(target) && (
            <Checkbox name="notify" defaultChecked label={target === "REJECTED" ? "Send the rejection email" : target === "OFFER" ? "Send the offer email" : "Ask for talent pool consent by email"} description="Uses your editable template." />
          )}
          {target === "REJECTED" && <p className="text-xs text-slate-500">Rejections are always human decisions. Please base the reason on job-related criteria only.</p>}
          <SubmitButton>Update stage</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel open={open === "message"}>
        <ActionForm action={sendCandidateMessage} className="space-y-3" resetOnSuccess onSuccess={() => setOpen(null)}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Channel">
              <Select name="channel" defaultValue="EMAIL">
                <option value="EMAIL">Email</option>
                <option value="SMS" disabled={!hasPhone}>SMS{!hasPhone ? " (no number)" : ""}</option>
                <option value="WHATSAPP" disabled={!hasPhone}>WhatsApp{!hasPhone ? " (no number)" : ""}</option>
              </Select>
            </Field>
            <Field label="Template (optional)">
              <Select name="templateKey" defaultValue="">
                <option value="">— Free text —</option>
                <option value="interview_reminder">Interview reminder</option>
                <option value="ai_interview_invitation">AI interview invitation</option>
                <option value="rejection">Rejection</option>
                <option value="talent_pool_invitation">Talent pool invitation</option>
                <option value="offer">Offer</option>
              </Select>
            </Field>
          </div>
          <Field label="Subject (email)"><Input name="subject" placeholder="Leave empty to use the template subject" /></Field>
          <Field label="Message" hint="Variables like {{candidateName}}, {{jobTitle}}, {{portalLink}} are filled in automatically."><Textarea name="body" rows={5} /></Field>
          <SubmitButton>Send</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel open={open === "ai"}>
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">Start or resend the AI pre-screening. The candidate is always told they're talking to an AI and asked for recording consent.</p>
          <div className={cn("flex flex-wrap gap-2")}>
            <ActionButton action={inviteAi} fields={{ applicationId, channel: "EMAIL" }} variant="secondary" size="md"><Mail className="h-4 w-4" />Send invitation (email)</ActionButton>
            {hasPhone && <ActionButton action={inviteAi} fields={{ applicationId, channel: "SMS" }} variant="secondary" size="md">Send invitation (SMS)</ActionButton>}
            {hasPhone && <ActionButton action={callNowFromProfile} fields={{ applicationId }} variant="secondary" size="md" confirm={`Call ${firstName} now with the AI interview assistant?`}><Phone className="h-4 w-4" />Call now</ActionButton>}
            <ActionButton action={inviteVideo} fields={{ applicationId }} variant="secondary" size="md"><Video className="h-4 w-4" />Invite to video interview</ActionButton>
          </div>
        </div>
      </Panel>
    </div>
  );
}
