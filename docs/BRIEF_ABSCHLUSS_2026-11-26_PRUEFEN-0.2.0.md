# Abschlussbrief 26.11.2026 – PseudoDoc 0.2.0 „Dateien prüfen, pseudonymisieren, sicher weitergeben“

## Erledigt
- PR #7: Windows-Installer am GitHub-Release (0.1.0 nachträglich angehängt, SHA-256 geprüft); `windows-release.yml` hängt ihn künftig selbst an.
- PR #8: 0.2.0 – Startseite mit drei Wegen (Rein · Zur KI · Raus), Prüfbericht Achtung/Hinweis/In Ordnung, bereinigte Kopie
  (Bild, PDF, Office, Text), Pseudonymisieren nur mit Haken, Rückweg-Prüfung beim Zurückholen. Fassung 0.2.0 (Code 20).
  CI grün (pruefung, android, windows, engine). Web-App kommt über Pages mit `main`.
- Marktplatz-Karten (Basic) in family-project #390 und PWA Toolpoint #194 mit dem neuen Untertitel, Cache v177 bzw. v114.

## Nicht getan
- **APK/Windows 0.2.0 nicht ausgegeben** – braucht Klaus' Wort. Danach: Spezial-Karte „PseudoDoc Pro“ (family-project und
  PWA Toolpoint `assets/config/spezial.js`) auf den neuen Text bringen.
- Am Gerät ungeprüft (Tablet, Android, Windows).
- `"id": "./"` im Manifest: möglicher Kollisionsfall mit anderen Apps auf github.io (siehe CLAUDE.md), offen.

## Stundennachweis
Sitzung 26.11.2026 (mit Private Brain Pro 1.0.59, Familienakte 2.28.79, Marktplatz Spezial); Zeiten je Teil nicht genau erfasst.

## Startauftrag
```
PseudoDoc: CLAUDE.md lesen (Abschnitt 0.2.0). Wenn Klaus „0.2.0 ausgeben“ sagt: android-release.yml und danach
windows-release.yml von main mit veroeffentlichen=ja, Downloads per SHA-256 nachrechnen, docs/VEROEFFENTLICHUNG-0.2.0.json,
dann die Spezial-Karte PseudoDoc Pro in family-project und PWA Toolpoint auf „Dateien prüfen, pseudonymisieren, sicher
weitergeben“ umstellen.
```
