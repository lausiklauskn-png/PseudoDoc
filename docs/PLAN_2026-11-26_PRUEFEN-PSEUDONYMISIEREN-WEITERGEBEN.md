# PseudoDoc 0.2 – Dateien prüfen, pseudonymisieren, sicher weitergeben

**Stand:** Plan, nicht gebaut. Gebaut wird erst nach Klaus' Ja.

## Auftrag (Klaus 26.11.2026)

„Auslieferungsprüfer, Sendeprüfer, Pseudonymisierer zusammenpacken … prüft, was reingeht, prüft, was an eine KI geht, prüft, was
rausgeht … für jemanden, der unsere Tools gar nicht will, sondern nur diese Anwendung, um eigene Dateien zu prüfen, bevor er sie
irgendwo rausschickt.“ · „den Pseudonymisierer so lassen im Namen, aber die gesamten Tools einbauen … integrieren in PseudoDoc.“ ·
„Wir nennen die Bezeichnung: Dateien prüfen, pseudonymisieren, sicher weitergeben.“

Zum Namen (Klaus): ein Doktor heilt nicht selbst, er regt nur an. PseudoDoc repariert nichts: **er liest, schlägt vor und verändert
nur eine Kopie.** Das Original bleibt unangetastet.

## Name und Untertitel

- Name bleibt **PseudoDoc** (Basic = Web-App, Pro = Android/Windows). Kennung, Signierung, Update-Weg bleiben → Pro 0.2.0 kommt als
  gewöhnliches Update.
- Untertitel überall (Kopf, Manifest, Marktplatz-Karten, Spezial): **„Dateien prüfen, pseudonymisieren, sicher weitergeben“**.
  Heute steht dort „Datei rein · pseudonymisiert zur KI · zurück“.

## Startseite: drei Wege statt vieler Werkzeuge

| Weg | Frage des Nutzers | was passiert | Bausteine |
|---|---|---|---|
| **Rein** | „Kann ich das öffnen?“ | Datei oder Mail prüfen: versteckter Text, Anweisungen an eine KI, Makros, getarnte Programme, fremde Links, Absender passt nicht | Prüfkern (`pruefer-anhang/-formate/-mail`, byte-gleich, Pin) – vorhanden |
| **Zur KI** | „Kann ich das einer KI zeigen?“ | heutiger Ablauf 1 → 2: pseudonymisieren, Bilder abdecken, ein Klick zur KI, Antwort zurück mit echten Angaben | Maske (Familienakte), `lib/pseudo` – vorhanden |
| **Raus** | „Kann ich das weitergeben?“ | prüfen wie beim Auslieferungsprüfer (Schlüssel, Mailadressen, IBAN, Ort im Foto, Autor, Kommentare, versteckter Text) und eine **bereinigte Kopie** ablegen | Auslieferungsprüfer-Kern (neu, byte-gleich mit Pin) · Reinigung aus Workflow PDF (`reinigung.js`, byte-gleich) · neu: Säubern |

Jeder Befund wie ein kurzer Bericht: **in Ordnung / Hinweis / Achtung**, mit „Was jetzt tun“. Wörtlich übernommen aus dem Prüfer.

## Neu zu bauen (0.2.0)

1. **Startseite mit drei Wegen**, der heutige Ablauf wird Weg „Zur KI“ (nichts daran geht verloren).
2. **Weg „Rein“**: der vorhandene Prüfkern bekommt eine eigene Seite mit Bericht (heute warnt er nur beim Pseudonymisieren).
3. **Weg „Raus“ – bereinigte Kopie** (das eigentlich Neue):
   - Foto: neu gezeichnet ohne Kamera-, Orts- und Zeitangaben (Technik vorhanden)
   - PDF: Dokument-Infos und XMP leer, versteckter Text zugedeckt (Reinigung aus Workflow PDF)
   - Word/Excel/PowerPoint: Autor, Firma, Kommentare, Änderungsverfolgung, versteckte Folien gemeldet; Autor/Firma entfernt
   - auf Wunsch zusätzlich pseudonymisiert (Weg „Zur KI“ ohne KI)
   - Ausgabe: Kopie mit Zusatz „-bereinigt“, nie das Original überschreiben
4. **Auslieferungsprüfer-Kern** als Baustein (`pruefer.js`, `pruefer-formate.js` aus dem Prüfer-Depot, Pin in `bausteine.json`).
5. Untertitel, Hilfe-Texte, Marktplatz-Karten (family-projekt.de, PWA Toolpoint), Spezial-Karte.

## Basic und Pro

| | Basic (Web) | Pro (Android, Windows) |
|---|---|---|
| Rein / Zur KI / Raus für einzelne Dateien | ja | ja |
| ganze Ordner (Windows: ziehen) | wenige Dateien | ja, in Blöcken mit Anhalten/Weitermachen |
| „Teilen an PseudoDoc“, „Öffnen mit“ | – | ja (vorhanden) |
| Adresse abrufen ohne Browser-Sperre (Webseite prüfen) | – | ja (neu) |
| bereinigte Kopie direkt in einen gewählten Ordner | Download | ja |
| Profile (eigene Namen, Kunden, Nummern) | – | später (Fach `profile` des Pro-Tresors) |

## Ehrlich dazusagen (bleibt sichtbar in der App)

- **Kein Virenscanner.** Geprüft werden Inhalt und Aufbau, nicht Schadcode.
- **Pseudonymisiert ist nicht anonym** (DSGVO Art. 4 Nr. 5).
- Was die App nicht lesen kann, wird als „nicht geprüft“ gemeldet, nicht als „in Ordnung“.

## Proben (geplant)

Je Weg eine Browser-Probe mit erfundenen Dateien (Foto mit Ortsangabe, PDF mit verstecktem Text, Word mit Autor und Kommentar, Mail
mit KI-Anweisung); die bereinigte Kopie wird **byte-genau nachgelesen** (keine Ortsangabe mehr, kein Autor, Original unverändert).
Gegenproben: je Riegel ein Fall. Bestehende Proben (52 Web, 67 nativ, 64 Windows) bleiben grün.

## Klaus' Antworten (26.11.2026)

- F1 Reihenfolge bleibt **Rein · Zur KI · Raus**.
- F2 „Raus“ pseudonymisiert **nur auf Haken**.
- F3 Marktplatz-Karten (family-projekt.de, PWA Toolpoint) und Spezial-Karte **gleich mit 0.2.0** umstellen.

## Der Rückweg wird geprüft (Klaus 26.11.: „ob ich beim Zurückweg auch Fehler gemacht habe … raus und wieder rein“)

Heute setzt „2 · Zurück“ die echten Angaben ein und meldet unbekannte Platzhalter gelb. Neu: das Ergebnis geht **von selbst noch
einmal durch die Prüfung**, bevor es gespeichert oder weitergegeben wird. Der Bericht sagt:

| Prüfung | Befund |
|---|---|
| alle Platzhalter ersetzt | Achtung, wenn noch ein ⟦…⟧ im Text steht (verändert, erfunden oder abgeschnitten) |
| Platzhalter der KI, die es im Auftrag nie gab | Achtung (vorhanden als „unbekannt“, wird Teil des Berichts) |
| fehlende Platzhalter | Hinweis: diese echten Angaben kommen in der Antwort nicht mehr vor (die KI hat etwas weggelassen) |
| neue Links, Mailadressen, Telefonnummern, IBAN, die nicht im Original standen | Hinweis: von der KI eingefügt, bitte prüfen |
| Anweisungen an eine KI, versteckter Text, unsichtbare Zeichen in der Antwort | Achtung (Prüfkern, wie bei „Rein“) |

Danach dieselben Ausgänge wie bei „Raus“: **Speichern** (Pro: gewählter Ordner, Web: Download), **Teilen**, **Kopieren**, Word/Text;
auf Haken bereinigte Kopie. So schließt sich der Kreis: **rein → zur KI → zurück → geprüft → raus**.

**Getestet** wird der Kreis als Rundlauf mit erfundenen Unterlagen: pseudonymisieren, eine gestellte KI-Antwort (mit einem
veränderten, einem erfundenen und einem fehlenden Platzhalter sowie einem eingeschmuggelten Link) zurückholen, jeder Befund muss mit
seinem Namen im Bericht stehen; ohne Fehler muss der Text Zeichen für Zeichen dem Original-Wortlaut entsprechen.

## Wie die Datei zur KI kommt (Klaus: „muss ich eine Auswahl haben für die KIs oder kann ich das weitergeben?“)

Beides gibt es schon in PseudoDoc 0.1.0 und bleibt so:

- **Auswahl**: Knöpfe ChatGPT · Claude · Claude Code · Gemini. Ein Tipp legt Text und Bild in die Zwischenablage und öffnet die Seite;
  dort einfügen. Kein Schlüssel, kein Konto in PseudoDoc, nichts geht direkt aus der App ins Netz.
- **Weitergeben**: „Teilen“ (am Handy direkt an die App der KI), „Nur kopieren“, „Als Datei“, ZIP – für jede andere KI.

Nicht drin, mit Absicht: Senden über einen eigenen Schlüssel (wie Mistral in Familienakte und Private Brain Pro). Das bräche die
Zusicherung „nichts geht aus der App ins Netz“ (`connect-src 'self'`). Wenn gewünscht, später nur in Pro und nur auf Haken – **eigene
Frage an Klaus, nicht Teil von 0.2.0**.
