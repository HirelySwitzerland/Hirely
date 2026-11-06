import { LegalPage } from "@/components/marketing/legal";
import { COMPANY, CONTACT_EMAIL } from "@/lib/site";

export const metadata = { title: "Datenschutzerklärung" };

export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung" updated="November 2026">
      <p>Diese Erklärung gilt für die Website recruit24.ch und die Online-Demo. Sie beschreibt, welche Personendaten wir beim Besuch der Website, bei einer Demo-Anfrage und in der Online-Demo bearbeiten. Massgebend ist das Schweizer Datenschutzgesetz (DSG); soweit anwendbar, berücksichtigen wir auch die EU-Datenschutz-Grundverordnung (DSGVO).</p>
      <section>
        <h2>Verantwortlich</h2>
        <p>{COMPANY.name}<br />{COMPANY.representative}<br />{COMPANY.street}<br />{COMPANY.city}, {COMPANY.country}<br />E-Mail: <a href={`mailto:${CONTACT_EMAIL}`} className="link">{CONTACT_EMAIL}</a></p>
      </section>
      <section>
        <h2>Besuch der Website</h2>
        <p>Beim Aufruf der Website verarbeitet unser Hosting-Anbieter technisch nötige Daten: IP-Adresse, Datum und Uhrzeit, aufgerufene Seite, Browser und Betriebssystem. Diese Daten dienen dem sicheren Betrieb der Website und werden nur kurz aufbewahrt.</p>
        <p className="mt-3">Die Website setzt keine Cookies für Werbung oder Statistik und verwendet keine Tracking- oder Analysewerkzeuge. Schriften, Bilder und Programmteile werden von unserem eigenen Server geladen, nicht von Drittanbietern.</p>
      </section>
      <section>
        <h2>Demo-Anfrage</h2>
        <p>Wenn Sie eine Demo anfragen, bearbeiten wir Name, geschäftliche E-Mail-Adresse, Firma, Anzahl Mitarbeitende sowie freiwillig Telefonnummer und Nachricht. Wir verwenden diese Angaben nur, um Ihre Anfrage zu beantworten und einen Termin zu vereinbaren. Wir bewahren sie so lange auf, wie es dafür und für gesetzliche Pflichten nötig ist.</p>
      </section>
      <section>
        <h2>Online-Demo</h2>
        <p>Die Online-Demo enthält nur erfundene Firmen und Personen und wird regelmässig zurückgesetzt. Für die Anmeldung setzen wir ein technisch notwendiges Cookie, das beim Abmelden, spätestens aber nach 14 Tagen gelöscht wird. Bitte geben Sie in der Demo keine echten Personendaten ein.</p>
      </section>
      <section>
        <h2>Dienstleister und Bekanntgabe ins Ausland</h2>
        <ul>
          <li>Hosting der Website und der Online-Demo: Vercel Inc., USA. Die Website wird über Rechenzentren in Europa ausgeliefert; einzelne Daten können in den USA bearbeitet werden.</li>
          <li>Datenbank für Demo-Anfragen und die Online-Demo: Neon, Inc., USA.</li>
          <li>Versand von E-Mails, zum Beispiel der Demo-Anfragen: Resend, Inc., USA.</li>
        </ul>
        <p className="mt-3">Bei einer Bekanntgabe in Länder ohne angemessenen Datenschutz stützen wir uns auf anerkannte Garantien, insbesondere Standardvertragsklauseln oder eine Zertifizierung nach dem Swiss-U.S. Data Privacy Framework.</p>
      </section>
      <section>
        <h2>Ihre Rechte</h2>
        <p>Sie können Auskunft über Ihre Daten verlangen sowie deren Berichtigung oder Löschung und der Bearbeitung widersprechen. Schreiben Sie uns dazu an <a href={`mailto:${CONTACT_EMAIL}`} className="link">{CONTACT_EMAIL}</a> oder per Post an die oben genannte Adresse. Sie haben zudem das Recht, sich beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) zu beschweren.</p>
      </section>
      <section>
        <h2>Die Software Recruit24</h2>
        <p>Wenn Firmen die Software Recruit24 für ihr Recruiting nutzen, bearbeiten wir Bewerberdaten in deren Auftrag. Dafür gelten der Vertrag mit der jeweiligen Firma, ein Auftragsbearbeitungsvertrag und deren Datenschutzhinweise für Bewerbende.</p>
      </section>
      <section>
        <h2>Änderungen</h2>
        <p>Wir passen diese Erklärung an, wenn sich unsere Bearbeitung ändert. Es gilt die jeweils hier veröffentlichte Fassung.</p>
      </section>
    </LegalPage>
  );
}
