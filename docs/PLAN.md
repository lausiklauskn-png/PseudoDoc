# PseudoDoc – Plan und Stand

## Auftrag (Klaus 14.11.2026)

„Datei rein, pseudonymisieren, mit Bilddatei pseudonymisieren und wieder raus. Zur KI – ChatGPT, Claude, Claude Code, Gemini – direkter
Klick, und die Datei wird kopiert zusammen mit dem pseudonymisierten Bild, wenn ich das angewählt habe. … Einfach, aber genial. Dran
denken, dass die Metadaten im Hintergrund nicht mit zu erkennen sind.“ · „Einfach bedeutet nicht niedriger Standard, was die Technik
angeht … höher als die Familienakte.“ · Bilder: Flächen 100 % schwarz frei setzen wie im Kontur-Werkzeug von Tomys Hub (Kennzeichen,
Gesichter, Szenen); das Bild kommt zurück und die Stellen werden aus dem Original ergänzt. · Logo: „bessere Grafik als die Standard“.
· Pro-App-Familie: APK und Windows, Updates wie die anderen Pro-Apps; Verbindung zu anderen Tools möglich, nicht automatisch frei.

## Stand 0.1.0 (Web-App, „Basic“)

| Bereich | Was es kann |
|---|---|
| Rein | Dateien, ganzer Ordner, Ziehen, Foto (Kamera am Handy), Beispiel; Text, PDF (Textebene), Scan-PDF (Seiten als Bilder, Texterkennung, höchstens 20), Foto (Texterkennung mit Wortlage), E-Mail .eml mit Anhängen (beliebig tief bis 3), Word/OpenDocument, Excel/PowerPoint (Prüfkern) |
| Pseudonymisieren | Maske der Familienakte (byte-gleich): Namen, Anschriften, IBAN, Steuer-ID, KVNR, RV-Nr., Ausweis mit Prüfziffer, USt-IdNr., Geburtsdatum, Kunden-/Vertragsnummern, ICD mit Gruppe; Beträge, Fristen, große Firmen bleiben lesbar. Gemeinsame Platzhalter über alle Dateien (zwei Durchgänge). Zusatz: Telefon mit Satzpunkt (Lücke der Maske, gehört in Modul 25 Gen. 3) |
| Härtung | Unsichtbare Zeichen raus (Nullbreite, Richtungswechsel, Unicode-Tags); Prüfkern warnt bei versteckter KI-Anweisung, unsichtbarem Text, Makro, getarntem Programm; Leck-Sperre (`findLeak`); Content-Security-Policy ohne fremde Verbindungen |
| Bilder | Vorschläge (verdeckte Werte, Kennzeichen, Gesichter wo der Browser kann); Editor: Rechteck, Kreis, Vieleck, Anfasser, Doppeltipp, Rückgängig 60, durchscheinend nur zum Ausrichten; Ausgabe neu gezeichnetes PNG ohne Metadaten (Probe: Exif/GPS/Kamera/Zeit weg) |
| Zur KI | Ein Klick (ChatGPT, Claude, Claude Code, Gemini): Auftrag + alle Fassungen + Bild (mehrere als ein Sammelbild mit Kennungen) in die Zwischenablage, Seite öffnet sich. Dazu: Nur kopieren, Teilen (Handy → App der KI), Als Datei, ZIP. Aufgabe (Antwortbrief/Prüfen/Zusammenfassen), Stil, freier Auftrag |
| Zurück | Antwort einfügen oder Datei (Text, Markdown, Word, Bild mit Kennung); echte Angaben wieder drin, unbekannte Platzhalter gemeldet; Ergebnis änderbar, Kopieren, Word, Text, Löschen; Bild: abgedeckte Stellen aus dem Original |
| Aufträge | Zuordnung, Dateinamen, Korrekturen verschlüsselt (AES-GCM, nicht auslesbarer Geräteschlüssel), 90 Tage, Erledigt, Sicherung mit Passwort (PBKDF2 600 000) |
| Logo | Eigenes Zeichen: Blatt mit Lichtstreifen, hinter dem die Zeilen schwarz werden; im Kopf einmal bewegt (Bewegung reduzieren = still) |

**Nicht gemessen:** echte Unterlagen; ob ChatGPT/Claude/Gemini beim Einfügen **Text und Bild zusammen** übernehmen (die Zwischenablage
hält beides; welche Seite was nimmt, entscheidet die Seite – darum der Knopf „Bild noch einmal kopieren“); Teilen am Handy; Finger am
Tablet; große Ordner (kein Anhalten/Weitermachen); Gesichtserkennung (im Test-Chromium nicht vorhanden).

## Nächste Schritte

1. Klaus' Blick auf die Web-App.
2. **Pro (Android, Windows)**: Hülle nach dem Muster Datei-Organizer (`android/` Capacitor, `windows/` Tauri + Java-Engine), Paket
   `de.familyprojekt.pseudodoc`, eigene Signier-Identität, Updates von `family-projekt.de/updates/pseudodoc/` mit Fähnchen, Teilen/„Öffnen
   mit“ an PseudoDoc, Arbeitsordner auf SD/PC. Veröffentlichen nur mit Klaus' Wort.
3. **Verbindung (aus, bis Klaus freischaltet):** Familienakte-Pseudo-Fenster „An PseudoDoc“, Profile aus dem Pro-Tresor (Fach `profile`),
   Private Brain Pro (Mails). Die Seite „Pseudonymisierer“ im Datei-Organizer auf PseudoDoc umlenken.
4. Große Ordner in Blöcken; Bilder in PDFs mit Textebene schwärzen; Handschrift-Hinweis.

## Fragen an Klaus

- F1 Soll die alte Seite „Pseudonymisierer“ im Datei-Organizer auf PseudoDoc umleiten (eine Quelle)?
- F2 Fotos ohne Text: ab Werk mitgeben (abgedeckt) oder ab Werk abgewählt?
- F3 Weitere KI-Knöpfe (z. B. Mistral Le Chat, Copilot, Perplexity)?
