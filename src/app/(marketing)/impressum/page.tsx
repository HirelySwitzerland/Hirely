import { LegalPage } from "@/components/marketing/legal";
import { COMPANY, CONTACT_EMAIL } from "@/lib/site";

export const metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum" updated="November 2026">
      <section>
        <h2>Anbieterin</h2>
        <p>Recruit24 ist ein Angebot von:</p>
        <p className="mt-3">{COMPANY.name}<br />{COMPANY.street}<br />{COMPANY.city}<br />{COMPANY.country}</p>
        <p className="mt-3">E-Mail: <a href={`mailto:${CONTACT_EMAIL}`} className="link">{CONTACT_EMAIL}</a></p>
      </section>
      <section>
        <h2>Vertretungsberechtigte Person</h2>
        <p>{COMPANY.representative}</p>
      </section>
      <section>
        <h2>Unternehmens-Identifikationsnummer (UID)</h2>
        <p>{COMPANY.uid}</p>
      </section>
      <section>
        <h2>Haftung</h2>
        <p>Wir prüfen die Inhalte dieser Website sorgfältig, übernehmen aber keine Gewähr für Richtigkeit, Vollständigkeit und Aktualität. Für Inhalte verlinkter Websites sind ausschliesslich deren Betreiber verantwortlich.</p>
      </section>
      <section>
        <h2>Urheberrecht</h2>
        <p>Texte, Bilder, Logo und Software auf dieser Website gehören {COMPANY.name}. Jede Verwendung ausserhalb des privaten Gebrauchs braucht die schriftliche Zustimmung.</p>
      </section>
    </LegalPage>
  );
}
