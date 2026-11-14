// Kopf-Knöpfe wie in der Familie (Familienakte, Datei-Organizer; Klaus 14.11.2026):
// · Fassungsnummer = Update-Knopf. Steht ein Update bereit, erscheint daneben das Fähnchen „Update x.y.z“; ein Tipp lädt es.
//   Web-App: fragt ./version.json (liegt neben der Seite, nie aus dem Vorrat) beim Start, beim Zurückholen, stündlich; Tipp holt die
//   neue Fassung über den Service Worker und lädt neu. Pro (Android/Windows): fragt still den eigenen Update-Server (src/nativ.ts,
//   family-projekt.de/updates/pseudodoc/), Tipp lädt, prüft und öffnet das Installieren-Fenster.
// · Installieren (nur Web-App): erscheint, solange PseudoDoc nicht installiert ist; nach der Installation verschwindet er.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, MonitorDown, RefreshCw } from "lucide-react";
import { istNativ, nativeUpdates, stillPruefen, direktLaden } from "./nativ.ts";

export const FASSUNG = __PD_FASSUNG__;

function useWebUpdate() {
  const [neu, setNeu] = useState("");
  useEffect(() => {
    if (istNativ()) return;
    let weg = false;
    const pruefen = async () => {
      if (navigator.onLine === false) return;
      try {
        const r = await fetch(`./version.json?t=${Date.now()}`, { cache: "no-store" });
        const f = r.ok ? String((await r.json()).fassung || "") : "";
        if (!weg && /^\d+\.\d+\.\d+$/.test(f)) setNeu(f !== FASSUNG ? f : "");
      } catch { /* ohne Netz: kein Fähnchen */ }
    };
    void pruefen();
    const sicht = () => { if (document.visibilityState === "visible") void pruefen(); };
    document.addEventListener("visibilitychange", sicht);
    const takt = setInterval(pruefen, 60 * 60 * 1000);
    return () => { weg = true; document.removeEventListener("visibilitychange", sicht); clearInterval(takt); };
  }, []);
  return neu;
}

async function webAktualisieren() {
  try { const r = await navigator.serviceWorker?.getRegistration(); await r?.update(); } catch { /* ohne Netz: nur neu laden */ }
  location.reload();
}

function useNativesUpdate() {
  const api = useMemo(() => nativeUpdates(), []);
  const [neu, setNeu] = useState("");
  const [prozent, setProzent] = useState<number | null>(null);
  const [hinweis, setHinweis] = useState("");
  useEffect(() => {
    if (!api) return;
    let weg = false;
    const still = async () => { const v = await stillPruefen(api, FASSUNG); if (!weg && v !== null) setNeu(v); };
    const start = setTimeout(() => void still(), 2500);
    const sicht = () => { if (document.visibilityState === "visible") void still(); };
    document.addEventListener("visibilitychange", sicht);
    const takt = setInterval(still, 60 * 60 * 1000);
    return () => { weg = true; clearTimeout(start); document.removeEventListener("visibilitychange", sicht); clearInterval(takt); };
  }, [api]);
  useEffect(() => { if (!hinweis) return; const t = setTimeout(() => setHinweis(""), 4500); return () => clearTimeout(t); }, [hinweis]);
  const laden = useCallback(async () => {
    if (!api || prozent !== null) return;
    setProzent(0);
    try { const satz = await direktLaden(api, FASSUNG, setProzent); if (satz) setHinweis(satz); if (/^Aktuelle Fassung/.test(satz)) setNeu(""); }
    finally { setProzent(null); }
  }, [api, prozent]);
  return { nativ: !!api, neu, prozent, hinweis, laden };
}

type Angebot = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const laeuftInstalliert = () => matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Installieren der Web-App: das Angebot des Browsers wird gemerkt; nach „appinstalled“ (oder als installierte App) ist der Knopf weg. */
function useInstallieren() {
  const [angebot, setAngebot] = useState<Angebot | null>(null);
  const [installiert, setInstalliert] = useState(() => istNativ() || laeuftInstalliert());
  useEffect(() => {
    const an = (e: Event) => { e.preventDefault(); setAngebot(e as Angebot); };
    const fertig = () => { setInstalliert(true); setAngebot(null); };
    addEventListener("beforeinstallprompt", an); addEventListener("appinstalled", fertig);
    return () => { removeEventListener("beforeinstallprompt", an); removeEventListener("appinstalled", fertig); };
  }, []);
  const installieren = async (): Promise<string> => {
    if (!angebot) return "Installieren: im Browsermenü (⋮ bzw. Teilen) „App installieren“ oder „Zum Startbildschirm“ wählen.";
    await angebot.prompt();
    const w = await angebot.userChoice.catch(() => ({ outcome: "dismissed" as const }));
    setAngebot(null);
    if (w.outcome === "accepted") { setInstalliert(true); return ""; }
    return "";
  };
  return { sichtbar: !installiert, installieren };
}

export function KopfKnoepfe() {
  const webNeu = useWebUpdate();
  const upd = useNativesUpdate();
  const inst = useInstallieren();
  const [hinweis, setHinweis] = useState("");
  useEffect(() => { if (!hinweis) return; const t = setTimeout(() => setHinweis(""), 6000); return () => clearTimeout(t); }, [hinweis]);
  const neu = upd.nativ ? upd.neu : webNeu;
  const tipp = () => { if (upd.nativ) void upd.laden(); else if (webNeu) void webAktualisieren(); else setHinweis(`PseudoDoc ${FASSUNG} – aktuell.`); };
  return <>
    {inst.sichtbar && <button type="button" className="pd-installieren" onClick={async () => { const s = await inst.installieren(); if (s) setHinweis(s); }} data-installieren title="PseudoDoc als App installieren (Startbildschirm, ohne Browserleiste, offline)"><MonitorDown size={16}/><span>Installieren</span></button>}
    {neu && <button type="button" className="update-fahne" onClick={tipp} data-update-fahne title={`Update ${neu} steht bereit – antippen lädt es`}>{upd.nativ ? <Download size={14}/> : <RefreshCw size={14}/>}{upd.prozent !== null ? `Lädt ${upd.prozent} %` : `Update ${neu}`}</button>}
    <button type="button" className="fassung-knopf" onClick={tipp} data-fassung-knopf title="Fassung – antippen sucht ein Update">{upd.prozent !== null && !neu ? `${upd.prozent} %` : FASSUNG}</button>
    {(hinweis || upd.hinweis) && <div className="update-meldung" role="status" data-update-meldung>{upd.hinweis || hinweis}</div>}
  </>;
}
