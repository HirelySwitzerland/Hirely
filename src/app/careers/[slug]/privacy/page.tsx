import { db } from "@/lib/db";

export default async function PrivacyNotice({ params }: { params: Promise<{ slug: string }> }) {
  const org = await db.organization.findUniqueOrThrow({ where: { slug: (await params).slug } });
  const s = org.settings as Record<string, unknown>;
  const days = Number(s.retentionDays ?? 180);
  return (
    <main className="prose-hirely mx-auto max-w-3xl px-4 py-12 text-[15px]">
      <h2>Datenschutzhinweis für Bewerbende</h2>
      <p><strong>{org.name}</strong> ist verantwortlich für die Bearbeitung Ihrer Bewerbungsdaten. Hirely bearbeitet die Daten im Auftrag von {org.name} (Datenhaltung in der Schweiz).</p>
      <h3>Welche Daten wir bearbeiten</h3>
      <ul>
        <li>Ihre Kontaktdaten, Ihren Lebenslauf und Ihre Antworten.</li>
        <li>Wenn Sie am KI-Vorabgespräch teilnehmen: das Gesprächsprotokoll und – mit Ihrer Einwilligung – die Aufnahme.</li>
        <li>Bei Video-Interviews: Ihre Aufnahmen und deren Transkripte. Ausgewertet wird nur der Inhalt Ihrer Antworten – nie Ihr Aussehen, Ihre Stimme, Emotionen oder geschützte Merkmale.</li>
      </ul>
      <h3>Wie KI eingesetzt wird</h3>
      <p>Ein KI-Assistent strukturiert Ihren Lebenslauf, stellt allen Bewerbenden dieselben stellenbezogenen Fragen und fasst die Antworten zusammen. Er zeigt dem HR-Team zu jeder Anforderung, ob es einen Beleg gibt und woher er stammt. Er trifft keine Entscheide: Über Ihre Bewerbung entscheidet immer ein Mensch.</p>
      <h3>Aufbewahrung</h3>
      <p>Ihre Daten werden {days} Tage nach Abschluss des Verfahrens gelöscht, ausser Sie stimmen der Aufnahme in unseren Talent-Pool zu. Sie können Ihre Einwilligung jederzeit widerrufen.</p>
      <h3>Ihre Rechte</h3>
      <p>Sie können Ihre Daten jederzeit über den Link in Ihrer Bestätigungs-E-Mail (Bewerbendenportal) einsehen, exportieren oder löschen – oder sich direkt an {org.name} wenden.</p>
    </main>
  );
}
