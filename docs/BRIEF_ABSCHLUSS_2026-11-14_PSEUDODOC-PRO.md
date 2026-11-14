# Abschluss 14.11.2026: PseudoDoc Pro (Android, Windows) – Hülle, Maskensymbol, Installieren, Update-Fähnchen

Auftrag (Klaus 14.11.): APK und Windows-App „PseudoDoc Pro“, Symbol = Maske (blau, leichter Verlauf, Maske mit 3D-Schatten; Klaus: „Logo ist
sehr gut“), Installationsknopf, der nach der Installation verschwindet, Fassungsnummer als Update-Knopf mit Fähnchen (Update vom Server).

## Was gebaut ist

Alles in `docs/PRO.md`. Hülle aus dem Datei-Organizer (dort veröffentlicht) übernommen und umbenannt; eigene Proben angepasst (Beispiel statt
Testordner, Auftrag nach Neustart/Überinstallieren). `src/maske.ts` + `scripts/logo.mjs` erzeugen alle Symbole. `src/kopf.tsx`: Fassung,
Fähnchen, Installieren. `src/eingang.ts`: Teilen an PseudoDoc Pro / „Öffnen mit“.

## Proben

Bau grün (22 Pins, Logo/Maske, Kern 59), Browser 52 grün, Hülle 67 grün, Windows-Engine 64 grün, Kindprozess grün. Nicht gelaufen: Gradle
(Android) und Rust/NSIS (Windows) – das zeigen `android.yml`/`windows.yml` im PR.

## Offen bei Klaus

(a) Signieridentität (`PD_SIGNING_UNLOCK`, Workflow initialize), (b) Update-Schlüssel (Termux-Block in `docs/PRO.md`, öffentliche Zeile an
Claude), (c) Wort zum Veröffentlichen.

## Stundennachweis

| Zeit (UTC) | Block |
|---|---|
| 13:00–13:15 | Muster im Datei-Organizer gelesen, Maskensymbol entworfen |
| 13:15–14:10 | Hülle übernommen und umbenannt, Symbole, Kopf (Installieren, Fähnchen), Eingang, Proben angepasst, Dokumente |

## Startauftrag nächste Sitzung

```
Repo PseudoDoc. Lies CLAUDE.md, docs/PRO.md, docs/PLAN.md und diesen Brief. Wenn Klaus den öffentlichen Update-Schlüssel gegeben hat:
in UpdateFeed.SCHLUESSEL und DesktopUpdates.SCHLUESSEL eintragen (eine Zeile, beide gleich), Proben, PR. Nach Signieridentität und
Klaus' Wort: „PseudoDoc Pro Android/Windows veröffentlichen“ (Tag v0.1.0), Downloads per SHA-256 prüfen, Nachweis docs/VEROEFFENTLICHUNG-0.1.0.json,
Geschenkbox der Familienakte ergänzen. Codex außen vor. Abschlussbrief mit Stundennachweis.
```
