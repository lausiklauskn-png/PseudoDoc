// Pseudonymisierer (Klaus 14.11.2026): ein Auftrag = ein Stapel Dateien (Brief, AGB, Nutzungsvereinbarung …), die gemeinsam
// pseudonymisiert werden – gleiche Person = gleicher Platzhalter in allen Dateien. Reine Rechnung ohne DOM, ohne Netz, ohne
// Speicher (die Probe scripts/run-pseudo-tests.mjs prüft das am Quelltext). Die Maske selbst ist byte-gleich aus der Familienakte
// (lib/maske/, Pin HERKUNFT.json) – hier steht nur, was um sie herum gebraucht wird: Auftrag, Ordner, Rückweg.

import { maskieren, zurueckfuehren, MARKE, type MaskeProfil } from "../maske/maske.ts";
import type { Pseudonymisierer } from "../maske/ki-auftrag.ts";
import type { Flaeche } from "./flaechen.ts";

export const ORDNER = {
  originale: "1-Originale",
  ki: "2-Fuer-die-KI",
  antworten: "3-Antworten-der-KI",
  zurueck: "4-Zurueckgefuehrt",
} as const;

export type StueckArt = "text" | "pdf" | "scan" | "bild" | "mail" | "office" | "unbekannt";

/** Ein Stück des Auftrags. Der Klartext (`text`) bleibt nur im Speicher der Seite; gespeichert wird `fassung`. */
export type Stueck = {
  kennung: string;          // D01, D02 … – so heißt die Datei draußen (der echte Dateiname kann Namen tragen)
  pfad: string;             // Pfad im gewählten Ordner, „Mail.eml › Anhang.pdf“ für Anhänge
  art: StueckArt;
  text: string;             // gelesener Klartext (leer bei Fotos ohne Text)
  fassung: string;          // pseudonymisiert, mit Marke
  funde: number;
  unsicher: string[];
  leck: string | null;
  schon: boolean;           // war schon pseudonymisiert (Marke) – unverändert übernommen
  hinweis?: string;         // z. B. „Texterkennung: nur die ersten 20 Seiten“
  bild?: { breite: number; hoehe: number; flaechen: Flaeche[]; seite?: number };
  weglassen?: boolean;      // nicht an die KI (vom Nutzer abgewählt)
  warnung?: string[];       // Prüfkern: versteckte KI-Anweisung, unsichtbarer Text, Makro … (bleibt auf dem Gerät)
};

// Unsichtbare Zeichen: eigene Datei, damit Rückweg-Prüfung und Familienakte sie ohne die Maske übernehmen können (28.11.2026).
export { UNSICHTBAR, sauber } from "./zeichen.ts";
import { sauber } from "./zeichen.ts";

export const kennung = (i: number) => `D${String(i + 1).padStart(2, "0")}`;

export type Korrektur = { verdecken: string[]; bleibt: string[] };

const listeAus = (s: string) => s.split(/\n+/).map((w) => w.trim()).filter(Boolean);
export const korrekturAusText = (verdecken: string, bleibt: string): Korrektur => ({ verdecken: listeAus(verdecken), bleibt: listeAus(bleibt) });

/** Alle Texte eines Auftrags pseudonymisieren. Zwei Durchgänge: im ersten sammelt sich die Zuordnung über alle Dateien, im
 *  zweiten wird jede Datei mit der vollen Zuordnung neu gefasst – ein Name, der erst in Datei 5 erkannt wird, ist dann auch in
 *  Datei 1 verdeckt, mit demselben Platzhalter. */
export function auftragMaskieren(p: Pseudonymisierer, stuecke: Stueck[], korr: Korrektur, vorher: Record<string, string> = {}): { stuecke: Stueck[]; map: Record<string, string> } {
  stuecke = stuecke.map((s) => ({ ...s, text: sauber(s.text) }));
  const zusatz = [...new Set(stuecke.flatMap((s) => zusatzFunde(s.text)))];
  const profil: MaskeProfil = { personen: [...korr.verdecken, ...zusatz], stellen: [], nieVerdecken: korr.bleibt };
  let map: Record<string, string> = { ...vorher };
  for (const s of stuecke) if (s.text.trim()) map = maskieren(p, s.text, profil, map).map;
  // „darf bleiben“ wirkt auch auf schon vergebene Platzhalter
  const bleibt = new Set(korr.bleibt.map((w) => w.toLowerCase()));
  for (const [tok, wert] of Object.entries(map)) if (bleibt.has(wert.toLowerCase())) delete map[tok];
  const fertig = stuecke.map((s) => {
    if (!s.text.trim()) return { ...s, fassung: "", funde: 0, unsicher: [], leck: null, schon: false };
    const r = maskieren(p, s.text, profil, map);
    map = r.map;
    return { ...s, fassung: r.text, funde: platzhalterZahl(r.text), unsicher: r.unsicher, leck: r.leck, schon: r.schonPseudonymisiert };
  });
  return { stuecke: fertig, map };
}

/** Lücken der Maske (Fund 14.11.: „Telefon 0170 1234567.“ – der Satzpunkt danach verhindert den Treffer in den
 *  Familien-Mustern). Bis Modul 25 Gen. 3 das kann, ergänzt der Pseudonymisierer diese Werte als „immer verdecken“. */
export function zusatzFunde(text: string): string[] {
  const aus: string[] = [];
  for (const m of text.matchAll(/(?<![\d.,])(?:\+\d{2}\s?(?:\(0\))?\s?|0)\d{2,4}(?:[ /-]?\d{2,}){1,3}(?=\.(?:\s|$)|[^\d.,]|$)/g)) {
    const v = m[0].trim();
    if (v.replace(/\D/g, "").length >= 7) aus.push(v);
  }
  return aus;
}

const TOKEN = /⟦[A-Z][A-Z0-9_]*-\d+⟧/g;

/** Wie viele Platzhalter stehen in einer Fassung (Anzeige „N verdeckt“). */
export const platzhalterZahl = (fassung: string) => new Set(fassung.match(TOKEN) || []).size;

// ── Auftrag an die KI ─────────────────────────────────────────────────────────────────────────────────────────────────
export const STILE = [
  { id: "formell", name: "formell", satz: "formell und sachlich" },
  { id: "freundlich", name: "freundlich", satz: "freundlich und zugewandt" },
  { id: "bestimmt", name: "bestimmt", satz: "bestimmt und klar in der Sache, ohne unhöflich zu sein" },
  { id: "kurz", name: "kürzer", satz: "kurz – nur das Nötige" },
  { id: "ausfuehrlich", name: "ausführlicher", satz: "ausführlich, mit Begründung" },
  { id: "einfach", name: "einfache Sprache", satz: "in einfacher Sprache, kurze Sätze" },
] as const;
export type StilId = (typeof STILE)[number]["id"];

export const ZIELE = [
  { id: "antwort", name: "Antwortbrief schreiben", satz: "Schreibe einen Antwortbrief auf das Schreiben, das als „Brief“ markiert ist. Stütze dich auf die übrigen Dateien (Verträge, AGB, Vereinbarungen) und nenne die Stelle (Datei und Abschnitt), auf die du dich beziehst." },
  { id: "pruefen", name: "Prüfen", satz: "Prüfe die Dateien: Welche Forderungen, Fristen und Pflichten stehen darin? Was davon ist strittig oder widerspricht sich? Nenne jeweils Datei und Stelle." },
  { id: "zusammenfassen", name: "Zusammenfassen", satz: "Fasse jede Datei kurz zusammen und danach alles zusammen: worum geht es, was ist zu tun, bis wann." },
  { id: "frei", name: "Eigener Auftrag", satz: "" },
] as const;
export type ZielId = (typeof ZIELE)[number]["id"];

export type AuftragWahl = { ziel: ZielId; stile: StilId[]; frei: string; brief?: string; auftragId?: string };

/** AUFTRAG.md – was die KI tun soll. Enthält keine Klarnamen (nur Kennungen D01 … und Platzhalter). */
export function auftragText(w: AuftragWahl, stuecke: Stueck[]): string {
  const ziel = ZIELE.find((z) => z.id === w.ziel) || ZIELE[0];
  const stil = STILE.filter((s) => w.stile.includes(s.id)).map((s) => s.satz);
  const liste = stuecke.filter((s) => !s.weglassen).map((s) => `- ${s.kennung}${s.kennung === w.brief ? " (Brief)" : ""}: ${artName(s.art)}${s.bild ? " · Bild mit schwarz abgedeckten Stellen" : ""}`);
  return [
    MARKE,
    w.auftragId ? AUFTRAG_KOPF(w.auftragId) : "",
    "# Auftrag",
    "",
    ziel.satz || "(siehe eigener Auftrag)",
    w.frei.trim() ? `\n${w.frei.trim()}` : "",
    stil.length ? `\nSchreibstil: ${stil.join("; ")}.` : "",
    "",
    "## Dateien",
    ...liste,
    "",
    "## Regeln für die Platzhalter",
    "- Die Dateien sind pseudonymisiert. Angaben in der Form ⟦TYP-n⟧ (z. B. ⟦NAME-1⟧, ⟦IBAN-1⟧) stehen für echte Angaben.",
    "- Übernimm jeden Platzhalter genau so, wie er dasteht – Zeichen für Zeichen, mit den Klammern ⟦ ⟧. Nicht übersetzen, nicht beugen, nicht erfinden.",
    "- Erfinde keine Namen, Anschriften oder Nummern. Wo eine Angabe fehlt, schreibe einen Platzhalter in eckigen Klammern, z. B. [Datum einsetzen].",
    "- Schwarz abgedeckte Stellen in Bildern sind absichtlich verdeckt; rate nicht, was darunter steht.",
    "- Antworte als Text (Markdown). Wenn du eine Datei zurückgibst, nenne sie „antwort.md“ oder „D01-antwort.md“.",
    w.auftragId ? `- Schreibe in die erste Zeile deiner Antwort: ${AUFTRAG_KOPF(w.auftragId)}` : "",
    "",
  ].filter((z) => z !== "").join("\n").replace(/\n(## )/g, "\n\n$1") + "\n";
}

export const artName = (a: StueckArt) => ({ text: "Text", pdf: "PDF", scan: "Scan (Texterkennung)", bild: "Bild", mail: "E-Mail", office: "Office-Dokument", unbekannt: "Datei" })[a];

/** Eine Datei für die KI: Auftrag und alle Fassungen hintereinander (zum Hochladen oder Einfügen in ChatGPT/Claude). */
export function allesInEinerDatei(w: AuftragWahl, stuecke: Stueck[]): string {
  const teile = stuecke.filter((s) => !s.weglassen && s.fassung).map((s) => `\n\n---\n\n## ${s.kennung} · ${artName(s.art)}\n\n${ohneMarke(s.fassung)}`);
  return auftragText(w, stuecke) + teile.join("");
}

const ohneMarke = (t: string) => t.replace(/^⟦PSEUDONYMISIERT[^⟧]*⟧\n?/, "");

/** Dateien für den Ordner 2-Fuer-die-KI (Text). Bilder kommen als PNG dazu (im Browser gezeichnet). Keine Klarnamen,
 *  keine echten Dateinamen, keine Zuordnung. */
export function kiDateien(w: AuftragWahl, stuecke: Stueck[]): Array<{ name: string; text: string }> {
  const aus = [
    { name: "AUFTRAG.md", text: auftragText(w, stuecke) },
    { name: "ALLES-IN-EINER-DATEI.md", text: allesInEinerDatei(w, stuecke) },
    { name: "LIES-MICH.txt", text: LIES_MICH },
    { name: "inhalt.json", text: JSON.stringify({ marke: MARKE, dateien: stuecke.filter((s) => !s.weglassen).map((s) => ({ kennung: s.kennung, art: s.art, platzhalter: platzhalterZahl(s.fassung), bild: !!s.bild })) }, null, 1) + "\n" },
  ];
  for (const s of stuecke) if (!s.weglassen && s.fassung) aus.push({ name: `${s.kennung}.txt`, text: s.fassung });
  return aus;
}

export const LIES_MICH = `${MARKE}
Diese Dateien sind pseudonymisiert. Namen, Anschriften, Nummern und andere persönliche Angaben sind durch Platzhalter
wie ⟦NAME-1⟧ ersetzt, in Bildern schwarz abgedeckt. Die Zuordnung (welcher Platzhalter wofür steht) bleibt auf dem Gerät,
auf dem pseudonymisiert wurde – sie liegt nicht in diesem Ordner.

So geht es weiter:
1. ALLES-IN-EINER-DATEI.md in die KI hochladen (oder einfügen) – oder AUFTRAG.md und die Dateien D01 … einzeln.
2. Die Antwort der KI als Datei in den Ordner 3-Antworten-der-KI legen (oder in der App einfügen).
3. In der App „Zurückführen“ – die echten Angaben kommen wieder hinein, das Ergebnis liegt in 4-Zurueckgefuehrt.

Pseudonymisiert ist nicht anonym: mit der Zuordnung lassen sich die Angaben wiederherstellen (DSGVO Art. 4 Nr. 5).
`;

// ── Rückweg ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export type Zurueck = { name: string; text: string; offen: string[]; ersetzt: number };

/** Antworten der KI zurückführen. Unbekannte Platzhalter (die KI hat einen erfunden oder verändert) werden gemeldet. */
export function antwortenZurueck(p: Pseudonymisierer, antworten: Array<{ name: string; text: string }>, map: Record<string, string>): Zurueck[] {
  return antworten.map((a) => {
    const vorher = new Set(a.text.match(TOKEN) || []);
    const r = zurueckfuehren(p, a.text.replace(/^\s*⟦AUFTRAG [^⟧]*⟧[ \t]*\r?\n?/m, ""), map);
    return { name: zurueckName(a.name), text: r.text, offen: r.offen, ersetzt: [...vorher].filter((t) => !r.offen.includes(t)).length };
  });
}

export const zurueckName = (n: string) => n.replace(/\.(md|txt|markdown)$/i, "") + " (zurückgeführt).md";

/** Ein Auftrag erkennt sich an der Kennung im Kopf der Antwort, falls die KI sie mitgibt. */
export const AUFTRAG_KOPF = (id: string) => `⟦AUFTRAG ${id}⟧`;
export const auftragAusText = (t: string) => t.match(/⟦AUFTRAG ([0-9a-z-]{6,40})⟧/)?.[1] || null;

// ── Bilder: welche erkannten Wörter abgedeckt werden ─────────────────────────────────────────────────────────────────
export type Wort = { text: string; x0: number; y0: number; x1: number; y1: number };
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]/gu, "");

/** Stellen eines Bildes, an denen ein verdeckter Wert steht (Werte aus der Zuordnung des Auftrags). Folgen von bis zu acht
 *  Wörtern werden zusammengesetzt verglichen – Texterkennung trennt „DE89 3704 …“ anders als der Text. Rückgabe in Pixeln. */
export function stellenImBild(woerter: Wort[], werte: string[]): Array<{ x: number; y: number; w: number; h: number; wert: string }> {
  const ziele = [...new Set(werte.map(norm).filter((w) => w.length >= 3))];
  const nw = woerter.map((w) => norm(w.text));
  const aus: Array<{ x: number; y: number; w: number; h: number; wert: string }> = [];
  const belegt = new Set<number>();
  for (let i = 0; i < woerter.length; i++) {
    if (!nw[i] || belegt.has(i)) continue;
    let kette = "";
    for (let j = i; j < Math.min(woerter.length, i + 8); j++) {
      kette += nw[j];
      if (!kette) continue;
      const treffer = ziele.find((z) => z === kette || (j === i && kette.length >= 4 && z.length >= 4 && (kette.includes(z) || (z.includes(kette) && kette.length >= 5))));
      if (treffer) {
        const teil = woerter.slice(i, j + 1);
        const x0 = Math.min(...teil.map((t) => t.x0)), y0 = Math.min(...teil.map((t) => t.y0)), x1 = Math.max(...teil.map((t) => t.x1)), y1 = Math.max(...teil.map((t) => t.y1));
        const rand = Math.max(2, Math.round((y1 - y0) * 0.15));
        aus.push({ x: x0 - rand, y: y0 - rand, w: x1 - x0 + 2 * rand, h: y1 - y0 + 2 * rand, wert: treffer });
        for (let k = i; k <= j; k++) belegt.add(k);
        break;
      }
      if (!ziele.some((z) => z.startsWith(kette))) break;
    }
  }
  return aus;
}

/** Kennzeichen in erkannten Wörtern (z. B. „KN-AB 123“), auch ohne Zuordnung – Verkehrsunfall, Parkplatz. */
export function kennzeichenImBild(woerter: Wort[]): Array<{ x: number; y: number; w: number; h: number }> {
  const aus: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (let i = 0; i < woerter.length; i++) {
    for (let n = 1; n <= 3 && i + n <= woerter.length; n++) {
      const teil = woerter.slice(i, i + n);
      const t = teil.map((w) => w.text).join(" ").trim();
      if (/^[A-ZÄÖÜ]{1,3}[-\s:•·][A-Z]{1,2}\s?\d{1,4}[EH]?$/.test(t) && /\d/.test(t) && /[A-Z]/.test(t)) {
        const x0 = Math.min(...teil.map((w) => w.x0)), y0 = Math.min(...teil.map((w) => w.y0)), x1 = Math.max(...teil.map((w) => w.x1)), y1 = Math.max(...teil.map((w) => w.y1));
        const r = Math.round((y1 - y0) * 0.35);
        aus.push({ x: x0 - r, y: y0 - r, w: x1 - x0 + 2 * r, h: y1 - y0 + 2 * r });
        i += n - 1; break;
      }
    }
  }
  return aus;
}
