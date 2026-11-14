// Bilder im Pseudonymisierer: Texterkennung MIT Lage der Wörter (für Vorschläge zum Abdecken), Zeichnen der schwarzen
// Flächen (neues PNG ohne Metadaten – das Original bleibt unverändert) und Zurückführen eines Bildes, das von der KI kommt:
// die abgedeckten Stellen werden aus dem Original wieder eingesetzt. Alles auf dem Gerät; Tesseract liegt in vendor/ (Pin).
import type { Wort } from "../lib/pseudo/auftrag.ts";
import type { Flaeche } from "../lib/pseudo/flaechen.ts";

type TessWort = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } };
type TessErgebnis = { data: { text: string; words?: TessWort[]; blocks?: Array<{ paragraphs: Array<{ lines: Array<{ words: TessWort[] }> }> }> | null } };
type TessWorker = { recognize: (b: Blob, o?: object, aus?: object) => Promise<TessErgebnis> };
type Welt = typeof globalThis & { Tesseract?: { createWorker: (s: string, o: number, x: object) => Promise<TessWorker> } };
const welt = globalThis as Welt;
const basis = () => new URL("vendor/", document.baseURI).href;

let skript: Promise<void> | null = null;
let arbeiter: Promise<TessWorker> | null = null;
function tesseract(): Promise<TessWorker> {
  if (!skript) skript = new Promise((ok, nein) => { const s = document.createElement("script"); s.src = basis() + "tesseract/tesseract.min.js"; s.onload = () => ok(); s.onerror = () => { skript = null; nein(new Error("Texterkennung nicht geladen")); }; document.head.appendChild(s); });
  if (!arbeiter) arbeiter = skript.then(() => welt.Tesseract!.createWorker("deu", 1, { workerPath: basis() + "tesseract/worker.min.js", corePath: basis() + "tesseract/", langPath: basis() + "tesseract/lang", gzip: false, cacheMethod: "none" }));
  arbeiter.catch(() => { arbeiter = null; });
  return arbeiter;
}

/** Text und Wörter mit Lage (Pixel des Bildes). */
export async function bildLesen(b: Blob): Promise<{ text: string; woerter: Wort[] }> {
  const w = await tesseract();
  const frist = new Promise<never>((_, nein) => setTimeout(() => nein(new Error("Texterkennung dauerte zu lange")), 90000));
  const r = await Promise.race([w.recognize(b, {}, { text: true, blocks: true }), frist]);
  const roh: TessWort[] = r.data.words?.length ? r.data.words : (r.data.blocks || []).flatMap((bl) => bl.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)));
  return { text: r.data.text || "", woerter: roh.filter((x) => x.text?.trim()).map((x) => ({ text: x.text, x0: x.bbox.x0, y0: x.bbox.y0, x1: x.bbox.x1, y1: x.bbox.y1 })) };
}

/** Gesichter, wenn der Browser das kann (Chrome mit „Shape Detection“). Sonst leer – dann deckt man selbst ab. */
export async function gesichter(b: Blob): Promise<Array<{ x: number; y: number; w: number; h: number }>> {
  const FD = (globalThis as unknown as { FaceDetector?: new (o: object) => { detect: (i: ImageBitmap) => Promise<Array<{ boundingBox: DOMRectReadOnly }>> } }).FaceDetector;
  if (!FD) return [];
  try {
    const bm = await createImageBitmap(b);
    const f = await new FD({ fastMode: false, maxDetectedFaces: 20 }).detect(bm);
    return f.map((x) => { const r = x.boundingBox; const rand = r.width * 0.15; return { x: r.x - rand, y: r.y - rand * 1.5, w: r.width + 2 * rand, h: r.height + 3 * rand }; });
  } catch { return []; }
}
export const gesichterMoeglich = () => "FaceDetector" in globalThis;

export function pfad(ctx: CanvasRenderingContext2D, f: Flaeche, W: number, H: number) {
  ctx.beginPath();
  if (f.art === "rechteck") ctx.rect(f.x * W, f.y * H, f.w * W, f.h * H);
  else if (f.art === "ellipse") ctx.ellipse((f.x + f.w / 2) * W, (f.y + f.h / 2) * H, Math.abs(f.w / 2) * W, Math.abs(f.h / 2) * H, 0, 0, Math.PI * 2);
  else f.punkte.forEach(([u, v], i) => (i ? ctx.lineTo(u * W, v * H) : ctx.moveTo(u * W, v * H)));
  ctx.closePath();
}

const zuBlob = (c: HTMLCanvasElement) => new Promise<Blob>((ok, nein) => c.toBlob((b) => (b ? ok(b) : nein(new Error("Bild nicht erzeugt"))), "image/png"));

/** Abgedecktes Bild: Original zeichnen, Flächen 100 % schwarz darüber, als neues PNG (keine Metadaten, kein Ort). */
export async function abgedeckt(original: Blob, flaechen: Flaeche[]): Promise<Blob> {
  const bm = await createImageBitmap(original);
  const c = document.createElement("canvas"); c.width = bm.width; c.height = bm.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bm, 0, 0);
  ctx.fillStyle = "#000";
  for (const f of flaechen) { pfad(ctx, f, c.width, c.height); ctx.fill(); }
  return zuBlob(c);
}

/** Bild von der KI zurück: auf die Größe des Originals bringen und an den abgedeckten Stellen das Original wieder einsetzen. */
export async function bildZurueck(original: Blob, vonKi: Blob, flaechen: Flaeche[]): Promise<Blob> {
  const o = await createImageBitmap(original), k = await createImageBitmap(vonKi);
  const c = document.createElement("canvas"); c.width = o.width; c.height = o.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(k, 0, 0, o.width, o.height);
  for (const f of flaechen) { ctx.save(); pfad(ctx, f, c.width, c.height); ctx.clip(); ctx.drawImage(o, 0, 0); ctx.restore(); }
  return zuBlob(c);
}

/** Bildgröße ohne alles zu laden. */
export async function groesse(b: Blob): Promise<{ breite: number; hoehe: number }> { const bm = await createImageBitmap(b); const r = { breite: bm.width, hoehe: bm.height }; bm.close(); return r; }
