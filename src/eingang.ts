// Pro (Android, Windows): Dateien, die an PseudoDoc Pro geteilt oder mit „Öffnen mit“ übergeben wurden. Die Hülle legt sie als Kopie in
// einen Stapel (android/…/DoEingangPlugin.java, windows/engine/src/DesktopEingang.java); hier werden sie stückweise geholt (Vertrag wie im
// Datei-Organizer, src/quellen.ts). In der Web-App gibt es das Plugin nicht – dann bleibt alles still.
import { ueberspringen, type Eingang } from "./lesen.ts";

type EingangPlugin = {
  abholen(): Promise<{ stapel: string; dateien: Array<{ name: string; groesse: number; geaendert?: number }>; weitere?: number }>;
  lesen(a: { stapel: string; name: string; offset: number; laenge: number }): Promise<{ data: string }>;
  addListener?(name: "neu", f: () => void): Promise<{ remove?: () => unknown }> | { remove?: () => unknown };
};
const plugin = (): EingangPlugin | null => {
  const p = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { DoEingang?: EingangPlugin } } }).Capacitor;
  return p?.isNativePlatform?.() && p.Plugins?.DoEingang?.abholen ? p.Plugins.DoEingang : null;
};
const STUECK = 1024 * 1024;
const b64 = (s: string) => { const bin = atob(s); const o = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i); return o; };

export async function eingangAbholen(): Promise<Eingang[]> {
  const p = plugin(); if (!p) return [];
  const r = await p.abholen();
  if (!r.stapel || !r.dateien?.length) return [];
  const aus: Eingang[] = [];
  for (const d of r.dateien.filter((x) => !ueberspringen(x.name))) {
    const o = new Uint8Array(d.groesse); let k = 0;
    for (let off = 0; off < d.groesse; off += STUECK) { const t = b64((await p.lesen({ stapel: r.stapel, name: d.name, offset: off, laenge: Math.min(STUECK, d.groesse - off) })).data); o.set(t.subarray(0, d.groesse - k), k); k += t.length; }
    aus.push({ pfad: d.name, name: d.name, bytes: k < d.groesse ? o.subarray(0, k) : o });
  }
  return aus;
}

export async function eingangLauschen(f: () => void): Promise<{ remove?: () => unknown } | null> {
  const p = plugin(); if (!p?.addListener) return null;
  try { return await p.addListener("neu", f); } catch { return null; }
}
