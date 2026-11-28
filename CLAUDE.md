# CLAUDE.md — PseudoDoc

Diese Datei liest jede Sitzung zuerst.

## Was das ist

**PseudoDoc** (Klaus 14.11.2026): Datei rein → pseudonymisiert (Text: Platzhalter ⟦NAME-1⟧ …, Bilder: frei gesetzte 100 % schwarze
Flächen) → mit einem Klick zur KI (ChatGPT, Claude, Claude Code, Gemini: Text + Bild in die Zwischenablage, Seite öffnet sich) →
Antwort zurück → echte Angaben wieder drin. **Einfach in der Bedienung, höchster Stand in der Technik** (Klaus: „einfach, aber genial“ ·
„Einfach bedeutet nicht niedriger Standard … höher als die Familienakte“). Teil der Pro-App-Familie: Basic = Web-App (Pages),
**Pro = Android/Windows** (**0.2.0 veröffentlicht 26.11., nicht erneut ausgeben; nächste 0.2.1**, Nachweise `docs/VEROEFFENTLICHUNG-0.2.0.json`, `-0.1.0.json`; Symbol = Maske mit 3D-Schatten; alles in `docs/PRO.md`). Verbindung zu anderen Apps vorbereitet, nicht eingeschaltet.

**PseudoDoc ist Kern für „Mit großer KI sortieren“ (Klaus 28.11.2026):** gebaut wird im Datei-Organizer, der `lib/pseudo/` von hier byte-gleich mit Pin übernimmt. Kern ohne Oberfläche lassen, Änderungen im Abschlussbrief nennen. [Teilauftrag](docs/BRIEF_SITZUNG_2026-11-29_SORTIEREN-MIT-GROSSER-KI.md).

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

## Pro (Android, Windows)

`android/`, `windows/`, `tools/native`, `tools/signing` aus dem Datei-Organizer übernommen und umbenannt (`de.familyprojekt.pseudodoc`,
„PseudoDoc Pro“, Updates `family-projekt.de/updates/pseudodoc/`, Geheimnis `PD_SIGNING_UNLOCK`). Fassung steht in `package.json` und muss
gleich sein in `android/app/build.gradle` (versionName, versionCode = Haupt×1000 + Neben×10 + Flick), `windows/package.json`,
`windows/src-tauri/{tauri.conf.json,Cargo.toml}` – `test-native.mjs` prüft das. Kopf: Fassung = Update-Knopf, Fähnchen, Installieren
(nur Web) in `src/kopf.tsx`. Was Klaus einmalig tun muss (Signieridentität, Update-Schlüssel): `docs/PRO.md`. Nie `call.getLong` für
kleine Zahlen in Java-Plugins (Lehre der Familienakte).

## Proben

`npm run build` (Pins, Logo, Kern 59, Typen, Bau) · `node tests/ui-probe.mjs` (Browser, 52) · `node tools/native/test-native.mjs` (67)
· `node windows/engine/test.mjs` (64; Linux mit `LANG=C.UTF-8`). CI: `pruefung.yml`, `android.yml`, `windows.yml`.

## Feste Regeln (aus der Familie übernommen)

- Keine echten Dokumente, keine personenbezogenen Daten im Repo – nur erfundene Beispiele.
- Keine Schlüssel, PINs, Passwörter im Repo oder im Chat.
- Sichtbare Änderungen: Klaus hat für PseudoDoc 0.1.0 selbst den Bau freigegeben („anfangen mit dem Bauen und eine Version herausbringen“);
  größere neue Oberflächen danach erst als Vorschau.
- **Codex ist außen vor** (Klaus 14.11.: „Vergiss Codex, arbeite alleine“) – keine Codex-Prüfungen anstoßen oder abwarten.
- Forschungseinträge nur nach KimHub. Eigene geprüfte PRs (CI grün) selbst mergen; APK/Windows-Ausgaben nur mit Klaus' Wort.
- Jede Sitzung endet mit einem Abschlussbrief `docs/BRIEF_ABSCHLUSS_<Datum>_….md` (Stundennachweis, Startauftrag als Codeblock).

## Windows-Installer am GitHub-Release (Klaus 2026-11-26)

Der Marktplatz Spezial (family-project `server/spezial/`) holt APK und Installer vom **GitHub-Release** `v<Fassung>`. Der
Installer 0.1.0 lag nur auf `family-projekt.de/updates/pseudodoc/`. Seitdem hängt `windows-release.yml` ihn zusätzlich an das
Release (nach Android, sonst Abbruch); für 0.1.0 einmalig `windows-an-release.yml` (holt die Datei vom Update-Server, prüft sie gegen
die SHA-256 im Nachweis, hängt sie an – kein neuer Bau, keine neue Fassung).

## 0.2.0 – Dateien prüfen, pseudonymisieren, sicher weitergeben (Klaus 26.11.2026)

Plan und Klaus' Antworten: `docs/PLAN_2026-11-26_PRUEFEN-PSEUDONYMISIEREN-WEITERGEBEN.md`. Auslieferungsprüfer und Sende-Prüfer
gehen in PseudoDoc auf. Startseite mit drei Wegen (`StartSeite` in `src/app.tsx`, Hash `#rein`, `#hin`, `#zurueck`, `#raus`; leer = Start):
- **Rein** (`PruefSeite modus="rein"`, `src/pruefen.tsx`): Prüfkern auf Datei/Mail, Bericht Achtung · Hinweis · In Ordnung.
- **Zur KI / Zurück** wie bisher; das Zurückholen prüft das Ergebnis (`lib/pseudo/rueckweg.ts` + `pruefeMail`): Platzhalter übrig/erfunden/
  fehlt, neue Links, IBAN, Mail, Telefon, unsichtbare Zeichen; „Erneut prüfen“, „Unsichtbare Zeichen entfernen“, Teilen.
- **Raus** (`PruefSeite modus="raus"`): Prüfung + personenbezogene Angaben + bereinigte Kopie (`lib/pseudo/bereinigen.ts`: Bild neu gezeichnet,
  PDF aus Seitenbildern, Office ohne Autor/Firma, Text ohne unsichtbare Zeichen). Pseudonymisieren nur mit Haken (Word/Text, ohne gemerkte
  Zuordnung). Original bleibt unverändert. Kein Virenscanner – das steht auf beiden Seiten.
- `data-beispiel` steht auf der Startseite (die nativen Proben klicken es); der Knopf in „Zur KI“ heißt `data-beispiel-hin`.
- Proben: Kern 80, Oberfläche 64, native 67, Windows-Engine 64. Am Gerät ungeprüft. **APK/Windows 0.2.0 veröffentlicht 26.11.** (Nachweis `docs/VEROEFFENTLICHUNG-0.2.0.json`).
- Manifest-Kennung (Klaus 26.11.: „gleich angleichen“): `"id": "/PseudoDoc/app/"` statt `"./"` (das rechnet Chrome vom Ursprung aus,
  dieselbe Kennung wie andere Apps auf github.io). Wer die Web-App schon installiert hatte, installiert sie einmal neu. Vorrat `pseudodoc-v3`.
  Probe in `test-native.mjs`.
