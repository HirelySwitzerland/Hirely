# recruit24.ch live schalten

Die Website (Geschichte mit Kamerafahrten, Hörprobe, Preise, Demo-Formular, Impressum, Datenschutz) läuft im **Website-Modus**:
«Konto erstellen» und «Anmelden» sind ausgeschaltet, alle Knöpfe führen zum Demo-Formular.
Demo-Anfragen kommen per E-Mail zu Ihnen. Eine Datenbank braucht es dafür nicht.

Zeitaufwand: etwa 45 Minuten, plus Wartezeit, bis die Domain umgestellt ist (meist unter einer Stunde, selten bis 24 Stunden).

---

## Teil 1 – Hosting bei Vercel (10 Minuten)

Vercel ist der Anbieter, der Next.js entwickelt hat; die Website läuft dort am zuverlässigsten.
Hinweis: Der Gratis-Plan «Hobby» ist nur für private Projekte erlaubt. Für eine Firmen-Website brauchen Sie «Pro» (rund 20 US-Dollar pro Monat).

1. Auf **vercel.com** → «Sign Up» → **«Continue with GitHub»** (dasselbe GitHub-Konto wie für das Projekt).
2. «Add New…» → **«Project»** → bei **HirelySwitzerland/Hirely** auf «Import».
   Falls das Projekt fehlt: «Adjust GitHub App Permissions» und den Zugriff auf das Projekt erlauben.
3. Im Abschnitt **«Environment Variables»** diese Einträge hinzufügen (Name links, Wert rechts):

   | Name | Wert |
   |---|---|
   | `NEXT_PUBLIC_SITE_ONLY` | `1` |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | Ihre öffentliche Kontakt-Adresse, z. B. `hallo@recruit24.ch` |
   | `LEAD_EMAIL_TO` | Adresse, an die Demo-Anfragen gehen sollen (Ihre eigene) |
   | `EMAIL_FROM` | `Recruit24 <hallo@recruit24.ch>` |
   | `RESEND_API_KEY` | kommt in Teil 3 dazu – jetzt leer lassen |

4. **«Deploy»** drücken. Nach 2–3 Minuten ist die Website unter einer Adresse wie `hirely-xyz.vercel.app` erreichbar. Kurz durchklicken.

Wichtig: `NEXT_PUBLIC_SITE_ONLY` **nicht** in Ihre lokale Datei `Q:\hirely\.env` eintragen – auf Ihrem Laptop soll die volle App für Vorführungen laufen.

## Teil 2 – Domain recruit24.ch verbinden (10 Minuten)

1. In Vercel im Projekt: **Settings → Domains** → `recruit24.ch` eingeben → «Add». Danach auch `www.recruit24.ch` hinzufügen (Vercel schlägt vor, `www` auf `recruit24.ch` umzuleiten – so lassen).
2. Vercel zeigt jetzt **DNS-Einträge** an (ein «A»-Eintrag für `recruit24.ch` und ein «CNAME» für `www`). Diese Seite offen lassen.
3. Beim Anbieter, bei dem Sie die Domain gekauft haben (z. B. Hostpoint, Infomaniak, Cyon, GoDaddy), in die **DNS-Verwaltung** von recruit24.ch gehen und genau diese zwei Einträge anlegen. Vorhandene A- oder CNAME-Einträge für `@` bzw. `www` vorher löschen.
4. Zurück in Vercel: Sobald neben beiden Domains ein grünes Häkchen steht, ist **https://recruit24.ch** live. Das Sicherheitszertifikat (Schloss im Browser) richtet Vercel selbst ein.

## Teil 3 – E-Mail für Demo-Anfragen (15 Minuten)

Damit Anfragen aus dem Formular bei Ihnen ankommen, braucht es einen Versanddienst. Wir nutzen **Resend** (gratis bis 3000 E-Mails pro Monat).

1. Auf **resend.com** ein Konto erstellen.
2. **Domains → Add Domain** → `recruit24.ch`. Resend zeigt einige DNS-Einträge (TXT/MX). Diese genauso bei Ihrem Domain-Anbieter eintragen wie in Teil 2, dann in Resend «Verify».
3. **API Keys → Create API Key** (Berechtigung «Sending access») → Schlüssel kopieren.
4. In Vercel: **Settings → Environment Variables** → `RESEND_API_KEY` mit dem Schlüssel eintragen → danach unter **Deployments** beim obersten Eintrag «⋯ → Redeploy».
5. Test: Auf recruit24.ch/demo eine Anfrage absenden – nach wenigen Sekunden ist sie in Ihrem Postfach. Mit «Antworten» schreiben Sie direkt der anfragenden Person.

Solange Teil 3 fehlt, zeigt das Formular freundlich Ihre Kontakt-Adresse an, damit keine Anfrage verloren geht.

**Kontakt-Adresse:** Die Adresse aus `NEXT_PUBLIC_CONTACT_EMAIL` muss es wirklich geben. Ein Postfach `hallo@recruit24.ch` richten Sie bei Ihrem Domain-Anbieter ein – oder Sie tragen vorerst Ihre bestehende Geschäftsadresse ein.

## Teil 4 – Impressum und Datenschutz vervollständigen

Im Impressum und in der Datenschutzerklärung sind Platzhalter **gelb markiert**: Firmenname, Adresse, UID-Nummer und vertretungsberechtigte Person. Schicken Sie mir diese Angaben, dann trage ich sie ein – das erscheint nach dem nächsten Hochladen automatisch auf recruit24.ch.

Die Datenschutzerklärung ist auf das abgestimmt, was die Website wirklich tut (keine Cookies, kein Tracking, Hosting Vercel, E-Mail-Versand Resend). Lassen Sie sie vor dem Start trotzdem kurz von einer Fachperson prüfen.

## Später: die App freischalten

Wenn die echte KI angebunden ist, wird aus der Website-Variante die volle App: Datenbank anlegen (z. B. bei Neon oder Supabase, Region Zürich/Frankfurt), die Einträge aus `.env.example` setzen und `NEXT_PUBLIC_SITE_ONLY` entfernen.
