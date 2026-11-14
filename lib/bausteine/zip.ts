/**
 * Kleinster ZIP-Leser für Office-Dokumente (.docx/.odt): sucht einen Eintrag und entpackt ihn
 * (DecompressionStream „deflate-raw“ gibt es im Browser und in Node 22). Nur lesen, Größe begrenzt.
 */
const MAX = 20 * 1024 * 1024;

export async function zipEintrag(b: Uint8Array, gesucht: string): Promise<Uint8Array | null> {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  // Ende des zentralen Verzeichnisses suchen
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return null;
  const anzahl = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  for (let n = 0; n < anzahl && p + 46 <= b.length; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) return null;
    const art = dv.getUint16(p + 10, true);
    const gepackt = dv.getUint32(p + 20, true), voll = dv.getUint32(p + 24, true);
    const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), kl = dv.getUint16(p + 32, true);
    const lokal = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(b.slice(p + 46, p + 46 + nl));
    if (name === gesucht) {
      if (voll > MAX) return null;
      const lnl = dv.getUint16(lokal + 26, true), lel = dv.getUint16(lokal + 28, true);
      const start = lokal + 30 + lnl + lel;
      const roh = b.slice(start, start + gepackt);
      if (art === 0) return roh;
      if (art !== 8) return null;
      const strom = new Blob([roh]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Uint8Array(await new Response(strom).arrayBuffer());
    }
    p += 46 + nl + el + kl;
  }
  return null;
}

/** Text eines Word-Dokuments (.docx) oder OpenDocument-Textes (.odt). */
export async function officeText(b: Uint8Array, name: string): Promise<string> {
  const istOdt = /\.odt$/i.test(name);
  const xml = await zipEintrag(b, istOdt ? "content.xml" : "word/document.xml");
  if (!xml) return "";
  const s = new TextDecoder().decode(xml);
  return s.replace(/<\/w:p>|<\/text:p>|<text:line-break\/>|<w:br\/>/g, "\n").replace(/<w:tab\/>/g, "\t").replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n").trim();
}
