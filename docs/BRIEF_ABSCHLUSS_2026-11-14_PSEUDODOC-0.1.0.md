# Abschluss 14.11.2026: PseudoDoc 0.1.0 (Web-App)

Auftrag und Stand: `docs/PLAN.md`. Vorlauf: Datei-Organizer PR #28 (Seite „Pseudonymisierer“, dort gebaut und veröffentlicht); Klaus
gab dann das Repo PseudoDoc und das Ziel „so einfach wie möglich, Technik höher als die Familienakte“. PseudoDoc übernimmt den Kern
(hier gepflegt), Bausteine byte-gleich mit Pin (`bausteine.json`), neue Oberfläche mit zwei Seiten, KI-Knöpfe, Logo, Härtung
(CSP, unsichtbare Zeichen, Prüfkern, Metadaten-Probe).

## Proben

`npm run build`: 22 Bausteine am Pin, Logo passt, Kern 54 grün, Typen, Bau. `tests/ui-probe.mjs`: 46 grün (Zwischenablage Text + Bild,
vier KI-Seiten, ZIP ohne Klartext, PNG ohne Metadaten-Abschnitte, Foto mit erfundenem Exif/GPS → ohne, versteckte KI-Anweisung gewarnt,
Rückweg Text/Word/Bild, Speicher ohne Klartext, Handy 360 px, keine Verstöße gegen die Sicherheitsregel).

## Stundennachweis

| Zeit (UTC) | Block |
|---|---|
| 12:43–12:50 | Repo geholt, Bausteine mit Pin, Kern übernommen, Logo entworfen |
| 12:50–12:55 | Oberfläche, KI-Knöpfe, Prüfkern, Härtung, Proben, Bilder angesehen, Dokumente |

## Startauftrag nächste Sitzung

```
Repo PseudoDoc. Lies CLAUDE.md, docs/PLAN.md und diesen Brief. Nimm Klaus' Rückmeldung zur Web-App und die Fragen F1–F3 auf.
Dann Pro-Hülle Android/Windows nach dem Muster Datei-Organizer (Paket de.familyprojekt.pseudodoc, Signier-Identität, Updates von
family-projekt.de/updates/pseudodoc/). Bausteine nur über scripts/bausteine.mjs. Proben: npm run build, node tests/ui-probe.mjs.
Veröffentlichen nur mit Klaus' Wort. Codex außen vor. Abschlussbrief mit Stundennachweis.
```
