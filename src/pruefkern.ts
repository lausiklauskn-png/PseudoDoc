// Prüfkern des Auslieferungsprüfers (byte-gleich mit Pin, src/public/vendor/pruefkern/): sieht, was eine Datei verbirgt –
// versteckte Anweisungen an eine KI, unsichtbarer Text, Makros, getarnte Programme, Metadaten. Läuft auf dem Gerät, kein Netz.
// Muster wie im Datei-Organizer (src/vendor.ts): PDF über PrueferFormate.pruefePdf, Office/Text/HTML/SVG über PrueferAnhang.pruefe.
export type Befund = { kennung: string; satz: string };
type PF = { pruefePdf: (b: Uint8Array, erlaubt: string[]) => Promise<{ stellen: Array<{ kennung: string; satz: string }> }> };
type PA = { pruefe: (name: string, b: Uint8Array) => Promise<{ befunde: Befund[]; text: string | null }> };
type Welt = typeof globalThis & { PrueferFormate?: PF; PrueferAnhang?: PA };
const welt = globalThis as Welt;
const basis = () => new URL("vendor/", document.baseURI).href;

const geladen = new Map<string, Promise<void>>();
function skript(rel: string): Promise<void> {
  if (!geladen.has(rel)) geladen.set(rel, new Promise((ok, nein) => {
    const s = document.createElement("script"); s.src = basis() + rel;
    s.onload = () => ok(); s.onerror = () => { geladen.delete(rel); nein(new Error(`${rel} nicht geladen`)); };
    document.head.appendChild(s);
  }));
  return geladen.get(rel)!;
}

/** Was täuschen soll – wird rot gezeigt. Alles andere (Metadaten, Herkunft …) ist ein Hinweis. */
export const WARNUNG = /KI-ANWEISUNG|VERSTECKTER-TEXT|UNSICHTBARE-ZEICHEN|ANHANG-PROGRAMM|ANHANG-TARNUNG|OFFICE-MAKRO|SVG-SKRIPT|BILD-LSB-VERDACHT/;
/** Was ohnehin nicht mit hinausgeht (PseudoDoc gibt nur Text und neu gezeichnete Bilder aus). */
export const BLEIBT_DRIN = /METADATEN|HERKUNFT|ANHAENGSEL|ALTFASSUNG|PDF-ANHANG|EINBETTUNG/;

export async function pruefen(name: string, bytes: Uint8Array, art: string): Promise<{ befunde: Befund[]; text?: string | null }> {
  await skript("pruefkern/pruefer-formate.js");
  if (art === "pdf") {
    const r = await welt.PrueferFormate!.pruefePdf(bytes, []);
    return { befunde: r.stellen.map((x) => ({ kennung: x.kennung, satz: x.satz.replace(/ \([^()]*\)$/, "") })) };
  }
  await skript("pruefkern/pruefer-mail.js");
  await skript("pruefkern/pruefer-anhang.js");
  const r = await welt.PrueferAnhang!.pruefe(name, bytes);
  return { befunde: r.befunde.map((x) => ({ kennung: x.kennung, satz: x.satz })), text: r.text };
}
