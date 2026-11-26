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

## Fragen an Klaus

- F1 Reihenfolge der drei Wege auf der Startseite: Rein · Zur KI · Raus (so vorgeschlagen) oder „Zur KI“ zuerst, weil es heute der Kern ist?
- F2 Soll „Raus“ ab Werk auch pseudonymisieren, oder nur auf Haken?
- F3 Spezial-Karte und Marktplatz-Text gleich mit 0.2.0 umstellen?
