import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input, Logo, Select, Textarea } from "@/components/ui";
import { onboardingBack, saveOnboardingStep } from "@/app/actions/onboarding";
import { cn } from "@/lib/utils";

export const metadata = { title: "Einrichtung" };

const STEPS = ["Firma", "Umfang", "Systeme", "Firmenprofil", "Erste Stelle"];

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
          <span className="text-sm text-slate-500">Die Einrichtung dauert etwa 3 Minuten</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <ol className="mb-10 flex items-center gap-2" aria-label="Fortschritt">
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
                <Header title={`Willkommen${session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}! Erzählen Sie uns von Ihrer Firma.`} sub="Damit wird Ihr sicherer, abgetrennter Hirely-Bereich erstellt." />
                <Field label="Firmenname"><Input name="name" required defaultValue={org?.name ?? ""} placeholder="z. B. Muster AG" autoFocus /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Branche">
                    <Select name="industry" defaultValue={org?.industry ?? "Maschinen- & Anlagenbau"}>
                      {["Maschinen- & Anlagenbau", "Industrie & Produktion", "Bau", "Gesundheitswesen", "Logistik", "Detailhandel", "Gastronomie & Hotellerie", "IT & Software", "Finanzdienstleistungen", "Öffentliche Verwaltung", "Andere"].map((x) => <option key={x}>{x}</option>)}
                    </Select>
                  </Field>
                  <Field label="Anzahl Mitarbeitende">
                    <Select name="companySize" defaultValue={org?.companySize ?? "51–200"}>
                      {["1–50", "51–200", "201–500", "501–1000", "1000+"].map((x) => <option key={x}>{x}</option>)}
                    </Select>
                  </Field>
                  <Field label="Land">
                    <Select name="country" defaultValue={org?.country ?? "CH"}>
                      <option value="CH">Schweiz</option><option value="DE">Deutschland</option><option value="AT">Österreich</option><option value="LI">Liechtenstein</option>
                    </Select>
                  </Field>
                  <Field label="Hauptsprache" hint="Standardsprache für Inserate und Nachrichten an Kandidierende.">
                    <Select name="language" defaultValue={org?.language ?? "de"}>
                      <option value="de">Deutsch</option><option value="fr">Français</option><option value="it">Italiano</option><option value="en">English</option>
                    </Select>
                  </Field>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <Header title="Wie viel rekrutieren Sie?" sub="Damit schlagen wir einen passenden Plan und sinnvolle Automationen vor." />
                <Field label="Rekrutierung">
                  <Select name="volume" defaultValue={String(rp.volume ?? "recurring")}>
                    <option value="occasional">Gelegentlich</option><option value="recurring">Regelmässig über das Jahr verteilt</option><option value="high">Viele Einstellungen (saisonal / gewerblich)</option>
                  </Select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Anzahl Mitarbeitende"><Input name="employees" type="number" min={1} defaultValue={String(rp.employees ?? "")} placeholder="250" /></Field>
                  <Field label="Bewerbungen pro Monat"><Input name="applicationsPerMonth" type="number" min={0} defaultValue={String(rp.applicationsPerMonth ?? "")} placeholder="120" /></Field>
                  <Field label="Offene Stellen (Ø)"><Input name="openPositionsAvg" type="number" min={0} defaultValue={String(rp.openPositionsAvg ?? "")} placeholder="6" /></Field>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <Header title="Ihre heutigen Systeme" sub="Sie können diese später unter Integrationen verbinden. Hirely funktioniert ab dem ersten Tag auch ohne." />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Bewerbermanagement-System (ATS)">
                    <Select name="ats" defaultValue={setup.ats ?? "none"}>
                      <option value="none">Kein ATS – nur Hirely</option><option value="personio">Personio</option><option value="workday">Workday</option><option value="successfactors">SAP SuccessFactors</option><option value="abacus">Abacus</option><option value="rexx">rexx systems</option><option value="recruitee">Recruitee</option><option value="other">Anderes</option>
                    </Select>
                  </Field>
                  <Field label="E-Mail-Anbieter">
                    <Select name="email" defaultValue={setup.email ?? "microsoft365"}>
                      <option value="microsoft365">Microsoft 365</option><option value="google">Google Workspace</option><option value="other">Anderer (SMTP)</option>
                    </Select>
                  </Field>
                  <Field label="Kalender">
                    <Select name="calendar" defaultValue={setup.calendar ?? "microsoft"}>
                      <option value="microsoft">Microsoft Outlook</option><option value="google">Google Kalender</option><option value="none">Keiner</option>
                    </Select>
                  </Field>
                  <Field label="Telefonie für KI-Anrufe">
                    <Select name="phone" defaultValue={setup.phone ?? "hirely"}>
                      <option value="hirely">Schweizer Nummer von Hirely</option><option value="twilio">Eigenes Twilio-Konto</option><option value="none">Keine Telefoninterviews</option>
                    </Select>
                  </Field>
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <Header title="Wie soll Hirely Ihre Firma vorstellen?" sub="Hirely nutzt dies in Inseraten, Nachrichten und bei der Vorstellung am Telefon." />
                <Field label="Firmenbeschreibung"><Textarea name="description" rows={4} defaultValue={org?.description ?? ""} placeholder="Was macht Ihre Firma, wo, wie viele Mitarbeitende…" /></Field>
                <Field label="Werte"><Textarea name="values" rows={3} defaultValue={org?.values ?? ""} placeholder="z. B. Präzision, Verlässlichkeit und Respekt." /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tonalität">
                    <Select name="tone" defaultValue={org?.tone ?? "professional-warm"}>
                      <option value="professional-warm">Professionell & herzlich (Sie)</option><option value="formal">Förmlich</option><option value="casual">Locker & modern (Du)</option>
                    </Select>
                  </Field>
                  <Field label="Website"><Input name="website" type="url" defaultValue={org?.website ?? ""} placeholder="https://" /></Field>
                </div>
              </>
            )}
            {step === 5 && (
              <>
                <Header title="Ihre erste Stelle" sub="Notieren Sie Stichworte – Hirely macht daraus ein professionelles Inserat und ein KI-Interview. Sie prüfen alles vor der Veröffentlichung." />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Stellentitel"><Input name="title" placeholder="Servicetechniker/in" autoFocus /></Field>
                  <Field label="Pensum"><Input name="workload" placeholder="80–100%" /></Field>
                  <Field label="Abteilung"><Input name="department" placeholder="Kundendienst" /></Field>
                  <Field label="Arbeitsort"><Input name="location" placeholder="Winterthur" /></Field>
                </div>
                <Field label="Stichworte" hint="Aufgaben, Team, alles Wichtige. Eine Zeile pro Punkt genügt.">
                  <Textarea name="notes" rows={4} placeholder={"Wartung und Reparatur unserer Anlagen beim Kunden\nFehlerdiagnose elektrisch/mechanisch\nPikettdienst"} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Muss-Kriterien" hint="Eines pro Zeile – für die nachvollziehbare Prüfung."><Textarea name="musts" rows={4} placeholder={"Deutsch B2\nFührerausweis Kat. B\n2 Jahre Erfahrung im Service"} /></Field>
                  <Field label="Wünschenswert"><Textarea name="nices" rows={4} placeholder={"Englisch B1\nSPS-Kenntnisse"} /></Field>
                </div>
                <input type="hidden" name="language" value={org?.language ?? "de"} />
              </>
            )}
            <div className="flex items-center justify-between border-t border-slate-100 pt-5">
              <div>{step > 1 && <span className="text-xs text-slate-500">Step {step} of 5</span>}</div>
              <div className="flex gap-2">
                {step === 5 && <SubmitButton variant="ghost" name="skip" value="1">Später</SubmitButton>}
                <SubmitButton pendingText={step === 5 ? "Inserat wird erstellt…" : "Wird gespeichert…"}>{step === 5 ? "Stelle mit KI erstellen" : "Weiter"}</SubmitButton>
              </div>
            </div>
          </ActionForm>
          {step > 1 && (
            <div className="-mt-12 w-fit">
              <ActionButton action={onboardingBack} fields={{ step: String(step) }} variant="ghost">Zurück</ActionButton>
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
