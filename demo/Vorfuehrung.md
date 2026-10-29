# Hirely live vorführen – Ablauf zum Mitnehmen

Dauer: etwa 25 Minuten. Alles läuft direkt in der App, ohne Präsentation.

Zwei Wege, Hirely zu starten:
- **Firmenlaptop, nichts installieren:** Hirely läuft bei GitHub in der Cloud (Codespaces), Sie brauchen nur den Browser. Siehe Abschnitt 0.
- **Eigener Laptop mit Hirely auf Q:** Abschnitte 1 und 2.

---

## 0. Firmenlaptop: Hirely in GitHub Codespaces

### Einmalig einrichten (am besten 1–2 Tage vorher, ca. 15 Minuten)

1. Auf dem Firmenlaptop in Chrome oder Edge bei **github.com** anmelden.
2. Einstellungen: **github.com/settings/codespaces** öffnen, dort bei „Default idle timeout“ **120** Minuten eintragen und speichern.
   Sonst stoppt Hirely nach 30 Minuten ohne Tippen, womöglich mitten in der Vorführung.
3. **github.com/HirelySwitzerland/Hirely** öffnen.
   - Links oben im Branch-Menü **claude/determined-archimedes-tc8a82** wählen.
   - Grüner Knopf **Code** → Reiter **Codespaces** → **Create codespace on claude/…**
4. Es öffnet sich ein Editor im Browser. Beim ersten Mal richtet sich Hirely selbst ein, das dauert **5–10 Minuten**. Einfach warten.
5. Unten im Terminal erscheint:
   `Hirely laeuft:  https://….app.github.dev/login`
   Diesen Link öffnen (Strg + Klick) und als **Lesezeichen speichern**.
6. Den Beispiel-Lebenslauf auf den Laptop laden: auf GitHub die Datei `demo/Lebenslauf-Max-Muster.txt` öffnen und rechts oben auf **Download raw file** klicken.
7. Einmal den ganzen Durchlauf (Teil B) üben. Testen Sie das unbedingt im Firmennetz. Falls die Firma GitHub-Seiten blockiert, nehmen Sie den Hotspot Ihres Handys.

### Am Tag, 15 Minuten vor dem Termin

1. **github.com/codespaces** öffnen und den Hirely-Codespace anklicken. Er startet in etwa 1 Minute, Hirely startet automatisch mit.
2. Frische Demo-Daten: im Editor unten im Terminal-Bereich auf **+** (neues Terminal) klicken, `npm run db:seed` eintippen, Enter.
3. Den Editor-Tab offen lassen (im Hintergrund).
4. **Fenster A – HR:** das Lesezeichen öffnen, anmelden mit `demo@hirely.app` / `Hirely-Demo-2026`.
5. **Fenster B – Bewerber:** ein zweites, normales Browserfenster mit derselben Adresse, aber am Ende `/careers/helvetic-engineering` statt `/login`.
   Hier kein privates Fenster nehmen, sonst verlangt GitHub dort eine Anmeldung.
6. Weiter mit Punkt 5 und 6 von Abschnitt 2, dann Teil A.

Nach der Vorführung stoppt der Codespace von selbst. Sofort stoppen geht über **github.com/codespaces** → „…“ → **Stop codespace**.

---

## 1. Am Vorabend (10 Minuten)

1. Im Ordner `Q:\hirely` die neueste Version holen: `git pull`
2. Doppelklick auf **Hirely-Vorfuehrung.bat**
   - Frage „Demo-Daten zurücksetzen?“ mit **J** beantworten.
   - 1 bis 3 Minuten warten, bis sich der Browser öffnet.
3. Einmal anmelden und den Durchlauf unten (Teil B) komplett üben.
4. Fenster schliessen.

## 2. Am Tag, 15 Minuten vor dem Termin

1. Doppelklick auf **Hirely-Vorfuehrung.bat**, wieder **J** (frische Daten), Fenster offen lassen.
2. **Fenster A – HR** (normales Chrome-Fenster):
   - `http://localhost:3000/login`
   - E-Mail `demo@hirely.app`, Passwort `Hirely-Demo-2026`
   - Sie sind dann „Sandra Keller, Leiterin HR“ und dürfen alles sehen.
3. **Fenster B – Bewerber** (privates Fenster: Strg + Umschalt + N):
   - `http://localhost:3000/careers/helvetic-engineering`
4. Lebenslauf bereitlegen: `Q:\hirely\demo\Lebenslauf-Max-Muster.txt`
5. Am Beamer: in beiden Fenstern mit Strg + Plus auf 110–125 % vergrössern.
6. Benachrichtigungen am Laptop ausschalten (Windows: „Nicht stören“).

---

## Teil A – Einstieg: Was HR am Morgen sieht (2 Min.)

Fenster A, **Übersicht**:
- Oben: Zu prüfen, neue Bewerbungen, offene Stellen, **gesparte HR-Zeit**.
- „**Wartet auf Ihren Entscheid**“: Nur Personen, die fertig geprüft und befragt sind – mit „6/6 Anforderungen erfüllt“.
- Rechts: **Nächste Gespräche** und „**Braucht Ihre Hilfe**“ (z. B. jemand war am Telefon nicht erreichbar).
- Runterscrollen: Grafiken (Bewerbungen pro Woche, Stufen pro Stelle, Quellen).

Satz: „Ihr HR-Team sieht morgens sofort, wo es gebraucht wird. Den Rest hat Hirely erledigt.“

---

## Teil B – Live-Durchlauf: von der Bewerbung bis zum Termin (10 Min.)

### Als Bewerber (Fenster B)

1. Auf **Servicetechniker/in 80–100%** klicken.
2. Formular ausfüllen:
   - Vorname `Max`, Nachname `Muster`
   - E-Mail **jedes Mal neu**, z. B. `max.muster1@example.ch`, beim nächsten Mal `max.muster2@…`
   - Telefon `+41 79 123 45 67`, Wohnort `8400 Winterthur`
   - Lebenslauf: die Datei `Lebenslauf-Max-Muster.txt`
   - Beide Fragen mit **Ja**, die zwei Pflicht-Häkchen setzen
   - **Bewerbung absenden**
3. Das Bewerberportal öffnet sich. Erklären: „Hirely prüft jetzt den Lebenslauf gegen die Anforderungen der Stelle.“
   - **Nichts anklicken, einfach warten.** Nach etwa 10 Sekunden erscheint von selbst **Vorabgespräch starten**.
4. **Vorabgespräch starten** → **Im Browser durchführen**.
5. Die KI stellt sich als KI vor. Antworten eintippen und mit Enter senden:

   | Die KI fragt nach … | Antwort |
   |---|---|
   | Einverständnis zur Aufnahme | `Ja, das ist in Ordnung.` |
   | Führerausweis Kategorie B | `Ja, ich habe den Führerausweis Kategorie B.` |
   | Pikettdienst | `Ja, Pikettdienst ist für mich kein Problem.` |
   | Was Sie an der Stelle interessiert | `Ich arbeite seit fünf Jahren im Aussendienst, mache Fehlerdiagnosen direkt beim Kunden und mag den Kontakt mit Menschen.` |
   | Aufgaben bei Kardex AG / eine schwierige Störung / Führung | 1–2 ganze Sätze, z. B. `Ich habe Lagerlifte gewartet und Störungen an der Steuerung behoben, meist allein beim Kunden.` |
   | Ab wann verfügbar | `Ab dem 1. Januar.` |
   | Kündigungsfrist | `Drei Monate.` |
   | Lohnvorstellung | `Etwa 86'000 Franken.` |
   | Noch Fragen? | `Nein, danke.` |

   Tipps:
   - Bei sehr kurzen Antworten fragt die KI einmal nach. Das ist gewollt, also ruhig zeigen.
   - In Chrome kann man auch mit dem Mikrofon-Knopf sprechen.
   - Am Ende steht: „Vielen Dank – Ihr Vorabgespräch ist abgeschlossen.“

### Als HR (Fenster A)

6. Oben rechts zeigt die **Glocke** innert 20 Sekunden eine neue Zahl (oder gleich F5 drücken). Klicken:
   „**Neue Bewerbung bereit zur Prüfung: Max Muster** – erfüllt 6 von 6 Anforderungen“ → anklicken.
7. Im Profil zeigen:
   - **Zusammenfassung**, darunter Verfügbar ab, Kündigungsfrist, Lohnvorstellung. Alles kommt aus dem Interview, niemand musste etwas abtippen.
   - Runterscrollen: **jede Anforderung mit Beleg** (Zitat aus Lebenslauf oder Interview).
   - Reiter **KI-Interview**: das ganze Gespräch als Text.
8. **Zum Gespräch einladen** → Gesprächsleitung, Dauer und Ort sind schon ausgefüllt → **Terminlink senden**.

### Wieder als Bewerber (Fenster B)

9. Unter „Ihr Vorabgespräch ist abgeschlossen“ auf **Zurück zu Ihrer Bewerbung** klicken → **Gesprächstermin wählen** → Tag und Uhrzeit anklicken → **Termin bestätigen**.

### Abschluss (Fenster A)

10. Links **Gespräche**: Der Termin mit Max Muster steht im Kalender.

Satz: „Das waren 10 Minuten Arbeit für die KI und 2 Klicks für HR. Entschieden hat ein Mensch.“

---

## Teil C – Rundgang durch alle Funktionen (10–15 Min.)

Alles in Fenster A, Menü links von oben nach unten.

**Stellen**
- **Neue Stelle**: Titel `Elektroinstallateur/in EFZ`, Ort `Winterthur`, Pensum `100%`, Erfahrung `2+ Jahre`, Ausbildung `EFZ Elektroinstallateur`, Skills `NIV, Schemas lesen`, bei Stichworten z. B. `Installationen in Neubauten` / `Führerausweis B` / `Team von 8 Personen`.
- **Mit KI schreiben**: Das Inserat entsteht aus den Stichworten.
- **Weiter zu den KI-Kriterien**: Muss- und Wunschkriterien sind schon vorgeschlagen. Dann **Fragen von der KI vorschlagen lassen** und ein paar Vorschläge anklicken. Danach **KI-Kriterien speichern**.
- Reiter **Interview-Ablauf**: jeder Schritt des KI-Interviews, Wenn-dann-Regeln, **Interview testen**.

**Kandidierende**
- Stufen als Reiter oben, Balken = erfüllte Anforderungen.
- **Board**: Personen per Maus in die nächste Stufe ziehen.
- Zurück zu **Liste**, zwei Personen anhaken → **Vergleichen**.
- **Hinzufügen**: einzeln oder per CSV (z. B. nach einer Jobmesse).

**Gespräche**
- Gebuchte Termine, „Braucht Ihre Hilfe“ mit **Erneut anrufen** oder **Browser-Link senden**.
- **Meine Verfügbarkeit**: Zeiten, an denen gebucht werden darf.

**Talent-Pool**
- Suche in normaler Sprache, z. B. `Elektrotechnik Ostschweiz`. Es erscheinen nur Personen, die eingewilligt haben.

**KI-Assistent** (oder oben rechts „Hirely fragen“)
- `Wer wartet auf einen Entscheid?`
- `Fasse die drei neuesten Bewerbungen zusammen.`
- `Schreibe eine E-Mail an Lukas Meier mit Einladung zum Gespräch.`
- Satz: „Er sieht nur, was Ihre Rolle sehen darf, und er schlägt nur vor.“

**Automationen**
- Reiter **Abläufe**: Standard-Vorprüfung Schritt für Schritt (warten, CV prüfen, einladen, erinnern).
- Reiter **Nachrichtenvorlagen**: jede E-Mail/SMS anpassbar, pro Sprache.
- Reiter **Postausgang**: jede gesendete Nachricht ist sichtbar.
- Satz: „Automationen können nie absagen, auswählen oder einstellen.“

**Auswertungen**
- Gesparte HR-Zeit, Tage bis zur Einstellung, Quellen; oben nach Zeitraum und Stelle filtern.

**Integrationen**
- ATS (Personio, Workday, SAP …), Kalender, E-Mail/SMS, REST-API.

**Einstellungen**
- **Benutzer**: Team einladen. **Rollen & Rechte**: wer was darf.
- **Datenschutz**: Aufbewahrungsfrist, Einwilligungen. **Protokoll**: jede Aktion mit Person und Zeit.
- **KI-Einstellungen**: die Grundsätze der KI.

**Handy-Ansicht**
- F12 drücken, dann Strg + Umschalt + M und oben ein iPhone wählen. Hirely passt sich an, unten erscheint das Menü. Danach wieder F12.

---

## Nicht zeigen

- **Einstellungen → Abrechnung** und **Verbrauch & Kosten** (dort stehen Preise).

## Wenn etwas hängt

- **Seite lädt nicht:** F5. Beim Interview bleiben die Antworten gespeichert.
- **Einladung zum Interview kommt nicht:** 20 Sekunden warten, dann F5. Sonst in Fenster A das Profil von Max öffnen und oben **KI-Interview** klicken.
- **Max Muster klappt gar nicht:** Profil von **Roman Egli** (Servicetechniker/in, fertig geprüft) zeigen. Es enthält dieselben Inhalte.
- **„Sie haben sich bereits auf diese Stelle beworben“:** Die E-Mail-Adresse wurde schon benutzt. Zurück zur Karriereseite und eine neue Adresse verwenden (`max.muster3@…`).
- **Ganz neu starten:** Fenster schliessen und **Hirely-Vorfuehrung.bat** wieder starten, dabei **J** wählen.
- **Codespaces – Seite zeigt einen GitHub-Fehler oder lädt nicht:** Der Codespace ist eingeschlafen. **github.com/codespaces** öffnen, Codespace anklicken, 1 Minute warten, dann F5.
- **Codespaces – Hirely neu starten:** Im Terminal, in dem Hirely läuft, Strg + C drücken, dann `bash .devcontainer/start.sh` eintippen und Enter.

## Ehrlich bleiben, falls gefragt

- **Telefonanrufe** sind in der Demo simuliert. Echte Anrufe brauchen eine Schweizer Nummer (Twilio).
- **ATS-Anbindungen** sind vorbereitet und werden mit den Zugangsdaten des Kunden eingerichtet.
- Ohne KI-Schlüssel nutzt die Demo eine eingebaute Test-KI. Mit Schlüssel (Claude oder OpenAI) werden die Texte noch natürlicher.
