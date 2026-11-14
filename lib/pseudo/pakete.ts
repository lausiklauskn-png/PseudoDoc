// ZIP (nur „gespeichert“, ohne Packen) und Word-Datei (.docx) – klein, ohne fremde Bibliothek. Reine Rechnung.

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(b: Uint8Array): number { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

export type ZipDatei = { name: string; daten: Uint8Array | string };
const enc = new TextEncoder();

/** ZIP mit festem Datum (1.1.2026), damit derselbe Inhalt dieselben Bytes ergibt. */
export function zipBauen(dateien: ZipDatei[]): Uint8Array {
  const teile: Uint8Array[] = [], verz: Uint8Array[] = [];
  let lage = 0;
  const DOS_ZEIT = 0, DOS_DATUM = ((2026 - 1980) << 9) | (1 << 5) | 1;
  for (const d of dateien) {
    const name = enc.encode(d.name), daten = typeof d.daten === "string" ? enc.encode(d.daten) : d.daten, crc = crc32(daten);
    const k = new Uint8Array(30 + name.length), v = new DataView(k.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true);
    v.setUint16(10, DOS_ZEIT, true); v.setUint16(12, DOS_DATUM, true); v.setUint32(14, crc, true); v.setUint32(18, daten.length, true); v.setUint32(22, daten.length, true);
    v.setUint16(26, name.length, true); k.set(name, 30);
    const z = new Uint8Array(46 + name.length), w = new DataView(z.buffer);
    w.setUint32(0, 0x02014b50, true); w.setUint16(4, 20, true); w.setUint16(6, 20, true); w.setUint16(8, 0x0800, true); w.setUint16(10, 0, true);
    w.setUint16(12, DOS_ZEIT, true); w.setUint16(14, DOS_DATUM, true); w.setUint32(16, crc, true); w.setUint32(20, daten.length, true); w.setUint32(24, daten.length, true);
    w.setUint16(28, name.length, true); w.setUint32(42, lage, true); z.set(name, 46);
    teile.push(k, daten); verz.push(z); lage += k.length + daten.length;
  }
  const groesse = verz.reduce((a, z) => a + z.length, 0);
  const ende = new Uint8Array(22), e = new DataView(ende.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, dateien.length, true); e.setUint16(10, dateien.length, true); e.setUint32(12, groesse, true); e.setUint32(16, lage, true);
  const alles = [...teile, ...verz, ende];
  const aus = new Uint8Array(alles.reduce((a, t) => a + t.length, 0));
  let p = 0; for (const t of alles) { aus.set(t, p); p += t.length; }
  return aus;
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Text → Word-Datei. Absätze bleiben, „# Überschrift“ wird fett, **fett** bleibt fett. */
export function docxBauen(text: string): Uint8Array {
  const absaetze = text.replace(/\r/g, "").split("\n").map((zeile) => {
    const ueber = /^#{1,6}\s+/.test(zeile);
    const roh = zeile.replace(/^#{1,6}\s+/, "");
    const laeufe = roh.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((t) => {
      const fett = ueber || /^\*\*.*\*\*$/.test(t);
      return `<w:r>${fett ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${xml(t.replace(/^\*\*|\*\*$/g, ""))}</w:t></w:r>`;
    }).join("");
    return `<w:p>${laeufe}</w:p>`;
  }).join("");
  return zipBauen([
    { name: "[Content_Types].xml", daten: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>` },
    { name: "_rels/.rels", daten: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: "word/document.xml", daten: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${absaetze}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1134" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>` },
  ]);
}
