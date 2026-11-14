/**
 * PDF-Text mit pdf.js: Kopf = obere Hälfte der ersten Seite (Sieb 2–4 lesen nur ihn; beim DIN-Brief steht der Betreff knapp unter dem oberen Drittel), voll = alle Seiten (höchstens 30).
 * Zeilen werden aus den Textstücken nach ihrer Höhe auf der Seite gebildet. Läuft im Browser und in Node (Proben).
 */
type TextStueck = { str: string; transform: number[] };
type PdfJs = {
  getDocument: (o: Record<string, unknown>) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { height: number }; getTextContent: () => Promise<{ items: unknown[] }> }> ; destroy: () => Promise<void> }> };
};

const MAX_SEITEN = 30;

export function zeilenAus(items: TextStueck[]): Array<{ y: number; text: string }> {
  const zeilen = new Map<number, Array<{ x: number; s: string }>>();
  for (const it of items) {
    if (!it.str) continue;
    const y = Math.round(it.transform[5] / 3) * 3;
    const liste = zeilen.get(y) || [];
    liste.push({ x: it.transform[4], s: it.str });
    zeilen.set(y, liste);
  }
  return [...zeilen.entries()].sort((a, b) => b[0] - a[0]).map(([y, teile]) => ({ y, text: teile.sort((a, b) => a.x - b.x).map((t) => t.s).join(" ").replace(/\s+/g, " ").trim() })).filter((z) => z.text);
}

export async function pdfTextLesen(pdfjs: PdfJs, bytes: Uint8Array): Promise<{ kopf: string; voll: string }> {
  const doc = await pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false, verbosity: 0, disableFontFace: true, useSystemFonts: false }).promise;
  try {
    const seiten: string[] = [];
    let kopf = "";
    for (let n = 1; n <= Math.min(doc.numPages, MAX_SEITEN); n++) {
      const seite = await doc.getPage(n);
      const hoehe = seite.getViewport({ scale: 1 }).height;
      const inhalt = await seite.getTextContent();
      const zeilen = zeilenAus(inhalt.items as TextStueck[]);
      if (n === 1) kopf = zeilen.filter((z) => z.y >= hoehe * 0.5).map((z) => z.text).join("\n") || zeilen.slice(0, 25).map((z) => z.text).join("\n");
      seiten.push(zeilen.map((z) => z.text).join("\n"));
    }
    return { kopf, voll: seiten.join("\n\n") };
  } finally { await doc.destroy(); }
}
