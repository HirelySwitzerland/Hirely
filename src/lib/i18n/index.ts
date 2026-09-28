/**
 * Lightweight i18n. Dictionaries are flat key → string maps per locale; missing
 * keys fall back to English. Add a language by adding a dictionary here.
 */
export const LOCALES = ["en", "de", "fr", "it"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_LABELS: Record<Locale, string> = { en: "English", de: "Deutsch", fr: "Français", it: "Italiano" };

const en = {
  // navigation
  "nav.dashboard": "Dashboard", "nav.jobs": "Jobs", "nav.candidates": "Candidates", "nav.interviews": "Interviews", "nav.talentPool": "Talent Pool",
  "nav.analytics": "Analytics", "nav.automations": "Automations", "nav.integrations": "Integrations", "nav.settings": "Settings", "nav.assistant": "AI Assistant",
  "nav.notifications": "Notifications", "nav.communication": "Communication",
  // candidate facing
  "careers.openPositions": "Open positions", "careers.noPositions": "There are currently no open positions.", "careers.apply": "Apply now", "careers.back": "All positions",
  "careers.applyTitle": "Apply for this position", "careers.firstName": "First name", "careers.lastName": "Last name", "careers.email": "Email", "careers.phone": "Mobile phone",
  "careers.location": "Place of residence", "careers.cv": "CV (PDF, DOCX or TXT, max. 10 MB)", "careers.coverLetter": "Short message (optional)",
  "careers.questions": "A few quick questions", "careers.consentProcessing": "I agree that my data is processed for this application in accordance with the privacy notice.",
  "careers.consentAi": "I understand that an AI assistant helps pre-screen applications and may conduct a short structured interview. All decisions are made by people.",
  "careers.consentPool": "Keep my profile in the talent pool for future positions (optional, revocable at any time).",
  "careers.submit": "Submit application", "careers.submitted": "Thank you! Your application has been received.", "careers.submittedText": "We sent you a confirmation email with a link to follow the status of your application.",
  "careers.yes": "Yes", "careers.no": "No", "careers.privacy": "Privacy notice", "careers.poweredBy": "Recruiting powered by Hirely",
  "portal.title": "Your application", "portal.status": "Status", "portal.nextStep": "Next step", "portal.messages": "Messages", "portal.interviews": "Interviews",
  "portal.upcoming": "Upcoming", "portal.completed": "Completed", "portal.startInterview": "Start pre-screening interview", "portal.schedule": "Choose an interview time",
  "portal.withdraw": "Withdraw application", "portal.deleteData": "Delete my data", "portal.exportData": "Download my data",
  "portal.stage.received": "Application received", "portal.stage.review": "In review", "portal.stage.interview": "Interview", "portal.stage.decision": "Decision",
  "interview.title": "Short pre-screening interview", "interview.aiNotice": "This interview is conducted by an AI recruiting assistant. It asks every candidate the same job-related questions. A person from the HR team reviews your answers and makes every decision.",
  "interview.callNow": "Call me now", "interview.scheduleCall": "Schedule a call", "interview.browser": "Do it in the browser", "interview.phone": "Phone number",
  "interview.duration": "About 10 minutes", "interview.when": "Preferred date & time", "interview.confirmCall": "Confirm call", "interview.calling": "We are calling you now…",
  "interview.scheduled": "Your call is scheduled", "interview.completed": "Thank you — your interview is complete.", "interview.type": "Type your answer…",
  "interview.send": "Send", "interview.speak": "Answer by voice", "interview.stop": "Stop", "interview.readAloud": "Read questions aloud",
  "video.title": "Video interview", "video.notice": "Only the content of your answers is evaluated — never your appearance, voice characteristics or background.",
  "video.prepare": "Preparation time", "video.record": "Start recording", "video.stopRecording": "Stop & save", "video.retake": "Retake", "video.next": "Next question",
  "video.submit": "Submit video interview", "video.question": "Question", "video.done": "Your video interview has been submitted. Thank you!",
  "schedule.title": "Choose a time for your interview", "schedule.noSlots": "No free slots are available at the moment. We will contact you shortly.", "schedule.confirm": "Confirm appointment",
  "schedule.booked": "Your interview is confirmed", "schedule.addToCalendar": "Add to calendar", "schedule.duration": "Duration", "schedule.location": "Location",
};

type Dict = Partial<Record<keyof typeof en, string>>;

const de: Dict = {
  "nav.dashboard": "Dashboard", "nav.jobs": "Stellen", "nav.candidates": "Kandidierende", "nav.interviews": "Interviews", "nav.talentPool": "Talent-Pool",
  "nav.analytics": "Auswertungen", "nav.automations": "Automationen", "nav.integrations": "Integrationen", "nav.settings": "Einstellungen", "nav.assistant": "KI-Assistent",
  "nav.notifications": "Mitteilungen", "nav.communication": "Kommunikation",
  "careers.openPositions": "Offene Stellen", "careers.noPositions": "Aktuell sind keine Stellen ausgeschrieben.", "careers.apply": "Jetzt bewerben", "careers.back": "Alle Stellen",
  "careers.applyTitle": "Für diese Stelle bewerben", "careers.firstName": "Vorname", "careers.lastName": "Nachname", "careers.email": "E-Mail", "careers.phone": "Mobiltelefon",
  "careers.location": "Wohnort", "careers.cv": "Lebenslauf (PDF, DOCX oder TXT, max. 10 MB)", "careers.coverLetter": "Kurze Nachricht (optional)",
  "careers.questions": "Ein paar kurze Fragen", "careers.consentProcessing": "Ich bin einverstanden, dass meine Daten für diese Bewerbung gemäss Datenschutzhinweis bearbeitet werden.",
  "careers.consentAi": "Ich nehme zur Kenntnis, dass ein KI-Assistent bei der Vorauswahl unterstützt und ggf. ein kurzes, strukturiertes Vorabgespräch führt. Alle Entscheidungen treffen Menschen.",
  "careers.consentPool": "Mein Profil für zukünftige Stellen im Talent-Pool behalten (optional, jederzeit widerrufbar).",
  "careers.submit": "Bewerbung absenden", "careers.submitted": "Vielen Dank! Ihre Bewerbung ist eingegangen.", "careers.submittedText": "Sie erhalten eine Bestätigung per E-Mail mit einem Link, über den Sie den Stand Ihrer Bewerbung verfolgen können.",
  "careers.yes": "Ja", "careers.no": "Nein", "careers.privacy": "Datenschutzhinweis", "careers.poweredBy": "Recruiting mit Hirely",
  "portal.title": "Ihre Bewerbung", "portal.status": "Status", "portal.nextStep": "Nächster Schritt", "portal.messages": "Nachrichten", "portal.interviews": "Gespräche",
  "portal.upcoming": "Bevorstehend", "portal.completed": "Abgeschlossen", "portal.startInterview": "Vorabgespräch starten", "portal.schedule": "Gesprächstermin wählen",
  "portal.withdraw": "Bewerbung zurückziehen", "portal.deleteData": "Meine Daten löschen", "portal.exportData": "Meine Daten herunterladen",
  "portal.stage.received": "Bewerbung eingegangen", "portal.stage.review": "In Prüfung", "portal.stage.interview": "Gespräch", "portal.stage.decision": "Entscheid",
  "interview.title": "Kurzes Vorabgespräch", "interview.aiNotice": "Dieses Gespräch wird von einem KI-Recruiting-Assistenten geführt. Er stellt allen Kandidierenden dieselben stellenbezogenen Fragen. Eine Person aus dem HR-Team prüft Ihre Antworten und trifft jede Entscheidung.",
  "interview.callNow": "Jetzt anrufen", "interview.scheduleCall": "Anruf planen", "interview.browser": "Im Browser durchführen", "interview.phone": "Telefonnummer",
  "interview.duration": "Ca. 10 Minuten", "interview.when": "Gewünschter Zeitpunkt", "interview.confirmCall": "Anruf bestätigen", "interview.calling": "Wir rufen Sie jetzt an…",
  "interview.scheduled": "Ihr Anruf ist geplant", "interview.completed": "Vielen Dank – Ihr Vorabgespräch ist abgeschlossen.", "interview.type": "Ihre Antwort…",
  "interview.send": "Senden", "interview.speak": "Per Sprache antworten", "interview.stop": "Stopp", "interview.readAloud": "Fragen vorlesen",
  "video.title": "Video-Interview", "video.notice": "Bewertet wird ausschliesslich der Inhalt Ihrer Antworten – nie Ihr Aussehen, Ihre Stimme oder Ihr Hintergrund.",
  "video.prepare": "Vorbereitungszeit", "video.record": "Aufnahme starten", "video.stopRecording": "Stoppen & speichern", "video.retake": "Neu aufnehmen", "video.next": "Nächste Frage",
  "video.submit": "Video-Interview absenden", "video.question": "Frage", "video.done": "Ihr Video-Interview wurde übermittelt. Vielen Dank!",
  "schedule.title": "Wählen Sie einen Termin für Ihr Gespräch", "schedule.noSlots": "Aktuell sind keine Termine frei. Wir melden uns in Kürze bei Ihnen.", "schedule.confirm": "Termin bestätigen",
  "schedule.booked": "Ihr Gespräch ist bestätigt", "schedule.addToCalendar": "Zum Kalender hinzufügen", "schedule.duration": "Dauer", "schedule.location": "Ort",
};

const fr: Dict = {
  "nav.dashboard": "Tableau de bord", "nav.jobs": "Postes", "nav.candidates": "Candidats", "nav.interviews": "Entretiens", "nav.talentPool": "Vivier de talents",
  "nav.analytics": "Analyses", "nav.automations": "Automatisations", "nav.integrations": "Intégrations", "nav.settings": "Paramètres", "nav.assistant": "Assistant IA",
  "careers.openPositions": "Postes ouverts", "careers.apply": "Postuler", "careers.back": "Tous les postes", "careers.applyTitle": "Postuler à ce poste",
  "careers.firstName": "Prénom", "careers.lastName": "Nom", "careers.email": "E-mail", "careers.phone": "Téléphone mobile", "careers.location": "Lieu de domicile",
  "careers.cv": "CV (PDF, DOCX ou TXT, max. 10 Mo)", "careers.submit": "Envoyer la candidature", "careers.submitted": "Merci ! Votre candidature a bien été reçue.",
  "careers.consentProcessing": "J'accepte que mes données soient traitées pour cette candidature conformément à la déclaration de confidentialité.",
  "careers.consentAi": "Je comprends qu'un assistant IA aide à la présélection et peut mener un bref entretien structuré. Toutes les décisions sont prises par des personnes.",
  "careers.yes": "Oui", "careers.no": "Non",
  "portal.title": "Votre candidature", "portal.startInterview": "Commencer l'entretien préliminaire", "portal.schedule": "Choisir une date d'entretien",
  "interview.title": "Bref entretien préliminaire", "interview.aiNotice": "Cet entretien est mené par un assistant de recrutement IA. Une personne de l'équipe RH examine vos réponses et prend toutes les décisions.",
  "interview.callNow": "Appelez-moi maintenant", "interview.scheduleCall": "Planifier un appel", "interview.browser": "Dans le navigateur",
  "video.title": "Entretien vidéo", "video.notice": "Seul le contenu de vos réponses est évalué – jamais votre apparence.",
  "schedule.title": "Choisissez un créneau pour votre entretien", "schedule.confirm": "Confirmer le rendez-vous", "schedule.booked": "Votre entretien est confirmé",
};

const it: Dict = {
  "nav.dashboard": "Dashboard", "nav.jobs": "Posizioni", "nav.candidates": "Candidati", "nav.interviews": "Colloqui", "nav.talentPool": "Talent pool",
  "nav.analytics": "Analisi", "nav.automations": "Automazioni", "nav.integrations": "Integrazioni", "nav.settings": "Impostazioni", "nav.assistant": "Assistente IA",
  "careers.openPositions": "Posizioni aperte", "careers.apply": "Candidati ora", "careers.back": "Tutte le posizioni", "careers.applyTitle": "Candidati per questa posizione",
  "careers.firstName": "Nome", "careers.lastName": "Cognome", "careers.email": "E-mail", "careers.phone": "Cellulare", "careers.location": "Domicilio",
  "careers.cv": "CV (PDF, DOCX o TXT, max. 10 MB)", "careers.submit": "Invia candidatura", "careers.submitted": "Grazie! Abbiamo ricevuto la sua candidatura.",
  "careers.consentProcessing": "Acconsento al trattamento dei miei dati per questa candidatura secondo l'informativa sulla privacy.",
  "careers.consentAi": "Prendo atto che un assistente IA supporta la preselezione e può condurre un breve colloquio strutturato. Tutte le decisioni sono prese da persone.",
  "careers.yes": "Sì", "careers.no": "No",
  "portal.title": "La sua candidatura", "portal.startInterview": "Inizia il colloquio preliminare", "portal.schedule": "Scegli un appuntamento",
  "interview.title": "Breve colloquio preliminare", "interview.aiNotice": "Questo colloquio è condotto da un assistente di selezione IA. Una persona del team HR esamina le sue risposte e prende ogni decisione.",
  "interview.callNow": "Chiamami ora", "interview.scheduleCall": "Pianifica una chiamata", "interview.browser": "Nel browser",
  "video.title": "Colloquio video", "video.notice": "Viene valutato solo il contenuto delle risposte, mai l'aspetto.",
  "schedule.title": "Scelga un orario per il colloquio", "schedule.confirm": "Conferma appuntamento", "schedule.booked": "Il suo colloquio è confermato",
};

const DICTS: Record<Locale, Dict> = { en, de, fr, it };

export type TKey = keyof typeof en;

export function normalizeLocale(l: string | null | undefined): Locale {
  const x = (l ?? "").slice(0, 2).toLowerCase();
  return (LOCALES as readonly string[]).includes(x) ? (x as Locale) : "en";
}

export function getT(locale: string | null | undefined) {
  const d = DICTS[normalizeLocale(locale)];
  return (key: TKey) => d[key] ?? en[key] ?? key;
}
