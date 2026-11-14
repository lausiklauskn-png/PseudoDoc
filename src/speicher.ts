// Gespeicherte Aufträge des Pseudonymisierers – nur auf diesem Gerät (IndexedDB „pseudonymisierer“).
// Die Zuordnung (Platzhalter → echte Angabe) liegt verschlüsselt (AES-GCM-256) mit einem Geräteschlüssel, der nicht auslesbar
// ist (WebCrypto, extractable: false). Nach 90 Tagen oder „erledigt“ wird ein Auftrag gelöscht. Sichern auf eine Datei nur mit
// eigenem Passwort (PBKDF2-SHA256, 600 000 Runden). Kein Netz.
import type { Stueck, AuftragWahl, Korrektur } from "../lib/pseudo/auftrag.ts";

/** Was offen gespeichert wird: nur Kennung, Art, pseudonymisierte Fassung, Flächen. Pfad, unsichere Wörter und Leckwert
 *  enthalten Klartext und gehören nicht hierher (die Probe liest die gespeicherten Bytes). */
export type GespeichertesStueck = Pick<Stueck, "kennung" | "art" | "fassung" | "funde" | "schon" | "bild" | "weglassen">;
export const zumSpeichern = (s: Stueck): GespeichertesStueck => ({ kennung: s.kennung, art: s.art, fassung: s.fassung, funde: s.funde, schon: s.schon, bild: s.bild, weglassen: s.weglassen });

export type Auftrag = {
  id: string; name: string; erstellt: number; geaendert: number;
  wahl: AuftragWahl; korrektur: Korrektur;
  stuecke: GespeichertesStueck[];         // ohne Klartext, ohne echte Dateinamen
  originalNamen: Record<string, string>;  // Kennung → echter Dateiname (bleibt auf dem Gerät, verschlüsselt mit der Zuordnung)
  zuordnung?: { iv: string; daten: string };
  ordner?: unknown;                       // gemerkter Arbeitsordner (Handle), falls der Browser das kann
};

export const HALTBAR_TAGE = 90;
const DB = "pseudodoc", V = 1;
let db: Promise<IDBDatabase> | null = null;
function offen(): Promise<IDBDatabase> {
  if (!db) db = new Promise((ok, nein) => {
    const r = indexedDB.open(DB, V);
    r.onupgradeneeded = () => { const d = r.result; for (const s of ["auftraege", "bilder", "schluessel"]) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s); };
    r.onsuccess = () => ok(r.result); r.onerror = () => nein(r.error);
  });
  return db;
}
async function tun<T>(store: string, art: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await offen();
  return new Promise((ok, nein) => { const t = d.transaction(store, art); const r = f(t.objectStore(store)); t.oncomplete = () => ok(r.result as T); t.onerror = () => nein(t.error); t.onabort = () => nein(t.error); });
}

const b64 = (b: Uint8Array) => { let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function geraeteSchluessel(): Promise<CryptoKey> {
  const da = await tun<CryptoKey | undefined>("schluessel", "readonly", (s) => s.get("geraet"));
  if (da) return da;
  const k = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await tun("schluessel", "readwrite", (s) => s.put(k, "geraet"));
  return k;
}

type Geheim = { map: Record<string, string>; originalNamen: Record<string, string>; korrektur?: Korrektur };
async function verschluesseln(k: CryptoKey, g: Geheim) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(JSON.stringify(g))));
  return { iv: b64(iv), daten: b64(c) };
}
async function entschluesseln(k: CryptoKey, z: { iv: string; daten: string }): Promise<Geheim> {
  const p = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(z.iv) }, k, unb64(z.daten));
  return JSON.parse(new TextDecoder().decode(p));
}

export async function speichern(a: Auftrag, map: Record<string, string>) {
  const k = await geraeteSchluessel();
  const zuordnung = await verschluesseln(k, { map, originalNamen: a.originalNamen, korrektur: a.korrektur });
  await tun("auftraege", "readwrite", (s) => s.put({ ...a, originalNamen: {}, korrektur: { verdecken: [], bleibt: [] }, zuordnung, geaendert: Date.now() }, a.id));
}

export async function laden(id: string): Promise<{ auftrag: Auftrag; map: Record<string, string> } | null> {
  const a = await tun<Auftrag | undefined>("auftraege", "readonly", (s) => s.get(id));
  if (!a?.zuordnung) return null;
  const g = await entschluesseln(await geraeteSchluessel(), a.zuordnung);
  return { auftrag: { ...a, originalNamen: g.originalNamen || {}, korrektur: g.korrektur || a.korrektur }, map: g.map };
}

/** Alle Aufträge, neueste zuerst; abgelaufene (90 Tage) werden dabei gelöscht. */
export async function alle(): Promise<Auftrag[]> {
  const liste = await tun<Auftrag[]>("auftraege", "readonly", (s) => s.getAll());
  const grenze = Date.now() - HALTBAR_TAGE * 864e5;
  for (const a of liste.filter((x) => x.geaendert < grenze)) await loeschen(a.id);
  return liste.filter((x) => x.geaendert >= grenze).sort((a, b) => b.geaendert - a.geaendert);
}

export async function loeschen(id: string) {
  await tun("auftraege", "readwrite", (s) => s.delete(id));
  const schluessel = await tun<IDBValidKey[]>("bilder", "readonly", (s) => s.getAllKeys());
  for (const k of schluessel.filter((k) => String(k).startsWith(`${id}/`))) await tun("bilder", "readwrite", (s) => s.delete(k));
}

/** Originalbild eines Auftrags (für „Bild zurückführen“ – die abgedeckten Stellen kommen aus dem Original zurück). */
export const bildMerken = (id: string, kennung: string, b: Blob) => tun("bilder", "readwrite", (s) => s.put(b, `${id}/${kennung}`));
export const bildHolen = (id: string, kennung: string) => tun<Blob | undefined>("bilder", "readonly", (s) => s.get(`${id}/${kennung}`));

// ── Sichern mit Passwort (anderes Gerät, Neuinstallation) ────────────────────────────────────────────────────────────
async function passwortSchluessel(pw: string, salz: Uint8Array<ArrayBuffer>) {
  const roh = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salz, iterations: 600000 }, roh, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export async function sicherungDatei(id: string, pw: string): Promise<string> {
  const g = await laden(id);
  if (!g) throw new Error("Auftrag nicht gefunden");
  const salz = crypto.getRandomValues(new Uint8Array(16));
  const z = await verschluesseln(await passwortSchluessel(pw, salz), { map: g.map, originalNamen: g.auftrag.originalNamen, korrektur: g.auftrag.korrektur });
  return JSON.stringify({ art: "pseudodoc-zuordnung", v: 1, auftrag: { ...g.auftrag, originalNamen: {}, korrektur: { verdecken: [], bleibt: [] }, zuordnung: undefined, ordner: undefined }, salz: b64(salz), ...z }) + "\n";
}
export async function sicherungEinlesen(text: string, pw: string): Promise<Auftrag> {
  const d = JSON.parse(text);
  if (d.art !== "pseudodoc-zuordnung" || d.v !== 1) throw new Error("Keine Sicherung von PseudoDoc");
  let g: Geheim;
  try { g = await entschluesseln(await passwortSchluessel(pw, unb64(d.salz)), d); } catch { throw new Error("Passwort stimmt nicht"); }
  const a: Auftrag = { ...d.auftrag, originalNamen: g.originalNamen || {}, korrektur: g.korrektur || d.auftrag.korrektur };
  await speichern(a, g.map);
  return a;
}
