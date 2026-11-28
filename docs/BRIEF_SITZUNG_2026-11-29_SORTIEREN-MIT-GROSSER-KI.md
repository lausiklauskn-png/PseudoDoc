# Brief: PseudoDoc als Kern für „Mit großer KI sortieren“ (Stand 28.11.2026)

Klaus 28.11.2026: *„Könnte man Datei-Organizer und PseudoDoc verbinden … sodass der Datei-Organizer den PseudoDoc-Bauplan
integriert oder mit ihm verschmilzt … halt nur diesen Hin- und Rückweg.“*

**Gebaut wird im Datei-Organizer**: Bauplan dort, `docs/BRIEF_SITZUNG_2026-11-29_SORTIEREN-MIT-GROSSER-KI.md`
(https://github.com/lausiklauskn-png/Datei-Organizer). Ein pseudonymisierter Ordner geht mit der Fachregel an eine große KI,
zurück kommt ein Sortierplan, Klaus bestätigt, der Sortier-Kern lernt aus den Korrekturen.

## Was PseudoDoc dafür tut

- **PseudoDoc bleibt die Quelle des Pseudo-Kerns** (`lib/pseudo/`: auftrag, flaechen, pakete, rueckweg, bereinigen). Der
  Organizer übernimmt ihn byte-gleich mit Pin, wie PseudoDoc selbst die Maske aus der Familienakte übernimmt.
- **Gemessen 28.11.2026:** der Organizer trägt noch die erste Fassung (`auftrag.ts` weicht ab, `rueckweg`/`bereinigen` fehlen).
  Wer hier am Kern etwas ändert, sagt es im Abschlussbrief, damit der Organizer nachzieht.
- Der Kern muss **ohne Oberfläche** benutzbar bleiben (kein React, kein DOM in `lib/pseudo/`), sonst kann der Organizer ihn
  nicht übernehmen. Das ist heute so; nicht ändern.
- Die feste Regel bleibt: kein Netz in PseudoDoc.

Kein eigener Bau in PseudoDoc nötig, solange der Kern so bleibt.
