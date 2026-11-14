// Arbeitsordner des Pseudonymisierers: <gewählter Ort>/<Auftrag>/1-Originale · 2-Fuer-die-KI · 3-Antworten-der-KI ·
// 4-Zurueckgefuehrt. Schreiben geht im Browser nur mit Ordnerwahl (Chrome/Edge am PC); sonst Herunterladen. In der Pro-App
// (Android/Windows) später über die Ordner-Brücke der App (FamilyFolders) – hier vorbereitet, noch nicht angeschlossen.
import { ORDNER } from "../lib/pseudo/auftrag.ts";

type Schreibbar = { write: (d: Blob | string) => Promise<void>; close: () => Promise<void> };
export type DirHandle = {
  name: string; kind: "directory";
  getDirectoryHandle: (n: string, o?: { create?: boolean }) => Promise<DirHandle>;
  getFileHandle: (n: string, o?: { create?: boolean }) => Promise<{ kind: "file"; name: string; getFile: () => Promise<File>; createWritable: () => Promise<Schreibbar> }>;
  values: () => AsyncIterable<{ kind: "file" | "directory"; name: string }>;
  queryPermission?: (o: { mode: string }) => Promise<string>; requestPermission?: (o: { mode: string }) => Promise<string>;
};
type Fenster = Window & { showDirectoryPicker?: (o?: { mode?: string; id?: string }) => Promise<DirHandle> };

export const ordnerSchreibbar = () => typeof (window as Fenster).showDirectoryPicker === "function";

export async function ortWaehlen(): Promise<DirHandle | null> {
  try { return await (window as Fenster).showDirectoryPicker!({ mode: "readwrite", id: "pseudonymisierer" }); }
  catch (e) { if ((e as Error).name === "AbortError") return null; throw e; }
}

export async function erlaubt(h: DirHandle): Promise<boolean> {
  try { if ((await h.queryPermission?.({ mode: "readwrite" })) === "granted") return true; return (await h.requestPermission?.({ mode: "readwrite" })) === "granted"; } catch { return false; }
}

const sauber = (n: string) => n.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120) || "Datei";

export async function datei(d: DirHandle, name: string, inhalt: Blob | string) {
  const f = await d.getFileHandle(sauber(name), { create: true });
  const w = await f.createWritable(); await w.write(inhalt); await w.close();
}

/** Auftragsordner mit den vier Unterordnern anlegen (vorhandene bleiben). */
export async function auftragOrdner(ort: DirHandle, name: string) {
  return unterordner(await ort.getDirectoryHandle(sauber(name), { create: true }));
}
export async function unterordner(a: DirHandle) {
  const u = {} as Record<keyof typeof ORDNER, DirHandle>;
  for (const [k, n] of Object.entries(ORDNER)) u[k as keyof typeof ORDNER] = await a.getDirectoryHandle(n, { create: true });
  return { auftrag: a, ...u };
}

/** Dateien eines Ordners lesen (z. B. 3-Antworten-der-KI). */
export async function ordnerLesen(d: DirHandle): Promise<File[]> {
  const aus: File[] = [];
  for await (const e of d.values()) if (e.kind === "file" && !e.name.startsWith(".")) aus.push(await (await d.getFileHandle(e.name)).getFile());
  return aus;
}

// ── Herunterladen und Kopieren ───────────────────────────────────────────────────────────────────────────────────────
type Cap = { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, { speichern?: (o: { name: string; mime: string; data: string }) => Promise<{ gespeichert?: boolean }> }> } };
const nativSpeichern = () => (window as unknown as Cap).Capacitor?.Plugins?.DoDateien?.speichern;

/** Dateiname, den jeder Browser annimmt (Chrome verwirft sonst Namen mit Gedankenstrich/Umlaut und nennt sie „download“). */
export const dateiname = (n: string) => n.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ß/g, "ss")
  .replace(/[–—]/g, "-").replace(/[\\/:*?"<>|]+/g, "-").replace(/[^\x20-\x7e]/g, "_").replace(/\s+/g, " ").trim() || "datei";

export async function herunterladen(roh: string, inhalt: Blob | string, mime = "text/plain;charset=utf-8") {
  const name = dateiname(roh);
  const blob = typeof inhalt === "string" ? new Blob([inhalt], { type: mime }) : inhalt;
  const nativ = nativSpeichern();
  if (nativ) {
    const b = new Uint8Array(await blob.arrayBuffer()); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
    await nativ({ name, mime: blob.type || mime, data: btoa(s) }); return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function kopieren(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const t = document.createElement("textarea"); t.value = text; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select();
    const ok = document.execCommand("copy"); t.remove(); return ok;
  }
}
