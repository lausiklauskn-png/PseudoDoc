// Dateien eines Auftrags lesen: Text, PDF (Textebene; Scan → Seiten als Bilder mit Texterkennung), Foto (Texterkennung mit
// Lage der Wörter), E-Mail .eml samt Anhängen, Word/OpenDocument, Excel/PowerPoint (Prüfkern). Bausteine aus dem
// Datei-Organizer (lib/eml.ts, lib/zip.ts, lib/pdf-text.ts, Prüfkern und Tesseract in vendor/ mit Pin). Alles auf dem Gerät.
import { erkenneArt } from "../lib/bausteine/dateiart.ts";
import { leseEml } from "../lib/bausteine/eml.ts";
import { officeText } from "../lib/bausteine/zip.ts";
import { pdfTextLesen } from "../lib/bausteine/pdf-text.ts";
import { pruefen, WARNUNG } from "./pruefkern.ts";
import type { Stueck, StueckArt, Wort } from "../lib/pseudo/auftrag.ts";
import { bildLesen, groesse } from "./bild.ts";

export type Eingang = { pfad: string; name: string; bytes: Uint8Array };

/** Systemdateien und Synchronisierungsreste (Windows, OneDrive, macOS, Office-Sperrdateien). */
export const ueberspringen = (name: string) => /^(desktop\.ini|thumbs\.db|\.ds_store|icon\r?)$/i.test(name) || name.startsWith(".") || name.startsWith("~$");

/** Prüfkern: Warnungen (versteckte KI-Anweisung, unsichtbarer Text, Makro …) an das Stück hängen. Fehlt der Kern, bleibt es still. */
async function mitPruefung(g: Gelesen[], e: Eingang, art: string): Promise<Gelesen[]> {
  if (!g.length || !/^(pdf|office|text|html|svg)$/.test(art)) return g;
  try {
    const r = await pruefen(e.name, e.bytes, art);
    const warnung = [...new Set(r.befunde.filter((b) => WARNUNG.test(b.kennung)).map((b) => b.satz))];
    if (warnung.length) g[0] = { ...g[0], stueck: { ...g[0].stueck, warnung } };
  } catch { /* ungeprüft – der Text geht trotzdem durch die Maske */ }
  return g;
}
/** Ein gelesenes Stück mit allem, was nur in dieser Sitzung im Speicher bleibt. */
export type Gelesen = { stueck: Omit<Stueck, "kennung">; original: Eingang | null; bild?: Blob; woerter?: Wort[] };

export const SCAN_SEITEN = 20;
const MAX_BYTES = 60 * 1024 * 1024;

export type PdfDoc = { numPages: number; getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> } }>; destroy: () => Promise<void> };
type PdfJs = { getDocument: (o: Record<string, unknown>) => { promise: Promise<PdfDoc> } };
let pdfjsBereit: Promise<PdfJs> | null = null;
export async function pdfjs(): Promise<PdfJs> {
  if (!pdfjsBereit) pdfjsBereit = (async () => {
    const [p, w] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]);
    p.GlobalWorkerOptions.workerSrc = w.default;
    return p as unknown as PdfJs;
  })();
  return pdfjsBereit;
}

async function seitenBilder(bytes: Uint8Array, max: number): Promise<{ bilder: Blob[]; seiten: number }> {
  const doc = await (await pdfjs()).getDocument({ data: bytes.slice(), isEvalSupported: false, verbosity: 0 }).promise;
  try {
    const bilder: Blob[] = [];
    for (let n = 1; n <= Math.min(doc.numPages, max); n++) {
      const s = await doc.getPage(n); const vp = s.getViewport({ scale: 2 });
      const c = document.createElement("canvas"); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      const ctx = c.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      await s.render({ canvasContext: ctx, viewport: vp }).promise;
      const b = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/png"));
      if (b) bilder.push(b);
    }
    return { bilder, seiten: doc.numPages };
  } finally { await doc.destroy(); }
}

const leer = (art: StueckArt, pfad: string, text: string, hinweis?: string): Omit<Stueck, "kennung"> => ({ pfad, art, text, fassung: "", funde: 0, unsicher: [], leck: null, schon: false, hinweis });
const woerterZahl = (t: string) => (t.match(/[A-Za-zÄÖÜäöüß]{3,}/g) || []).length;

async function bildStueck(pfad: string, b: Blob, original: Eingang | null, art: StueckArt = "bild", hinweis?: string): Promise<Gelesen> {
  const g = await groesse(b);
  let text = "", woerter: Wort[] = [];
  try { const r = await bildLesen(b); woerter = r.woerter; if (woerterZahl(r.text) >= 4) text = r.text.trim(); } catch (e) { hinweis = `Texterkennung: ${(e as Error).message}`; }
  return { stueck: { ...leer(art, pfad, text, hinweis), bild: { ...g, flaechen: [] } }, original, bild: b, woerter };
}

/** Eine Datei lesen; E-Mail-Anhänge und Scan-Seiten werden zu eigenen Stücken. `melde` zeigt den Fortschritt. */
export async function lesen(e: Eingang, melde: (s: string) => void, tiefe = 0): Promise<Gelesen[]> {
  const art = erkenneArt(e.name, e.bytes.slice(0, 600)).art || "";
  return mitPruefung(await lesenRoh(e, melde, tiefe), e, /\.html?$/i.test(e.name) ? "html" : art);
}

async function lesenRoh(e: Eingang, melde: (s: string) => void, tiefe: number): Promise<Gelesen[]> {
  if (ueberspringen(e.name)) return [];
  if (e.bytes.length > MAX_BYTES) return [{ stueck: leer("unbekannt", e.pfad, "", "zu groß zum Lesen (über 60 MB) – bleibt draußen"), original: e }];
  const art = erkenneArt(e.name, e.bytes.slice(0, 600)).art;
  const mime = /\.png$/i.test(e.name) ? "image/png" : /\.webp$/i.test(e.name) ? "image/webp" : "image/jpeg";
  try {
    if (art === "text" || /\.(txt|md|csv|json|html?|xml)$/i.test(e.name)) {
      let t = new TextDecoder("utf-8").decode(e.bytes);
      if (/\.html?$/i.test(e.name)) t = t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>|<\/p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
      return [{ stueck: leer("text", e.pfad, t), original: e }];
    }
    if (art === "pdf") {
      melde(`PDF lesen: ${e.name}`);
      const t = await pdfTextLesen((await pdfjs()) as unknown as Parameters<typeof pdfTextLesen>[0], e.bytes);
      if (woerterZahl(t.voll) >= 4) return [{ stueck: leer("pdf", e.pfad, t.voll), original: e }];
      melde(`Scan erkannt – Seiten als Bilder: ${e.name}`);
      const { bilder, seiten } = await seitenBilder(e.bytes, SCAN_SEITEN);
      const aus: Gelesen[] = [];
      for (let i = 0; i < bilder.length; i++) {
        melde(`Texterkennung ${e.name}, Seite ${i + 1} von ${bilder.length}`);
        aus.push(await bildStueck(`${e.pfad} › Seite ${i + 1}`, bilder[i], i === 0 ? e : null, "scan", seiten > SCAN_SEITEN && i === 0 ? `nur die ersten ${SCAN_SEITEN} von ${seiten} Seiten` : undefined));
      }
      return aus;
    }
    if (art === "bild") {
      melde(`Texterkennung: ${e.name}`);
      return [await bildStueck(e.pfad, new Blob([e.bytes as BlobPart], { type: mime }), e)];
    }
    if (art === "email" && /\.eml$/i.test(e.name)) {
      const m = leseEml(new TextDecoder("utf-8").decode(e.bytes));
      const kopf = [m.meta.von && `Von: ${m.meta.von}`, m.meta.an && `An: ${m.meta.an}`, m.meta.datum && `Datum: ${m.meta.datum}`, m.meta.betreff && `Betreff: ${m.meta.betreff}`].filter(Boolean).join("\n");
      const aus: Gelesen[] = [{ stueck: leer("mail", e.pfad, `${kopf}\n\n${m.text}`.trim(), m.anhaenge.length ? `${m.anhaenge.length} Anhang/Anhänge als eigene Dateien` : undefined), original: e }];
      if (tiefe < 3) for (const a of m.anhaenge) aus.push(...await lesen({ pfad: `${e.pfad} › ${a.name}`, name: a.name, bytes: a.daten }, melde, tiefe + 1).then((l) => l.map((g) => ({ ...g, original: null }))));
      return aus;
    }
    if (art === "office") {
      let t = /\.(docx|odt)$/i.test(e.name) ? await officeText(e.bytes, e.name) : "";
      if (!t.trim()) { const k = await pruefen(e.name, e.bytes, "office").catch(() => null); t = k?.text || ""; }
      return [{ stueck: leer("office", e.pfad, t, t.trim() ? undefined : "kein Text lesbar – bleibt draußen"), original: e }];
    }
  } catch (err) {
    return [{ stueck: leer("unbekannt", e.pfad, "", `nicht lesbar: ${(err as Error).message}`), original: e }];
  }
  return [{ stueck: leer("unbekannt", e.pfad, "", "Dateiart wird nicht gelesen – bleibt draußen"), original: e }];
}
