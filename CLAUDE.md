# CLAUDE.md — PseudoDoc

Diese Datei liest jede Sitzung zuerst.

## Was das ist

**PseudoDoc** (Klaus 14.11.2026): Datei rein → pseudonymisiert (Text: Platzhalter ⟦NAME-1⟧ …, Bilder: frei gesetzte 100 % schwarze
Flächen) → mit einem Klick zur KI (ChatGPT, Claude, Claude Code, Gemini: Text + Bild in die Zwischenablage, Seite öffnet sich) →
Antwort zurück → echte Angaben wieder drin. **Einfach in der Bedienung, höchster Stand in der Technik** (Klaus: „einfach, aber genial“ ·
„Einfach bedeutet nicht niedriger Standard … höher als die Familienakte“). Teil der Pro-App-Familie: Basic = Web-App (Pages),
Pro = Android/Windows (noch nicht gebaut, Muster Datei-Organizer). Verbindung zu anderen Apps vorbereitet, nicht eingeschaltet.

Adresse: https://lausiklauskn-png.github.io/PseudoDoc/ (leitet auf `app/`). Plan, Stand, Fragen: `docs/PLAN.md`.

## Aufbau

- `src/` Oberfläche (React, Vite) → gebaut nach `app/` (mitgeliefert; **nie von Hand ändern**, `npm run build`). `src/app.tsx` (zwei
  Seiten „1 Zur KI“, „2 Zurück“), `src/ki.ts` (Zwischenablage Text+Bild, Teilen, Öffnen), `src/abdecken.tsx` (Abdeck-Editor, Bedienung
  wie das Kontur-Werkzeug in Tomys Hub), `src/bild.ts` (Texterkennung mit Wortlage, Abdecken, Bild zurück), `src/lesen.ts` (PDF/Scan/Foto/
  .eml/Word), `src/pruefkern.ts` (versteckte KI-Anweisungen), `src/speicher.ts` (Zuordnung verschlüsselt, 90 Tage), `src/logo.tsx` +
  `src/zeichen.ts` (Zeichen; `public/pseudodoc.svg` und Symbole nur über `node scripts/logo.mjs`, im Bau geprüft).
- `lib/pseudo/` eigener Kern (Auftrag über mehrere Dateien, unsichtbare Zeichen, Flächen, ZIP/Word) – hier gepflegt. (Die erste Fassung
  lag im Datei-Organizer als Seite „Pseudonymisierer“; PseudoDoc ist ab jetzt die Quelle.)
- **Bausteine byte-gleich mit Pin** (`bausteine.json`, nur `node scripts/bausteine.mjs`, im Bau `--pruefen`): `lib/maske/` + Modul 25
  (`src/public/vendor/maske/`) aus der **Familienakte**; `lib/bausteine/` (Dateiart, E-Mail, ZIP/Office, PDF-Text) und
  `src/public/vendor/{pruefkern,tesseract}` aus dem **Datei-Organizer**. Nie von Hand ändern, nie nachbauen.

## Sicherheit (feste Regeln)

- **Kein Netz:** Content-Security-Policy in `src/index.html` (`connect-src 'self'`); kein `fetch` in `src/`/`lib/pseudo/` (Kernprobe).
  Die KI-Knöpfe öffnen nur die Seite des Anbieters; eingefügt wird vom Nutzer.
- **Hinaus geht nur:** pseudonymisierter Text ohne unsichtbare Zeichen (`sauber`), neu gezeichnete PNG ohne Metadaten (Probe liest die
  PNG-Abschnitte), Dateien heißen D01 … (keine echten Namen). Leck → Sperre.
- **Gespeichert** wird Klartext nur verschlüsselt (Zuordnung, Dateinamen, Korrekturen); die Probe liest die IndexedDB-Bytes.
- Pseudonymisiert ist nicht anonym – das steht hinter dem „?“ und im Datenschutz.

## Proben

`npm run build` (Pins, Logo, Kern 54, Typen, Bau) · `node tests/ui-probe.mjs` (Browser, 46; CI `pruefung.yml`).

## Feste Regeln (aus der Familie übernommen)

- Keine echten Dokumente, keine personenbezogenen Daten im Repo – nur erfundene Beispiele.
- Keine Schlüssel, PINs, Passwörter im Repo oder im Chat.
- Sichtbare Änderungen: Klaus hat für PseudoDoc 0.1.0 selbst den Bau freigegeben („anfangen mit dem Bauen und eine Version herausbringen“);
  größere neue Oberflächen danach erst als Vorschau.
- **Codex ist außen vor** (Klaus 14.11.: „Vergiss Codex, arbeite alleine“) – keine Codex-Prüfungen anstoßen oder abwarten.
- Forschungseinträge nur nach KimHub. Eigene geprüfte PRs (CI grün) selbst mergen; APK/Windows-Ausgaben nur mit Klaus' Wort.
- Jede Sitzung endet mit einem Abschlussbrief `docs/BRIEF_ABSCHLUSS_<Datum>_….md` (Stundennachweis, Startauftrag als Codeblock).
