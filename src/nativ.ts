/**
 * Native App „PseudoDoc Pro“ (Android, Windows; Klaus 14.11.2026) gegenüber der Web-App „PseudoDoc Basic“ (PWA, kostenlose
 * Testfassung). An dieser einen Stelle wird festgelegt, welche Fassung läuft; Kopf, Fuß und Titel nehmen den Namen von hier.
 * Speicher-Namen (IndexedDB, Vorrat, version.json) bleiben in beiden gleich.
 *
 * Updates in der App: vom eigenen Server (family-projekt.de/updates/pseudodoc/), Plugin „DoUpdates“
 * (android/…/DoUpdatesPlugin.java, Vorbild BookLedgerPro). Still gefragt wird beim Start, beim Zurückholen der App und
 * höchstens einmal je Stunde (gemerkt in localStorage); ein Tipp auf das Fähnchen oder die Fassung lädt direkt, prüft
 * (Größe, SHA-256, Paket, Zertifikat, versionCode) und öffnet Androids Installieren-Fenster – wie Workflow PDF Pro.
 */
type Lauscher = { remove?: () => Promise<void> | void };
export type UpdatePlugin = {
  pruefen(): Promise<{ aktuell?: boolean; version?: string; installiert?: string; neu?: string; groesse?: number }>;
  installieren(): Promise<{ gestartet?: boolean; erlaubnis?: boolean }>;
  addListener?(name: "stand", f: (e: { geladen: number; groesse: number }) => void): Promise<Lauscher> | Lauscher;
};
type CapFenster = Window & { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { DoUpdates?: UpdatePlugin } } };
const cap = () => (typeof window !== "undefined" ? (window as CapFenster).Capacitor : undefined);

export const istNativ = (): boolean => !!cap()?.isNativePlatform?.();
export const APP_VARIANTE: "Pro" | "Basic" = istNativ() ? "Pro" : "Basic";
export const APP_NAME = `PseudoDoc ${APP_VARIANTE}`;

export const nativeUpdates = (): UpdatePlugin | null => {
  const c = cap();
  return c?.isNativePlatform?.() && typeof c.Plugins?.DoUpdates?.pruefen === "function" ? c.Plugins.DoUpdates : null;
};

const STILL_KEY = "pd_update_still_v1", STUNDE = 60 * 60 * 1000;
type Gemerkt = { zeit: number; neu: string };
const gemerkt = (): Gemerkt | null => { try { const g = JSON.parse(localStorage.getItem(STILL_KEY) || "null"); return g && typeof g.zeit === "number" ? g : null; } catch { return null; } };
const merken = (g: Gemerkt) => { try { localStorage.setItem(STILL_KEY, JSON.stringify(g)); } catch { /* ohne Speicher: nur diese Sitzung */ } };
const zahl = (v: string) => { const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v || ""); return m ? [+m[1], +m[2], +m[3]] : null; };
export const neuer = (a: string, b: string) => { const x = zahl(a), y = zahl(b); if (!x || !y) return false; for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };

let lauf: ReturnType<UpdatePlugin["pruefen"]> | null = null;
/** Eine Anfrage zur Zeit: wer während der stillen Prüfung tippt, wartet auf sie. */
const frage = (api: UpdatePlugin) => lauf || (lauf = api.pruefen().finally(() => { lauf = null; }));

/** Still fragen (höchstens stündlich). Gibt die neue Fassung zurück, "" wenn aktuell; null = nichts gefragt oder Fehler. */
export async function stillPruefen(api: UpdatePlugin, ich: string): Promise<string | null> {
  if (document.visibilityState === "hidden") return null;
  const g = gemerkt(), jetzt = Date.now();
  if (g && jetzt >= g.zeit && jetzt - g.zeit < STUNDE) return neuer(g.neu, ich) ? g.neu : "";
  merken({ zeit: jetzt, neu: g?.neu || "" }); // auch ein Fehlschlag zählt: höchstens eine Anfrage je Stunde
  try {
    const r = await frage(api);
    const neu = r.neu && neuer(r.neu, ich) ? r.neu : "";
    merken({ zeit: jetzt, neu });
    return neu;
  } catch { return null; } // ohne Netz, nicht eingerichtet oder Fehler: still
}

/** Tipp auf Fähnchen oder Fassung: prüfen, laden, Android-Installieren öffnen. Gibt einen kurzen Satz für die Meldung zurück ("" = nichts zu sagen). */
export async function direktLaden(api: UpdatePlugin, ich: string, stand: (prozent: number) => void): Promise<string> {
  let r;
  try { r = await frage(api); }
  catch (e) { return fehlerSatz(e); }
  const neu = r.neu && neuer(r.neu, ich) ? r.neu : "";
  merken({ zeit: Date.now(), neu });
  if (!neu) return `Aktuelle Fassung ${r.installiert || r.version || ich}.`;
  let hoerer: Lauscher | null = null, aktiv = true; // ein spät eintreffender Stand darf die Anzeige nicht wieder auf „lädt“ setzen
  try {
    hoerer = (await api.addListener?.("stand", (e) => { if (aktiv && e?.groesse) stand(Math.min(99, Math.floor(e.geladen * 100 / e.groesse))); })) || null;
    const aus = await api.installieren();
    return aus?.erlaubnis ? "Erlaube „Apps installieren“ und tippe dann noch einmal auf das Update." : "";
  } catch (e) { return fehlerSatz(e); }
  finally { aktiv = false; try { await hoerer?.remove?.(); } catch { /* egal */ } }
}

function fehlerSatz(e: unknown): string {
  const code = String((e as { code?: string })?.code || (e as Error)?.message || "");
  if (code.includes("UPDATE_NICHT_EINGERICHTET")) return "Updates sind in dieser Fassung noch nicht eingerichtet.";
  if (code.includes("UPDATE_NICHT_ERREICHBAR")) return "Update-Server gerade nicht erreichbar. Verbindung prüfen und später noch einmal antippen.";
  return "Update ließ sich nicht laden. Später noch einmal antippen.";
}
