# Hirely – Aufnahmen für ElevenLabs

28 Sätze, zusammen rund 2990 Zeichen. Modell in ElevenLabs: **Eleven Multilingual v2**, Format **MP3**.

Jede Datei genau so benennen wie in der Spalte „Dateiname“ und in den Ordner `Q:\hirely\public\voice\` legen.

Den Text 1:1 kopieren (nichts ändern, sonst passt die Aufnahme nicht mehr zum Satz in der App).


## Weg A – automatisch mit API-Schlüssel (empfohlen)

**1. In ElevenLabs: API-Schlüssel holen**
- elevenlabs.io → links unten auf Ihr Profil → **API Keys** (oder **Developers → API Keys**) → **Create API Key**.
- Bei den Berechtigungen **Text to Speech** erlauben. Schlüssel kopieren (beginnt meist mit `sk_`).

**2. In ElevenLabs: zwei Stimmen-IDs kopieren**
- **Voices** öffnen. Stimmen aus der Voice Library zuerst mit **Add to my voices** übernehmen.
- Bei der Stimme auf **…** → **Copy voice ID**. Einmal für die KI-Stimme (z. B. Ihre geklonte Stimme), einmal für eine männliche Bewerber-Stimme.

**3. Auf dem Laptop: Eingabeaufforderung im Hirely-Ordner öffnen**
- Im Explorer `Q:\hirely` öffnen, oben in die Adresszeile klicken, `cmd` tippen, Enter.

**4. Neueste Version holen**
```
git pull
```

**5. Schlüssel und Stimmen eintragen**
```
notepad .env
```
Ganz unten diese drei Zeilen einfügen (Ihre Werte zwischen die Anführungszeichen), speichern, Notepad schliessen:
```
ELEVENLABS_API_KEY="sk_..."
ELEVENLABS_VOICE_AI="ID der KI-Stimme"
ELEVENLABS_VOICE_CANDIDATE="ID der Bewerber-Stimme"
```
Die Datei `.env` wird nie hochgeladen, der Schlüssel bleibt auf Ihrem Laptop.

**6. Aufnahmen erzeugen**
```
npm run demo:voice -- elevenlabs
```
Es erscheinen 28 Zeilen mit ✓, am Schluss „Fertig: 28 von 28 Sätzen haben eine Aufnahme“. Bei einem Fehler steht ein Hinweis da; danach einfach denselben Befehl nochmals starten, er macht dort weiter.

**7. Hochladen**
```
git add public/voice
git commit -m "Stimmen"
git push
```
Fragt Git beim ersten Mal nach Name und E-Mail: `git config user.name "Kevin D."` und `git config user.email "Ihre@Mail"` eingeben, dann den Commit wiederholen. Fragt es nach einer GitHub-Anmeldung: im Browserfenster anmelden.

Danach mir „hochgeladen“ schreiben.

## Weg B – von Hand auf der ElevenLabs-Webseite

Jeden Satz unten einzeln erzeugen, als MP3 herunterladen, umbenennen, in `public\voice\` legen, danach wie in Schritt 4 hochladen.


## KI-Stimme (17 Sätze)

Stimme: **die Interviewerin oder Ihre eigene geklonte Stimme**

| Nr. | Dateiname | Text |
|---|---|---|
| 1 | `03e90b5e8ffc8d.mp3` | Grüezi Roman Egli, hier ist der Hirely Recruiting-Assistent von Helvetic Engineering AG. Sie haben sich für die Stelle als Servicetechniker beworben. Ich bin ein automatisierter KI-Interview-Assistent – das Gespräch dauert etwa 10 Minuten, und die Entscheidung über das weitere Vorgehen trifft immer ein Mensch aus unserem HR-Team. |
| 2 | `15cd0e37921aa1.mp3` | Sind Sie damit einverstanden, dass dieses Gespräch aufgezeichnet und transkribiert wird, damit das HR-Team Ihre Antworten nachlesen kann? |
| 3 | `0eef01597a4c6c.mp3` | Besitzen Sie den Führerausweis Kategorie B? |
| 4 | `06bcf63201f08b.mp3` | Sind Sie bereit, Pikettdienst zu leisten? |
| 5 | `1a10cebaab0646.mp3` | Was interessiert Sie an der Stelle als Servicetechniker? |
| 6 | `101a99f10e106b.mp3` | In Ihrem Lebenslauf erwähnen Sie Ihre Tätigkeit als Servicetechniker bei Kardex AG. Welche Aufgaben haben Sie dort hauptsächlich übernommen? |
| 7 | `044d7c12568447.mp3` | Erzählen Sie von einer schwierigen Störung, die Sie beim Kunden behoben haben. |
| 8 | `07ff506a2473c1.mp3` | Sie haben bereits mehrjährige Erfahrung. Haben Sie in dieser Zeit auch Personen geführt oder angeleitet? |
| 9 | `1e56a6c6fa47f4.mp3` | Ab wann könnten Sie die neue Stelle antreten? |
| 10 | `12cf3faae58f81.mp3` | Wie lange ist Ihre aktuelle Kündigungsfrist? |
| 11 | `0f6ea98d1aa7fd.mp3` | Was sind Ihre Lohnvorstellungen, brutto pro Jahr? |
| 12 | `1c9d4d02a26bbf.mp3` | Gibt es noch etwas, das Sie uns mitteilen möchten, oder haben Sie Fragen zur Stelle? |
| 13 | `08bb93d3107de2.mp3` | Vielen Dank für das Gespräch, Roman Egli. Das HR-Team von Helvetic Engineering AG prüft Ihre Antworten persönlich und meldet sich in den nächsten Tagen bei Ihnen. Auf Wiederhören! |
| 14 | `08665b9f50ac8d.mp3` | Grüezi Max Muster, hier ist der Hirely Recruiting-Assistent von Helvetic Engineering AG. Sie haben sich für die Stelle als Servicetechniker beworben. Ich bin ein automatisierter KI-Interview-Assistent – das Gespräch dauert etwa 10 Minuten, und die Entscheidung über das weitere Vorgehen trifft immer ein Mensch aus unserem HR-Team. |
| 15 | `14032f5fff4bb2.mp3` | Vielen Dank für das Gespräch, Max Muster. Das HR-Team von Helvetic Engineering AG prüft Ihre Antworten persönlich und meldet sich in den nächsten Tagen bei Ihnen. Auf Wiederhören! |
| 16 | `1843d14a2cfeae.mp3` | Können Sie das bitte etwas genauer ausführen, zum Beispiel mit einem konkreten Beispiel? |
| 17 | `199b8621070e87.mp3` | Entschuldigung, ich habe Sie nicht verstanden. Könnten Sie das bitte wiederholen? |

## Bewerber-Stimme (11 Sätze, nur für die Telefon-Aufnahme von Roman Egli)

Stimme: **eine männliche Stimme (Roman Egli)**

| Nr. | Dateiname | Text |
|---|---|---|
| 1 | `1edcf9721f5781.mp3` | Ja, das ist in Ordnung. |
| 2 | `1cfab313169f86.mp3` | Ja, ich habe den Führerausweis Kategorie B. |
| 3 | `0b9ce4c9218424.mp3` | Ja, Pikettdienst ist für mich kein Problem, das kenne ich aus meiner aktuellen Stelle. |
| 4 | `105e314ab662dc.mp3` | Ich bin seit sechs Jahren im Aussendienst und schätze die Abwechslung. Bei Ihnen könnte ich vorwiegend in der Deutschschweiz arbeiten, was für meine Familie wichtig ist. |
| 5 | `1d24679d616cab.mp3` | Ich nehme Lagerliftsysteme bei Kunden in Betrieb, mache die regelmässige Wartung und suche bei Störungen den Fehler, elektrisch wie mechanisch. Meistens bin ich dabei allein beim Kunden unterwegs. |
| 6 | `15914cef4eeba1.mp3` | Bei einem Pharmakunden stand mitten in der Nacht ein Lagerlift still. Ich habe über die Fehlermeldungen einen defekten Endschalter gefunden, ihn ersetzt, und nach einer Stunde lief die Anlage wieder. |
| 7 | `03bd758170cdc2.mp3` | Ich betreue seit zwei Jahren unsere Lernenden im Aussendienst und arbeite neue Kollegen ein. Ein eigenes Team habe ich aber noch nicht geführt. |
| 8 | `1fe35438b77924.mp3` | Ab dem 1. Dezember. |
| 9 | `15019fe041c402.mp3` | Zwei Monate. |
| 10 | `06757dae02f47f.mp3` | 85000 Franken inklusive Pikett. |
| 11 | `15e3d49118c406.mp3` | Nein, im Moment nicht. Ich freue mich auf Ihre Rückmeldung. |

Danach mache ich den Rest: Telefon-Aufnahme zusammensetzen, testen, hochladen. Sie machen dann nur noch `git pull`.

