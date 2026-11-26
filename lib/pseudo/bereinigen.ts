// „Raus“: bereinigte Kopie (Klaus 26.11.2026). Reine Rechnung, ohne Browser – das Original wird nie verändert.
// Office (docx/xlsx/pptx/odt/ods/odp): Autor, Bearbeiter, Firma, Vorgesetzter aus den Dokument-Eigenschaften leeren;
// Kommentare, Änderungsverfolgung, versteckter Text und versteckte Folien/Blätter werden gemeldet (nicht still entfernt).
// PDF: aus Seitenbildern neu zusammengesetzt (keine Dokument-Infos, kein XMP, kein versteckter Text – auch kein markierbarer).
import { zipBauen } from "./pakete.ts";
import type { Punkt } from "./rueckweg.ts";

const MAX = 60 * 1024 * 1024;
const dec = new TextDecoder(), enc = new TextEncoder();

export type ZipTeil = { name: string; daten: Uint8Array };

/** Alle Einträge eines ZIP lesen (gespeichert oder deflate). null, wenn es kein lesbares ZIP ist. */
export async function zipLesen(b: Uint8Array): Promise<ZipTeil[] | null> {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return null;
  const anzahl = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true), summe = 0;
  const aus: ZipTeil[] = [];
  for (let n = 0; n < anzahl; n++) {
    if (p + 46 > b.length || dv.getUint32(p, true) !== 0x02014b50) return null;
    const art = dv.getUint16(p + 10, true), gepackt = dv.getUint32(p + 20, true), voll = dv.getUint32(p + 24, true);
    const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), kl = dv.getUint16(p + 32, true), lokal = dv.getUint32(p + 42, true);
    const name = dec.decode(b.subarray(p + 46, p + 46 + nl));
    summe += voll; if (summe > MAX) return null;
    const start = lokal + 30 + dv.getUint16(lokal + 26, true) + dv.getUint16(lokal + 28, true);
    const roh = b.slice(start, start + gepackt);
    let daten: Uint8Array;
    if (art === 0) daten = roh;
    else if (art === 8) daten = new Uint8Array(await new Response(new Blob([roh as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
    else return null;
    aus.push({ name, daten });
    p += 46 + nl + el + kl;
  }
  return aus;
}

const leeren = (xml: string, tags: string[]) => tags.reduce((x, t) => x.replace(new RegExp(`(<${t}(?:\\s[^>]*)?>)[\\s\\S]*?(</${t}>)`, "g"), "$1$2"), xml);
const hatWert = (xml: string, t: string) => new RegExp(`<${t}(?:\\s[^>]*)?>\\s*[^<\\s][\\s\\S]*?</${t}>`).test(xml);
const zahl = (xml: string, re: RegExp) => (xml.match(re) || []).length;

const KERN = ["dc:creator", "cp:lastModifiedBy", "cp:lastPrinted"];
const APP = ["Company", "Manager"];
const ODF = ["meta:initial-creator", "dc:creator", "meta:printed-by"];

/** Office-Datei bereinigen. Gibt die neue Datei und was gefunden/geändert wurde zurück. */
export async function officeBereinigen(b: Uint8Array): Promise<{ bytes: Uint8Array; punkte: Punkt[] } | null> {
  const teile = await zipLesen(b);
  if (!teile) return null;
  const punkte: Punkt[] = [];
  const geleert: string[] = [];
  const neu = teile.map((t) => {
    if (!/\.xml$/i.test(t.name)) return t;
    let x = dec.decode(t.daten); const vorher = x;
    if (t.name === "docProps/core.xml") { for (const k of KERN) if (hatWert(x, k)) geleert.push(k === "dc:creator" ? "Autor" : k === "cp:lastModifiedBy" ? "zuletzt bearbeitet von" : "zuletzt gedruckt"); x = leeren(x, KERN); }
    if (t.name === "docProps/app.xml") { for (const k of APP) if (hatWert(x, k)) geleert.push(k === "Company" ? "Firma" : "Vorgesetzter"); x = leeren(x, APP); }
    if (t.name === "meta.xml") { for (const k of ODF) if (hatWert(x, k)) geleert.push(k === "meta:printed-by" ? "gedruckt von" : "Autor"); x = leeren(x, ODF); }
    return x === vorher ? t : { name: t.name, daten: enc.encode(x) };
  });
  if (geleert.length) punkte.push({ stufe: "hinweis", kennung: "OFFICE-EIGENSCHAFTEN", satz: `In den Dokument-Eigenschaften standen: ${[...new Set(geleert)].join(", ")}. In der Kopie geleert.` });

  const text = (n: RegExp) => teile.filter((t) => n.test(t.name)).map((t) => dec.decode(t.daten)).join("\n");
  const kommentare = zahl(text(/^word\/comments\.xml$/), /<w:comment\b/g) + zahl(text(/^xl\/comments\d*\.xml$/), /<comment\b/g) + zahl(text(/^ppt\/comments\//), /<p:cm\b/g) + zahl(text(/^content\.xml$/), /<office:annotation\b/g);
  if (kommentare) punkte.push({ stufe: "achtung", kennung: "OFFICE-KOMMENTARE", satz: `${kommentare} ${kommentare === 1 ? "Kommentar" : "Kommentare"} im Dokument. Sie gehen mit hinaus – vor dem Weitergeben im Programm löschen.` });
  const word = text(/^word\/document\.xml$/);
  const aend = zahl(word, /<w:(?:ins|del)\b/g) + zahl(text(/^content\.xml$/), /<text:changed-region\b/g);
  if (aend) punkte.push({ stufe: "achtung", kennung: "OFFICE-AENDERUNGEN", satz: `Änderungsverfolgung ist aktiv (${aend} Stellen). Gelöschter Text steht noch in der Datei – vor dem Weitergeben alle Änderungen annehmen.` });
  if (/<w:vanish\s*\/>/.test(word)) punkte.push({ stufe: "achtung", kennung: "OFFICE-VERSTECKT", satz: "Im Dokument steht als „ausgeblendet“ formatierter Text. Er ist nicht zu sehen, geht aber mit hinaus." });
  const verstFolien = zahl(text(/^ppt\/slides\/slide\d+\.xml$/), /<p:sld\b[^>]*\bshow="0"/g);
  if (verstFolien) punkte.push({ stufe: "hinweis", kennung: "OFFICE-VERSTECKTE-FOLIEN", satz: `${verstFolien} ausgeblendete ${verstFolien === 1 ? "Folie" : "Folien"} gehen mit hinaus.` });
  const verstBlatt = zahl(text(/^xl\/workbook\.xml$/), /<sheet\b[^>]*\bstate="(?:hidden|veryHidden)"/g);
  if (verstBlatt) punkte.push({ stufe: "hinweis", kennung: "OFFICE-VERSTECKTE-BLAETTER", satz: `${verstBlatt} ausgeblendete ${verstBlatt === 1 ? "Tabellenblatt" : "Tabellenblätter"} gehen mit hinaus.` });

  // ODF: „mimetype“ muss als erster Eintrag ungepackt stehen – zipBauen behält die Reihenfolge und packt nie.
  return { bytes: zipBauen(neu.map((t) => ({ name: t.name, daten: t.daten }))), punkte };
}

/** PDF aus Seitenbildern (JPEG) neu bauen: keine Dokument-Infos, kein XMP, keine Ebenen, kein versteckter Text. */
export function pdfAusBildern(seiten: Array<{ jpeg: Uint8Array; breite: number; hoehe: number; punktBreite: number; punktHoehe: number }>): Uint8Array {
  const objekte: Uint8Array[] = [];
  const s = (t: string) => enc.encode(t);
  const n = seiten.length;
  const kinder = seiten.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  objekte[1] = s("<< /Type /Catalog /Pages 2 0 R >>");
  objekte[2] = s(`<< /Type /Pages /Kids [${kinder}] /Count ${n} >>`);
  seiten.forEach((sei, i) => {
    const seite = 3 + i * 3, inhalt = seite + 1, bild = seite + 2;
    const w = sei.punktBreite.toFixed(2), h = sei.punktHoehe.toFixed(2);
    objekte[seite] = s(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${bild} 0 R >> >> /Contents ${inhalt} 0 R >>`);
    const strom = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    objekte[inhalt] = s(`<< /Length ${strom.length} >>\nstream\n${strom}\nendstream`);
    const kopf = s(`<< /Type /XObject /Subtype /Image /Width ${sei.breite} /Height ${sei.hoehe} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${sei.jpeg.length} >>\nstream\n`);
    const fuss = s("\nendstream");
    const o = new Uint8Array(kopf.length + sei.jpeg.length + fuss.length); o.set(kopf); o.set(sei.jpeg, kopf.length); o.set(fuss, kopf.length + sei.jpeg.length);
    objekte[bild] = o;
  });
  const teile: Uint8Array[] = [s("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  const lagen: number[] = [];
  let lage = teile[0].length;
  for (let i = 1; i < objekte.length; i++) {
    lagen[i] = lage;
    const a = s(`${i} 0 obj\n`), e = s("\nendobj\n");
    teile.push(a, objekte[i], e); lage += a.length + objekte[i].length + e.length;
  }
  const xref = [`xref\n0 ${objekte.length}\n0000000000 65535 f \n`, ...lagen.slice(1).map((l) => `${String(l).padStart(10, "0")} 00000 n \n`)].join("");
  teile.push(s(`${xref}trailer\n<< /Size ${objekte.length} /Root 1 0 R >>\nstartxref\n${lage}\n%%EOF\n`));
  const aus = new Uint8Array(teile.reduce((a, t) => a + t.length, 0));
  let p = 0; for (const t of teile) { aus.set(t, p); p += t.length; }
  return aus;
}

/** Name der bereinigten Kopie: „Brief.docx“ → „Brief-bereinigt.docx“ (andere Endung, wenn sich die Art ändert). */
export const kopieName = (name: string, endung?: string) => {
  const m = name.match(/^(.*?)(\.[A-Za-z0-9]{1,6})?$/)!;
  return `${m[1] || "datei"}-bereinigt${endung ?? m[2] ?? ""}`;
};
