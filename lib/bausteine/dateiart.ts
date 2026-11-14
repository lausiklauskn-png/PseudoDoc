import type { DateiArt } from "./typen.ts";

/**
 * Sieb 1: Art einer Datei am Dateikopf (erste Bytes) und an der Endung. Liest nichts vom Inhalt.
 * Passt die Endung nicht zum Kopf oder ist es ein Programm, ist die Datei „auffällig“ und wird nicht weiter gelesen.
 */
const ENDUNGEN: Record<string, DateiArt> = {
  pdf: "pdf", jpg: "bild", jpeg: "bild", png: "bild", gif: "bild", webp: "bild", heic: "bild", heif: "bild", tif: "bild", tiff: "bild", bmp: "bild",
  eml: "email", msg: "email",
  docx: "office", xlsx: "office", pptx: "office", odt: "office", ods: "office", doc: "office", xls: "office",
  txt: "text", md: "text", csv: "text", json: "text", xml: "text", html: "text", htm: "text", ics: "text", vcf: "text",
  zip: "archiv", "7z": "archiv", rar: "archiv",
  exe: "programm", msi: "programm", bat: "programm", cmd: "programm", com: "programm", scr: "programm", js: "programm", vbs: "programm", ps1: "programm", apk: "programm", jar: "programm", sh: "programm", lnk: "programm",
};

const TEXT: Record<DateiArt, string> = {
  pdf: "PDF", bild: "Bild", email: "E-Mail", office: "Office-Dokument", text: "Text", archiv: "Archiv", programm: "Programm", unbekannt: "Unbekannt",
};

export function endung(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

const beginnt = (b: Uint8Array, ...zahlen: number[]) => zahlen.every((z, i) => b[i] === z);
const ascii = (b: Uint8Array, von: number, bis: number) => String.fromCharCode(...b.slice(von, bis));

/** Art nach dem Dateikopf; null = nicht erkannt. */
export function artNachKopf(b: Uint8Array): { art: DateiArt; was: string } | null {
  if (b.length < 4) return null;
  if (ascii(b, 0, 5) === "%PDF-") return { art: "pdf", was: "PDF" };
  if (beginnt(b, 0xff, 0xd8, 0xff)) return { art: "bild", was: "JPEG" };
  if (beginnt(b, 0x89, 0x50, 0x4e, 0x47)) return { art: "bild", was: "PNG" };
  if (ascii(b, 0, 4) === "GIF8") return { art: "bild", was: "GIF" };
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return { art: "bild", was: "WebP" };
  if (ascii(b, 4, 8) === "ftyp" && /hei|mif|avif/.test(ascii(b, 8, 12))) return { art: "bild", was: "HEIC" };
  if (beginnt(b, 0x49, 0x49, 0x2a, 0x00) || beginnt(b, 0x4d, 0x4d, 0x00, 0x2a)) return { art: "bild", was: "TIFF" };
  if (beginnt(b, 0x42, 0x4d)) return { art: "bild", was: "BMP" };
  if (beginnt(b, 0x4d, 0x5a)) return { art: "programm", was: "Windows-Programm" };
  if (beginnt(b, 0x7f, 0x45, 0x4c, 0x46)) return { art: "programm", was: "Linux-Programm" };
  if (beginnt(b, 0x50, 0x4b, 0x03, 0x04)) return { art: "archiv", was: "ZIP-Behälter" }; // auch docx/xlsx/odt
  if (beginnt(b, 0xd0, 0xcf, 0x11, 0xe0)) return { art: "office", was: "Office (alt) / Outlook" };
  if (ascii(b, 0, 2) === "#!") return { art: "programm", was: "Skript" };
  // Text: nur druckbare Zeichen (UTF-8 erlaubt) in den ersten Bytes
  const stichprobe = b.slice(0, Math.min(b.length, 512));
  let schlecht = 0;
  for (const z of stichprobe) if (z < 9 || (z > 13 && z < 32)) schlecht++;
  if (schlecht === 0) {
    const t = ascii(b, 0, Math.min(b.length, 512)).toLowerCase();
    if (/^(from|received|return-path|date|message-id|mime-version|subject|to|delivered-to):/m.test(t)) return { art: "email", was: "E-Mail" };
    return { art: "text", was: "Text" };
  }
  return null;
}

export type ArtErgebnis = { art: DateiArt; artText: string; auffaellig?: string; grund: string };

export function erkenneArt(name: string, kopf: Uint8Array): ArtErgebnis {
  const e = endung(name);
  const nachEndung = ENDUNGEN[e] || "unbekannt";
  const nachKopf = artNachKopf(kopf);
  // Doppelte Endung wie „rechnung.pdf.exe“
  const teile = name.toLowerCase().split(".");
  const doppel = teile.length > 2 && ENDUNGEN[teile[teile.length - 2]] && ENDUNGEN[teile[teile.length - 2]] !== "programm" && nachEndung === "programm";
  if (nachKopf?.art === "programm" || nachEndung === "programm") {
    const grund = doppel ? `Doppelte Endung „.${teile[teile.length - 2]}.${e}“ – sieht aus wie ein Dokument, ist ein Programm`
      : nachKopf?.art === "programm" ? `Der Inhalt ist ein ${nachKopf.was}${e ? ` (Endung .${e})` : ""}` : `Endung .${e} ist ein Programm`;
    return { art: "programm", artText: TEXT.programm, auffaellig: grund, grund };
  }
  if (nachKopf) {
    let art = nachKopf.art;
    // ZIP-Behälter mit Office-Endung ist ein Office-Dokument; .eml/.msg dürfen Text bzw. OLE sein
    if (art === "archiv" && nachEndung === "office") art = "office";
    if (art === "text" && (nachEndung === "email" || nachEndung === "text")) art = nachEndung;
    if (art === "office" && nachEndung === "email") art = "email";
    if (nachEndung !== "unbekannt" && nachEndung !== art && !(art === "text" && nachEndung === "email")) {
      const grund = `Endung .${e} passt nicht zum Inhalt (${nachKopf.was})`;
      return { art, artText: TEXT[art], auffaellig: grund, grund };
    }
    return { art, artText: TEXT[art], grund: `Dateikopf: ${nachKopf.was}` };
  }
  if (nachEndung !== "unbekannt") return { art: nachEndung, artText: TEXT[nachEndung], grund: `nur an der Endung .${e} erkannt` };
  return { art: "unbekannt", artText: TEXT.unbekannt, grund: "weder Kopf noch Endung bekannt" };
}

/** SHA-256 als Hex (WebCrypto gibt es im Browser und in Node 22). */
export async function sha256Hex(daten: ArrayBuffer | Uint8Array): Promise<string> {
  const puffer = daten instanceof Uint8Array ? daten : new Uint8Array(daten);
  const h = await crypto.subtle.digest("SHA-256", puffer as unknown as ArrayBuffer);
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
