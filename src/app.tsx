// PseudoDoc (Klaus 14.11.2026): „Datei rein, pseudonymisieren, mit Bilddatei pseudonymisieren und wieder raus – zur KI.
// Einfach, aber genial.“ Einfach in der Bedienung, hoher Stand in der Technik: Maske der Familienakte (byte-gleich, Pin),
// Prüfziffern, Texterkennung auf dem Gerät, E-Mail mit Anhängen, Prüfkern gegen versteckte Anweisungen, unsichtbare Zeichen
// entfernt, Bilder neu gezeichnet (keine Metadaten), Zuordnung verschlüsselt, Leck-Sperre. Kein Netz, keine KI in der App.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArchiveRestore, Camera, Copy, Download, Eye, FileDown, FileText, FolderOpen, Image as BildSymbol, KeyRound, Pencil, RotateCcw, Share2, ShieldAlert, Trash2, Undo2, Upload, X } from "lucide-react";
import { Info, Ablaufbild } from "./ui.tsx";
import { Logo } from "./logo.tsx";
import { auftragMaskieren, kiDateien, allesInEinerDatei, antwortenZurueck, stellenImBild, kennzeichenImBild, kennung as kennungAus, artName, korrekturAusText, auftragAusText, STILE, ZIELE as AUFGABEN, ORDNER, type Stueck, type AuftragWahl, type Zurueck } from "../lib/pseudo/auftrag.ts";
import { ausPixeln, type Flaeche } from "../lib/pseudo/flaechen.ts";
import { zipBauen, docxBauen } from "../lib/pseudo/pakete.ts";
import { officeText } from "../lib/bausteine/zip.ts";
import type { Pseudonymisierer } from "../lib/maske/ki-auftrag.ts";
import { lesen, type Eingang, type Gelesen } from "./lesen.ts";
import { abgedeckt, bildZurueck, gesichter } from "./bild.ts";
import { Abdecken } from "./abdecken.tsx";
import { beispielDateien } from "./beispiel.ts";
import * as speicher from "./speicher.ts";
import { ZIELE, kopieren, bildKopieren, sammelbild, teilen, teilenMoeglich, oeffnen } from "./ki.ts";
import { herunterladen, dateiname } from "./ordner.ts";
import { eingangAbholen, eingangLauschen } from "./eingang.ts";

import { APP_VARIANTE as VARIANTE, APP_NAME } from "./nativ.ts";
import { FASSUNG, KopfKnoepfe } from "./kopf.tsx";
import { PruefSeite, BerichtAnzeige, ausBefunden } from "./pruefen.tsx";
import { rueckwegPruefen, type Punkt } from "../lib/pseudo/rueckweg.ts";
import { sauber, UNSICHTBAR } from "../lib/pseudo/auftrag.ts";
import { pruefeMail } from "./pruefkern.ts";
import { LogIn, LogOut, Sparkles } from "lucide-react";
export { VARIANTE };
const modul25 = () => (window as unknown as { SbkimPseudonym?: Pseudonymisierer }).SbkimPseudonym;

type Seite = "start" | "rein" | "hin" | "zurueck" | "raus";
const SEITEN: Seite[] = ["start", "rein", "hin", "zurueck", "raus"];
const ausHash = (): Seite => { const h = location.hash.slice(1) as Seite; return SEITEN.includes(h) ? h : "start"; };
export const UNTERTITEL = "Dateien prüfen, pseudonymisieren, sicher weitergeben";
type Eintrag = { kennung: string; g: Gelesen; vorschlaege: Flaeche[] };
const TOKEN = /⟦[A-Z][A-Z0-9_]*-\d+⟧/g;
const neueId = () => `${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`;
const stdName = () => `Auftrag ${new Date().toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`;

function markiert(text: string, map: Record<string, string>, klick?: (tok: string) => void): ReactNode[] {
  return text.split(/(⟦[^⟧]+⟧)/g).map((t, i) => /^⟦[A-Z][A-Z0-9_]*-\d+⟧$/.test(t)
    ? <mark key={i} className="pseudo-platzhalter" title={map[t] ? `steht für: ${map[t]}` : undefined} onClick={klick ? () => klick(t) : undefined}>{t}</mark> : t);
}

export function App() {
  const [seite, setSeite] = useState<Seite>(ausHash);
  const [zurueckId, setZurueckId] = useState("");
  const [beispiel, setBeispiel] = useState(0);
  useEffect(() => { const h = () => setSeite(ausHash()); addEventListener("hashchange", h); return () => removeEventListener("hashchange", h); }, []);
  const gehe = (s: Seite) => { if (location.hash.slice(1) !== (s === "start" ? "" : s)) { if (s === "start") history.pushState(null, "", location.pathname + location.search); else location.hash = s; } setSeite(s); scrollTo(0, 0); };
  const reiter = (s: Seite, inhalt: ReactNode) => <button type="button" className={seite === s ? "active" : ""} aria-current={seite === s ? "page" : undefined} onClick={() => gehe(s)} data-seite={s}>{inhalt}</button>;
  return <>
    <header className="site-header">
      <div className="masthead">
        <button type="button" className="site-brand" onClick={() => gehe("hin")} aria-label="PseudoDoc – zum Anfang">
          <Logo groesse={46}/>
          <span><strong className="pd-name" data-app-name={APP_NAME}>PseudoDoc <em>{VARIANTE}</em></strong><small data-untertitel>{UNTERTITEL}</small></span>
        </button>
        <div className="header-actions">
          <KopfKnoepfe/>
          <Info titel="So geht es" mehr={<>
            <Ablaufbild label="Drei Wege" schritte={[{ titel: "Rein", unter: "kann ich das öffnen?" }, { titel: "Zur KI", unter: "pseudonymisiert hin und zurück", art: "hervor" }, { titel: "Raus", unter: "kann ich das weitergeben?" }]}/>
            <ul>
              <li>Rein und Raus prüfen eine Datei auf Verstecktes; Raus legt eine bereinigte Kopie an. Kein Virenscanner.</li>
              <li>Alles geschieht auf diesem Gerät. PseudoDoc sendet nichts – du fügst selbst bei der KI ein.</li>
              <li>Hinaus gehen nur Text und neu gezeichnete Bilder: keine Dateinamen, keine Kamera-, Orts- oder Zeitangaben, keine unsichtbaren Zeichen.</li>
              <li>Die Zuordnung (welcher Platzhalter wofür steht) bleibt verschlüsselt hier, höchstens 90 Tage.</li>
              <li>Pseudonymisiert ist nicht anonym (DSGVO Art. 4 Nr. 5). Vor dem Senden kurz ansehen – die Erkennung kann etwas übersehen.</li>
            </ul></>}/>
        </div>
      </div>
      <nav className="main-navigation pd-reiter" aria-label="Richtung">
        {reiter("rein", <><LogIn size={16}/> Rein</>)}
        {reiter("hin", <><span className="pd-nr">1</span> Zur KI</>)}
        {reiter("zurueck", <><span className="pd-nr">2</span> Zurück</>)}
        {reiter("raus", <><LogOut size={16}/> Raus</>)}
      </nav>
    </header>
    <main className="site-main pd-main">
      {seite === "start" && <StartSeite gehe={gehe} beispiel={() => { gehe("hin"); setBeispiel((n) => n + 1); }}/>}
      <div hidden={seite !== "rein"}><PruefSeite modus="rein"/></div>
      <div hidden={seite !== "hin"}><HinSeite beispiel={beispiel} benutzt={() => { if (seite !== "hin") gehe("hin"); }} zumRueckweg={(id) => { setZurueckId(id); gehe("zurueck"); }}/></div>
      {seite === "zurueck" && <ZurueckSeite start={zurueckId}/>}
      <div hidden={seite !== "raus"}><PruefSeite modus="raus"/></div>
    </main>
    <footer className="site-footer"><div className="footer-inner"><span className="leise">PseudoDoc {VARIANTE} {FASSUNG} · Maske aus der Familienakte · Teil der Pro-App-Familie · alles bleibt auf diesem Gerät</span> · <a href="./datenschutz.html">Impressum &amp; Datenschutz</a></div></footer>
  </>;
}

// ── Start: drei Wege ──────────────────────────────────────────────────────────────────────────────────────────────
function StartSeite({ gehe, beispiel }: { gehe: (s: Seite) => void; beispiel: () => void }) {
  const weg = (s: Seite, Symbol: typeof LogIn, titel: string, frage: string, text: string, haupt = false) =>
    <button type="button" className={`pd-weg ${haupt ? "haupt" : ""}`} onClick={() => gehe(s)} data-weg={s}><Symbol size={30}/><strong>{titel}</strong><em>{frage}</em><span className="leise">{text}</span></button>;
  return <section className="card pd-start" data-karte="start">
    <h1>{UNTERTITEL}</h1>
    <div className="pd-wege">
      {weg("rein", LogIn, "Rein", "Kann ich das öffnen?", "Datei oder Mail prüfen, bevor du sie öffnest: versteckter Text, Anweisungen an eine KI, Makros, getarnte Programme.")}
      {weg("hin", Sparkles, "Zur KI", "Mit der KI arbeiten, ohne Namen preiszugeben", "Pseudonymisiert hin, die Antwort zurück – mit den echten Angaben und geprüft.", true)}
      {weg("raus", LogOut, "Raus", "Kann ich das weitergeben?", "Ort im Foto, Autor, Kommentare, versteckter Text – bereinigte Kopie, auf Wunsch pseudonymisiert.")}
    </div>
    <p className="leise pd-start-fuss">Alles auf diesem Gerät, nichts wird hochgeladen. · <button type="button" className="text-link" onClick={beispiel} data-beispiel>Beispiel ansehen</button></p>
  </section>;
}

// ── 1 · Zur KI ──────────────────────────────────────────────────────────────────────────────────────────────────────
function HinSeite({ zumRueckweg, beispiel, benutzt }: { zumRueckweg: (id: string) => void; beispiel: number; benutzt: () => void }) {
  const [eintraege, setEintraege] = useState<Eintrag[]>([]);
  const [stuecke, setStuecke] = useState<Stueck[]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const [verdecken, setVerdecken] = useState("");
  const [bleibt, setBleibt] = useState("");
  const [wahl, setWahl] = useState<AuftragWahl>({ ziel: "antwort", stile: [], frei: "" });
  const [mitBildern, setMitBildern] = useState(true);
  const [auftragId, setAuftragId] = useState(neueId);
  const [name] = useState(stdName);
  const [meldung, setMeldung] = useState<{ text: ReactNode; art?: "halt" | "gut" } | null>(null);
  const [laeuft, setLaeuft] = useState("");
  const [ansehen, setAnsehen] = useState<string | null>(null);
  const [abdecken, setAbdecken] = useState<string | null>(null);
  const [weg, setWeg] = useState<Eintrag[]>([]);
  const [ziehen, setZiehen] = useState(false);
  const [paket, setPaket] = useState<{ text: string; bild: Blob | null; bilder: File[] } | null>(null);
  const [vorschauen, setVorschauen] = useState<Record<string, string>>({});
  const urls = useRef(new Map<string, string>());
  const dateiWahl = useRef<HTMLInputElement>(null), ordnerWahl = useRef<HTMLInputElement>(null), kamera = useRef<HTMLInputElement>(null);
  const p = modul25();

  // Pro: Dateien, die an PseudoDoc geteilt oder mit „Öffnen mit“ übergeben wurden, kommen von selbst herein.
  const einlesenRef = useRef<(e: Eingang[]) => Promise<void>>(async () => {});
  useEffect(() => {
    let weg = false;
    const holen = async () => { for (let i = 0; i < 20 && !weg; i++) { const e = await eingangAbholen().catch(() => []); if (!e.length) break; await einlesenRef.current(e); } };
    void holen();
    const sicht = () => { if (document.visibilityState === "visible") void holen(); };
    document.addEventListener("visibilitychange", sicht);
    const lauscher = eingangLauschen(() => void holen());
    return () => { weg = true; document.removeEventListener("visibilitychange", sicht); void lauscher.then((l) => l?.remove?.()); };
  }, []);

  const bildUrl = (k: string, b?: Blob) => { if (!b) return ""; if (!urls.current.has(k)) urls.current.set(k, URL.createObjectURL(b)); return urls.current.get(k)!; };
  const wahlMitId: AuftragWahl = useMemo(() => ({ ...wahl, auftragId }), [wahl, auftragId]);
  const raus = stuecke.filter((s) => !s.weglassen && (s.fassung || s.bild));
  const bilderRaus = raus.filter((s) => s.bild);
  const lecks = raus.filter((s) => s.leck);

  /** Alles neu rechnen: Texte maskieren (gemeinsame Platzhalter über alle Dateien), Vorschläge für Bilder, Auftrag merken. */
  async function rechnen(liste: Eintrag[], v = verdecken, b = bleibt) {
    if (!p) { setMeldung({ text: "Die Maske ist nicht geladen – Seite neu laden.", art: "halt" }); return; }
    const roh: Stueck[] = liste.map((e) => {
      const alt = stuecke.find((s) => s.kennung === e.kennung);
      return { ...e.g.stueck, kennung: e.kennung, weglassen: alt?.weglassen, bild: e.g.stueck.bild ? { ...e.g.stueck.bild, flaechen: alt?.bild?.flaechen ?? e.g.stueck.bild.flaechen } : undefined } as Stueck;
    });
    const r = auftragMaskieren(p, roh, korrekturAusText(v, b));
    const werte = Object.values(r.map);
    const neu = await Promise.all(liste.map(async (e) => {
      if (!e.g.stueck.bild) return e;
      const { breite, hoehe } = e.g.stueck.bild;
      const gs = e.vorschlaege.some((f) => f.auto === "gesicht") ? e.vorschlaege.filter((f) => f.auto === "gesicht") : (await gesichter(e.g.bild!)).map((s) => ausPixeln(s, breite, hoehe, "gesicht"));
      return { ...e, vorschlaege: [...stellenImBild(e.g.woerter || [], werte).map((s) => ausPixeln(s, breite, hoehe, "text")), ...kennzeichenImBild(e.g.woerter || []).map((s) => ausPixeln(s, breite, hoehe, "kennzeichen")), ...gs] };
    }));
    const fertig = r.stuecke.map((s) => {
      const alt = stuecke.find((x) => x.kennung === s.kennung);
      if (s.bild && !alt?.bild) s.bild = { ...s.bild, flaechen: neu.find((x) => x.kennung === s.kennung)!.vorschlaege };
      return s;
    });
    setEintraege(neu); setStuecke(fertig); setMap(r.map);
    await merken(fertig, r.map, neu);
  }

  async function merken(st = stuecke, m = map, liste = eintraege) {
    const originalNamen = Object.fromEntries(liste.map((e) => [e.kennung, e.g.stueck.pfad]));
    await speicher.speichern({ id: auftragId, name, erstellt: Date.now(), geaendert: Date.now(), wahl: wahlMitId, korrektur: korrekturAusText(verdecken, bleibt), stuecke: st.map(speicher.zumSpeichern), originalNamen }, m)
      .catch(() => setMeldung({ text: "Konnte den Auftrag nicht auf dem Gerät merken (privates Fenster?). Zurückholen geht dann nur, solange diese Seite offen ist.", art: "halt" }));
    for (const e of liste) if (e.g.bild) await speicher.bildMerken(auftragId, e.kennung, e.g.bild).catch(() => {});
  }

  async function einlesen(eingaenge: Eingang[]) {
    if (!eingaenge.length) { setMeldung({ text: "Es wurden keine Dateien übergeben.", art: "halt" }); return; }
    benutztRef.current();
    setMeldung(null);
    let nr = eintraege.reduce((m, e) => Math.max(m, Number(e.kennung.slice(1))), 0);
    const neu: Eintrag[] = [];
    for (let i = 0; i < eingaenge.length; i++) {
      setLaeuft(`Datei ${i + 1} von ${eingaenge.length}: ${eingaenge[i].name}`);
      for (const g of await lesen(eingaenge[i], (s) => setLaeuft(`Datei ${i + 1} von ${eingaenge.length} · ${s}`))) neu.push({ kennung: kennungAus(nr++), g, vorschlaege: [] });
    }
    setLaeuft("Pseudonymisieren …");
    await rechnen([...eintraege, ...neu]);
    setLaeuft("");
    setMeldung({ text: `${neu.length} ${neu.length === 1 ? "Stück" : "Stücke"} pseudonymisiert. Kurz ansehen – dann zur KI.`, art: "gut" });
  }

  einlesenRef.current = einlesen;
  const benutztRef = useRef(benutzt); benutztRef.current = benutzt;
  useEffect(() => { if (beispiel) void beispielDateien().then((b) => einlesenRef.current(b)); }, [beispiel]);
  const ausFiles = async (l: FileList | File[]) => einlesen(await Promise.all([...l].map(async (f) => ({ pfad: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name, name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) }))));
  async function ausZiehen(dt: DataTransfer) {
    type E = { isFile: boolean; isDirectory: boolean; name: string; fullPath: string; file?: (ok: (f: File) => void, n: (e: unknown) => void) => void; createReader?: () => { readEntries: (ok: (l: E[]) => void, n: (e: unknown) => void) => void } };
    const gefunden: Eingang[] = [];
    const lauf = async (e: E): Promise<void> => {
      if (e.isFile && e.file) { const f = await new Promise<File>((ok, n) => e.file!(ok, n)); gefunden.push({ pfad: e.fullPath.replace(/^\//, ""), name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) }); return; }
      if (e.isDirectory && e.createReader) { const r = e.createReader(); for (;;) { const t = await new Promise<E[]>((ok, n) => r.readEntries(ok, n)); if (!t.length) break; for (const k of t) await lauf(k); } }
    };
    const wurzeln = [...dt.items].filter((i) => i.kind === "file").map((i) => (i as unknown as { webkitGetAsEntry?: () => E | null }).webkitGetAsEntry?.() || null);
    if (wurzeln.some(Boolean)) { for (const w of wurzeln) if (w) await lauf(w); await einlesen(gefunden); } else await ausFiles(dt.files);
  }

  function neuAnfangen() {
    for (const u of urls.current.values()) URL.revokeObjectURL(u); urls.current.clear();
    setEintraege([]); setStuecke([]); setMap({}); setWeg([]); setVerdecken(""); setBleibt(""); setAuftragId(neueId()); setMeldung(null); setPaket(null);
  }
  const entfernen = (k: string) => { const e = eintraege.find((x) => x.kennung === k); if (!e) return; setWeg([e, ...weg]); void rechnen(eintraege.filter((x) => x.kennung !== k)); };
  const zurueckholen = () => { const [e, ...rest] = weg; if (!e) return; setWeg(rest); void rechnen([...eintraege, e].sort((a, b) => a.kennung.localeCompare(b.kennung))); };
  const umschalten = (k: string) => { const st = stuecke.map((s) => (s.kennung === k ? { ...s, weglassen: !s.weglassen } : s)); setStuecke(st); void merken(st); };
  const darfBleiben = (wert: string) => { const b = bleibt ? `${bleibt}\n${wert}` : wert; setBleibt(b); void rechnen(eintraege, verdecken, b); };
  const immerVerdecken = (wert: string) => { const v = verdecken ? `${verdecken}\n${wert}` : wert; setVerdecken(v); void rechnen(eintraege, v, bleibt); };

  // Abgedeckte Bilder und das fertige Paket werden vorab gebaut – der Klick auf „ChatGPT“ muss sofort kopieren können.
  useEffect(() => {
    let aus = false;
    (async () => {
      const bilder: File[] = [];
      const vor: Record<string, string> = {};
      for (const s of stuecke.filter((x) => x.bild)) {
        const e = eintraege.find((x) => x.kennung === s.kennung); if (!e?.g.bild) continue;
        const b = await abgedeckt(e.g.bild, s.bild!.flaechen);
        vor[s.kennung] = URL.createObjectURL(b);
        if (!s.weglassen) bilder.push(new File([b], `${s.kennung}.png`, { type: "image/png" }));
      }
      if (aus) { Object.values(vor).forEach(URL.revokeObjectURL); return; }
      setVorschauen((alt) => { Object.values(alt).forEach(URL.revokeObjectURL); return vor; });
      const mit = mitBildern ? bilder : [];
      setPaket({ text: allesInEinerDatei(wahlMitId, stuecke), bild: await sammelbild(mit.map((f) => ({ name: f.name, blob: f }))), bilder: mit });
    })();
    return () => { aus = true; };
  }, [stuecke, eintraege, wahlMitId, mitBildern]);

  const gesperrt = () => {
    if (lecks.length) { setMeldung({ text: `Halt: In ${lecks.map((s) => s.kennung).join(", ")} steht noch ein verdeckter Wert im Klartext. Bitte ansehen und korrigieren.`, art: "halt" }); return true; }
    if (!raus.length) { setMeldung({ text: "Noch nichts zum Hinausgeben – zuerst eine Datei hineinlegen.", art: "halt" }); return true; }
    if (!paket) { setMeldung({ text: "Einen Augenblick – die Bilder werden noch abgedeckt.", art: "halt" }); return true; }
    return false;
  };

  async function zurKi(ziel?: (typeof ZIELE)[number]) {
    if (gesperrt()) return;
    const was = await kopieren(paket!.text, mitBildern ? paket!.bild : null);
    if (ziel) oeffnen(ziel.url);
    const mitBild = mitBildern && paket!.bild;
    setMeldung({ art: was === "nichts" ? "halt" : "gut", text: was === "nichts" ? <>Kopieren ging nicht. Nimm „Als Datei“ und lade sie bei der KI hoch.</> : <>
      {ziel ? <>{ziel.name} ist offen. </> : null}Kopiert: <strong>{was === "beides" ? "Text und Bild" : "Text"}</strong> – dort ins Eingabefeld klicken und <kbd>Strg</kbd>+<kbd>V</kbd> (am Handy: lange drücken → Einfügen).
      {mitBild && was === "beides" && <> Kommt das Bild nicht mit? <button type="button" className="text-link" onClick={async () => setMeldung({ art: "gut", text: (await bildKopieren(paket!.bild!)) ? "Jetzt liegt das Bild in der Zwischenablage – noch einmal einfügen." : "Bild kopieren ging nicht – „Als Datei“ lädt die Bilder herunter." })} data-bild-nochmal>Bild noch einmal kopieren</button>.</>}
      {mitBild && was === "text" && <> Das Bild konnte der Browser nicht mitkopieren – <button type="button" className="text-link" onClick={() => void alsDatei()}>Bilder als Datei</button>.</>}
    </> });
    await merken();
  }
  async function alsDatei() {
    if (gesperrt()) return;
    await herunterladen(`PseudoDoc ${name} fuer die KI.md`, paket!.text, "text/markdown;charset=utf-8");
    for (const f of paket!.bilder) await herunterladen(f.name, f);
    setMeldung({ art: "gut", text: `Gespeichert${paket!.bilder.length ? ` – dazu ${paket!.bilder.length} abgedeckte ${paket!.bilder.length === 1 ? "Bild" : "Bilder"}` : ""}. Bei der KI hochladen (Büroklammer).` });
  }
  async function alsZip() {
    if (gesperrt()) return;
    const z = zipBauen([...kiDateien(wahlMitId, stuecke).map((d) => ({ name: `${ORDNER.ki}/${d.name}`, daten: d.text })), ...(await Promise.all(paket!.bilder.map(async (f) => ({ name: `${ORDNER.ki}/${f.name}`, daten: new Uint8Array(await f.arrayBuffer()) }))))]);
    await herunterladen(`PseudoDoc ${name}.zip`, new Blob([z as BlobPart], { type: "application/zip" }));
  }
  const teilDateien = () => paket ? [new File([paket.text], "PseudoDoc fuer die KI.md", { type: "text/markdown" }), ...paket.bilder] : [];
  async function teilenKlick() { if (gesperrt()) return; if (!(await teilen(paket!.text, teilDateien()))) setMeldung({ art: "halt", text: "Teilen ging hier nicht – „Kopieren“ oder „Als Datei“ nehmen." }); else await merken(); }

  const anzeige = ansehen ? stuecke.find((s) => s.kennung === ansehen) : null;
  const deck = abdecken ? stuecke.find((s) => s.kennung === abdecken) : null;
  const deckE = abdecken ? eintraege.find((e) => e.kennung === abdecken) : null;
  const leer = eintraege.length === 0;

  return <>
    {meldung && <p className={`meldung ${meldung.art || ""}`} role="status" data-meldung>{meldung.text}</p>}
    {laeuft && <p className="meldung" role="status" data-laeuft><span className="drehen"/> {laeuft}</p>}

    <section className={`card pd-rein ${leer ? "leer" : ""}`} data-karte="rein">
      <div className={`pseudo-ablage ${ziehen ? "aktiv" : ""}`} onDragOver={(e) => { e.preventDefault(); setZiehen(true); }} onDragLeave={() => setZiehen(false)} onDrop={(e) => { e.preventDefault(); setZiehen(false); void ausZiehen(e.dataTransfer); }} data-ablage>
        <Upload size={leer ? 34 : 22}/><strong>{leer ? "Datei hier hineinziehen" : "Weitere Dateien dazu"}</strong>
        {leer && <span className="leise">Brief, Vertrag, AGB, PDF, Scan, Foto, E-Mail mit Anhängen, Word – auch ein ganzer Ordner</span>}
        <div className="button-row pd-rein-knoepfe">
          <button type="button" className="button primary" onClick={() => dateiWahl.current?.click()} data-dateien-waehlen><FileText size={18}/> Dateien wählen</button>
          <button type="button" className="button" onClick={() => ordnerWahl.current?.click()}><FolderOpen size={18}/> Ordner</button>
          <button type="button" className="button" onClick={() => kamera.current?.click()}><Camera size={18}/> Foto</button>
          {leer && <button type="button" className="button" onClick={async () => einlesen(await beispielDateien())} data-beispiel-hin>Beispiel ansehen</button>}
          {!leer && <button type="button" className="button" onClick={neuAnfangen} data-neu><RotateCcw size={18}/> Neu</button>}
        </div>
        <input ref={dateiWahl} type="file" multiple hidden onChange={(e) => { if (e.target.files) void ausFiles(e.target.files); e.target.value = ""; }} data-datei-eingabe/>
        <input ref={ordnerWahl} type="file" multiple hidden {...({ webkitdirectory: "" } as object)} onChange={(e) => { if (e.target.files) void ausFiles(e.target.files); e.target.value = ""; }}/>
        <input ref={kamera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { if (e.target.files) void ausFiles(e.target.files); e.target.value = ""; }}/>
      </div>
    </section>

    {!leer && <section className="card" data-karte="pruefen">
      <div className="card-heading"><h2>Pseudonymisiert</h2><span className="leise" data-zaehler>{Object.keys(map).length} Angaben verdeckt · {raus.length} von {stuecke.length} gehen mit</span></div>
      {weg.length > 0 && <p className="leise">{weg.length} entfernt · <button type="button" className="text-link" onClick={zurueckholen} data-zurueckholen><Undo2 size={15}/> zurückholen</button></p>}
      <ul className="pseudo-liste">
        {stuecke.map((s) => <li key={s.kennung} className={`pseudo-zeile ${s.weglassen ? "aus" : ""}`} data-stueck={s.kennung}>
          {s.bild && vorschauen[s.kennung] ? <button type="button" className="pd-daumen" onClick={() => setAbdecken(s.kennung)} title="Bild bearbeiten"><img src={vorschauen[s.kennung]} alt=""/></button> : <span className="pd-daumen pd-dateisymbol" aria-hidden="true"><FileText size={20}/></span>}
          <span className="pseudo-name"><strong><span className="pseudo-kennung">{s.kennung}</span> {s.pfad}</strong>
            <span className="chips">
              <span className="badge">{artName(s.art)}</span>
              {s.fassung && <span className="badge gut" data-verdeckt>{(s.fassung.match(TOKEN) || []).length} Stellen verdeckt</span>}
              {s.bild && <span className="badge du" data-flaechen>{s.bild.flaechen.length} {s.bild.flaechen.length === 1 ? "Fläche" : "Flächen"} schwarz</span>}
              {s.schon && <span className="badge">war schon pseudonymisiert</span>}
              {s.leck && <span className="badge warn" data-leck>Klartext übrig</span>}
              {!s.fassung && !s.bild && <span className="badge pruefen">bleibt draußen</span>}
              {s.unsicher.length > 0 && <span className="badge pruefen" title="Vorsichtshalber verdeckt – unter „Korrigieren“ freigeben" data-unsicher-zahl>{s.unsicher.length} vorsichtshalber</span>}
              {s.hinweis && <span className="leise">{s.hinweis}</span>}
            </span>
            {s.warnung?.length ? <span className="pd-warnung" data-warnung><ShieldAlert size={15}/> {s.warnung.join(" · ")} – geht nur als pseudonymisierter Text hinaus, bitte ansehen.</span> : null}
          </span>
          <span className="pseudo-knoepfe">
            <button type="button" className="info-knopf" title="Ansehen" aria-label={`${s.kennung} ansehen`} onClick={() => setAnsehen(s.kennung)} data-auge><Eye size={18}/></button>
            {s.bild && <button type="button" className="info-knopf" title="Bild bearbeiten: Stellen schwarz abdecken" aria-label={`${s.kennung} abdecken`} onClick={() => setAbdecken(s.kennung)} data-stift><Pencil size={18}/></button>}
            <label className="umschalter" title="Geht mit zur KI"><input type="checkbox" checked={!s.weglassen} onChange={() => umschalten(s.kennung)} disabled={!s.fassung && !s.bild} data-mit/> mit</label>
            <button type="button" className="info-knopf" title="Entfernen" aria-label={`${s.kennung} entfernen`} onClick={() => entfernen(s.kennung)} data-papierkorb><Trash2 size={18}/></button>
          </span>
        </li>)}
      </ul>
      <details className="korrigieren" data-korrigieren>
        <summary>Korrigieren</summary>
        {stuecke.some((s) => s.unsicher.length) && <p className="unsicher-zeile">Vorsichtshalber verdeckt – tippen, wenn es stehen bleiben darf: {[...new Set(stuecke.flatMap((s) => s.unsicher))].map((u) => <button key={u} type="button" className="chip unsicher" onClick={() => darfBleiben(u)} data-unsicher={u}>{u} ✓ darf bleiben</button>)}</p>}
        <div className="raster-2">
          <label>Immer verdecken (je Zeile ein Wort/Name)<textarea rows={3} value={verdecken} onChange={(e) => setVerdecken(e.target.value)} data-verdecken/></label>
          <label>Darf bleiben (je Zeile)<textarea rows={3} value={bleibt} onChange={(e) => setBleibt(e.target.value)} data-bleibt/></label>
        </div>
        <button type="button" className="button klein" onClick={() => void rechnen(eintraege)} data-neu-rechnen>Neu pseudonymisieren</button>
      </details>
    </section>}

    {!leer && <section className="card pd-ki" data-karte="ki">
      <div className="card-heading"><h2>Zur KI</h2><Info titel="Zur KI" punkte={["Ein Klick: Text (und Bild) liegt in der Zwischenablage, die KI öffnet sich – dort einfügen.", "Am Handy geht „Teilen“ direkt an die App der KI.", "Die KI bekommt einen kurzen Auftrag mit: was sie tun soll und dass sie die Platzhalter ⟦…⟧ stehen lassen muss.", "Ihre Antwort holst du unter „2 Zurück“ – dann stehen die echten Angaben wieder drin."]}/></div>
      <div className="chips pd-aufgabe">{AUFGABEN.filter((z) => z.id !== "frei").map((z) => <button key={z.id} type="button" className={`chip ${wahl.ziel === z.id ? "an" : ""}`} aria-pressed={wahl.ziel === z.id} onClick={() => setWahl({ ...wahl, ziel: z.id })} data-ziel={z.id}>{z.name}</button>)}
        <span className="pd-trenner" aria-hidden="true"/>
        {STILE.map((s) => { const an = wahl.stile.includes(s.id); return <button key={s.id} type="button" className={`chip leicht ${an ? "an" : ""}`} aria-pressed={an} onClick={() => setWahl({ ...wahl, stile: an ? wahl.stile.filter((x) => x !== s.id) : [...wahl.stile, s.id] })} data-stil={s.id}>{s.name}</button>; })}
      </div>
      <input className="pd-frei" value={wahl.frei} onChange={(e) => setWahl({ ...wahl, frei: e.target.value })} placeholder="Was soll die KI tun? (frei, z. B. „Bitte um Ratenzahlung in drei Raten“)" data-frei/>
      {bilderRaus.length > 0 && <label className="umschalter pd-bilder"><input type="checkbox" checked={mitBildern} onChange={(e) => setMitBildern(e.target.checked)} data-mit-bildern/> <BildSymbol size={16}/> {bilderRaus.length === 1 ? "Abgedecktes Bild mitgeben" : `${bilderRaus.length} abgedeckte Bilder mitgeben (als ein Bild)`}</label>}
      <div className="pd-ziele">
        {ZIELE.map((z) => <button key={z.id} type="button" className={`pd-ziel pd-ziel-${z.id}`} onClick={() => void zurKi(z)} disabled={!raus.length} data-ki={z.id}>
          <span className="pd-ziel-name">{z.name}</span><span className="pd-ziel-unter">kopieren &amp; öffnen</span></button>)}
      </div>
      <div className="button-row">
        <button type="button" className="button" onClick={() => void zurKi()} disabled={!raus.length} data-kopieren><Copy size={18}/> Nur kopieren</button>
        {teilenMoeglich(teilDateien()) && <button type="button" className="button" onClick={() => void teilenKlick()} data-teilen><Share2 size={18}/> Teilen …</button>}
        <button type="button" className="button" onClick={() => void alsDatei()} disabled={!raus.length} data-als-datei><FileDown size={18}/> Als Datei</button>
        <button type="button" className="button" onClick={() => void alsZip()} disabled={!raus.length} data-zip><Download size={18}/> ZIP</button>
        <button type="button" className="text-link" onClick={() => { void merken().then(() => zumRueckweg(auftragId)); }} data-zum-rueckweg>Antwort ist da → Zurück</button>
      </div>
    </section>}

    {anzeige && <Fenster titel={`${anzeige.kennung} · ${anzeige.pfad}`} zu={() => setAnsehen(null)}>
      <Ansicht s={anzeige} e={eintraege.find((x) => x.kennung === anzeige.kennung)!} map={map} url={bildUrl(anzeige.kennung, eintraege.find((x) => x.kennung === anzeige.kennung)?.g.bild)}
        vorschau={vorschauen[anzeige.kennung]} darfBleiben={darfBleiben} verdecken={immerVerdecken} meldung={(t) => setMeldung({ text: t, art: "gut" })}
        abdecken={() => { setAnsehen(null); setAbdecken(anzeige.kennung); }}/>
    </Fenster>}
    {deck?.bild && deckE?.g.bild && <div className="fenster-grund"><Abdecken bildUrl={bildUrl(deck.kennung, deckE.g.bild)} breite={deck.bild.breite} hoehe={deck.bild.hoehe} anfang={deck.bild.flaechen} vorschlaege={deckE.vorschlaege} titel={`${deck.kennung} · ${deck.pfad}`}
      abbrechen={() => setAbdecken(null)} fertig={(f) => { const st = stuecke.map((s) => (s.kennung === deck.kennung ? { ...s, bild: { ...s.bild!, flaechen: f } } : s)); setStuecke(st); setAbdecken(null); void merken(st); }}/></div>}
  </>;
}

function Fenster({ titel, zu, children }: { titel: string; zu: () => void; children: ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") zu(); }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); });
  return <div className="fenster-grund" onClick={(e) => { if (e.target === e.currentTarget) zu(); }}>
    <div className="fenster" role="dialog" aria-label={titel} data-fenster>
      <div className="fenster-kopf"><strong>{titel}</strong><button type="button" className="info-knopf" aria-label="Schließen" onClick={zu} data-fenster-zu><X size={18}/></button></div>
      <div className="fenster-inhalt">{children}</div>
    </div>
  </div>;
}

function Ansicht({ s, map, url, vorschau, darfBleiben, verdecken, meldung, abdecken }: { s: Stueck; e: Eintrag; map: Record<string, string>; url: string; vorschau?: string; darfBleiben: (w: string) => void; verdecken: (w: string) => void; meldung: (t: string) => void; abdecken: () => void }) {
  const [reiter, setReiter] = useState<"ki" | "original">("ki");
  const [tok, setTok] = useState<string | null>(null);
  const auswahlVerdecken = () => { const t = String(getSelection() || "").trim(); if (t.length >= 2) { verdecken(t); meldung(`„${t}“ wird ab jetzt verdeckt.`); } };
  return <>
    <div className="reiter-leiste" role="tablist">
      <button type="button" role="tab" aria-selected={reiter === "ki"} className={reiter === "ki" ? "aktiv" : ""} onClick={() => setReiter("ki")} data-reiter="ki">Das sieht die KI</button>
      <button type="button" role="tab" aria-selected={reiter === "original"} className={reiter === "original" ? "aktiv" : ""} onClick={() => setReiter("original")} data-reiter="original">Original</button>
    </div>
    {reiter === "ki" ? <>
      {s.bild && vorschau && <figure className="pseudo-bild"><img src={vorschau} alt="Abgedecktes Bild für die KI" data-vorschau-bild/><figcaption className="leise">{s.bild.flaechen.length} schwarze {s.bild.flaechen.length === 1 ? "Fläche" : "Flächen"} · neu gezeichnet, ohne Metadaten · <button type="button" className="text-link" onClick={abdecken}><Pencil size={14}/> bearbeiten</button></figcaption></figure>}
      {s.fassung ? <>
        <pre className="pseudo-text" data-fassung>{markiert(s.fassung, map, setTok)}</pre>
        {tok && <p className="meldung" data-platzhalter-info>{tok} steht für „{map[tok]}“ · <button type="button" className="text-link" onClick={() => { darfBleiben(map[tok]); setTok(null); }}>darf bleiben</button></p>}
        <span className="leise">Tipp auf einen Platzhalter zeigt, wofür er steht (nur hier).</span>
      </> : !s.bild && <p className="leise">Kein Text lesbar – diese Datei geht nicht mit.</p>}
    </> : <>
      {url && <figure className="pseudo-bild"><img src={url} alt="Original" data-original-bild/></figure>}
      {s.text && <><pre className="pseudo-text" data-original-text>{s.text}</pre>
        <div className="button-row"><button type="button" className="button klein" onClick={auswahlVerdecken} data-auswahl-verdecken>Markiertes immer verdecken</button><span className="leise">Text markieren, dann tippen.</span></div></>}
    </>}
  </>;
}

/** Rückweg-Bericht: Platzhalter und Neues (Kern) plus Prüfkern auf das Ergebnis (Anweisungen an eine KI, Links, Tarnung). */
async function rueckBericht(antwort: string, ergebnis: string, map: Record<string, string>, gesendet: string): Promise<Punkt[]> {
  const kern = rueckwegPruefen(antwort, ergebnis, map, gesendet);
  const pk = ausBefunden(await pruefeMail(ergebnis).catch(() => [])).filter((x) => !/UNSICHTBARE-ZEICHEN|LINK-|MAILADRESSE|IBAN|TELEFON/.test(x.kennung) || x.stufe === "achtung")
    .filter((x) => !kern.some((k) => k.kennung === x.kennung));
  const alle = [...kern.filter((k) => k.stufe !== "ok"), ...pk];
  return alle.length ? alle : kern;
}

// ── 2 · Zurück ──────────────────────────────────────────────────────────────────────────────────────────────────────
type Ergebnis = (Zurueck & { art: "text"; antwort: string; bericht: Punkt[] }) | { art: "bild"; name: string; url: string; blob: Blob; hinweis: string };

function ZurueckSeite({ start }: { start: string }) {
  const [liste, setListe] = useState<speicher.Auftrag[] | null>(null);
  const [id, setId] = useState(start);
  const [geladen, setGeladen] = useState<{ auftrag: speicher.Auftrag; map: Record<string, string> } | null>(null);
  const [eingabe, setEingabe] = useState("");
  const [ergebnisse, setErgebnisse] = useState<Ergebnis[]>([]);
  const [meldung, setMeldung] = useState<{ text: string; art?: "halt" | "gut" } | null>(null);
  const wahl = useRef<HTMLInputElement>(null), sicherung = useRef<HTMLInputElement>(null);
  const p = modul25();
  const neu = () => void speicher.alle().then((l) => { setListe(l); if (!l.some((a) => a.id === id)) setId(l[0]?.id || ""); }).catch(() => { setListe([]); setMeldung({ text: "Gespeicherte Aufträge sind in diesem Fenster nicht lesbar.", art: "halt" }); });
  useEffect(neu, [start]);
  useEffect(() => { if (id) void speicher.laden(id).then(setGeladen).catch(() => setGeladen(null)); else setGeladen(null); }, [id]);

  async function verarbeiten(antworten: Array<{ name: string; text?: string; bild?: Blob }>) {
    if (!p) return;
    let g = geladen;
    const erkannt = antworten.map((a) => a.text && auftragAusText(a.text)).find(Boolean);
    if (erkannt && erkannt !== id && liste?.some((x) => x.id === erkannt)) { setId(erkannt); g = await speicher.laden(erkannt); setMeldung({ text: "Auftrag an der Kennung in der Antwort erkannt." }); }
    if (!g) { setMeldung({ text: "Bitte zuerst den Auftrag wählen.", art: "halt" }); return; }
    const texte = antworten.filter((a) => a.text != null).map((a) => ({ name: a.name, text: a.text! }));
    const gesendet = g.auftrag.stuecke.map((s) => s.fassung || "").join("\n");
    const neu: Ergebnis[] = await Promise.all(antwortenZurueck(p, texte, g.map).map(async (z, k) => ({ ...z, art: "text" as const, antwort: texte[k].text, bericht: await rueckBericht(texte[k].text, z.text, g!.map, gesendet) })));
    for (const a of antworten.filter((x) => x.bild)) {
      const k = a.name.match(/D\d{2,}/)?.[0];
      const st = g.auftrag.stuecke.find((s) => s.kennung === k);
      const orig = k ? await speicher.bildHolen(g.auftrag.id, k) : undefined;
      if (!st?.bild || !orig) { neu.push({ art: "bild", name: a.name, url: URL.createObjectURL(a.bild!), blob: a.bild!, hinweis: "Kein Original dazu gefunden (der Name muss die Kennung tragen, z. B. D04.png) – unverändert." }); continue; }
      const b = await bildZurueck(orig, a.bild!, st.bild.flaechen);
      neu.push({ art: "bild", name: `${k} (zurueck).png`, url: URL.createObjectURL(b), blob: b, hinweis: `${st.bild.flaechen.length} abgedeckte Stellen aus dem Original wieder eingesetzt.` });
    }
    setErgebnisse([...neu, ...ergebnisse]);
  }
  async function dateienLesen(files: File[]) {
    await verarbeiten(await Promise.all(files.map(async (f) => {
      if (/\.(png|jpe?g|webp)$/i.test(f.name) || f.type.startsWith("image/")) return { name: f.name, bild: f as Blob };
      if (/\.(docx|odt)$/i.test(f.name)) return { name: f.name, text: await officeText(new Uint8Array(await f.arrayBuffer()), f.name) };
      return { name: f.name, text: await f.text() };
    })));
  }
  const aendern = (i: number, text: string) => setErgebnisse(ergebnisse.map((e, k) => (k === i && e.art === "text" ? { ...e, text } : e)));
  async function neuPruefen(i: number, text?: string) {
    const e = ergebnisse[i]; if (e.art !== "text" || !geladen) return;
    const t = text ?? e.text;
    const bericht = await rueckBericht(e.antwort, t, geladen.map, geladen.auftrag.stuecke.map((s) => s.fassung || "").join("\n"));
    setErgebnisse((alt) => alt.map((x, k) => (k === i && x.art === "text" ? { ...x, text: t, bericht } : x)));
  }
  const loeschen = (i: number) => { const e = ergebnisse[i]; if (e.art === "bild") URL.revokeObjectURL(e.url); setErgebnisse(ergebnisse.filter((_, k) => k !== i)); };
  const tage = (a: speicher.Auftrag) => Math.max(0, Math.ceil((a.geaendert + speicher.HALTBAR_TAGE * 864e5 - Date.now()) / 864e5));
  async function sichern(a: speicher.Auftrag) {
    const pw = prompt("Passwort für die Sicherung (mindestens 8 Zeichen). Ohne Passwort lässt sie sich nicht öffnen.");
    if (!pw) return; if (pw.length < 8) { setMeldung({ text: "Passwort zu kurz.", art: "halt" }); return; }
    await herunterladen(`${dateiname(a.name)}.zuordnung.json`, await speicher.sicherungDatei(a.id, pw), "application/json");
    setMeldung({ text: "Zuordnung verschlüsselt gesichert. Diese Datei nie an eine KI geben.", art: "gut" });
  }
  async function einlesen(f: File) {
    const pw = prompt("Passwort der Sicherung"); if (!pw) return;
    try { const a = await speicher.sicherungEinlesen(await f.text(), pw); setMeldung({ text: `„${a.name}“ ist wieder da.`, art: "gut" }); setId(a.id); neu(); } catch (e) { setMeldung({ text: (e as Error).message, art: "halt" }); }
  }

  return <>
    {meldung && <p className={`meldung ${meldung.art || ""}`} role="status" data-meldung>{meldung.text}</p>}
    <section className="card" data-karte="antwort">
      <div className="card-heading"><h2>Antwort der KI zurückholen</h2><Info titel="Zurück" punkte={["Antwort der KI einfügen oder als Datei wählen (Text, Markdown, Word; Bilder mit der Kennung im Namen, z. B. D04.png).", "Die Platzhalter werden durch die echten Angaben ersetzt – nur hier auf dem Gerät.", "Hat die KI einen Platzhalter verändert oder erfunden, steht er gelb da.", "Bilder: die abgedeckten Stellen kommen aus dem Original zurück."]}/></div>
      {liste && liste.length > 1 && <label className="feld">Auftrag<select value={id} onChange={(e) => setId(e.target.value)} data-auftrag-wahl>{liste.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.stuecke.length} Dateien</option>)}</select></label>}
      {liste && !liste.length && <p className="leise" data-keine-auftraege>Noch kein Auftrag – unter „1 Zur KI“ fängt einer an.</p>}
      <textarea className="pd-antwort" rows={7} value={eingabe} onChange={(e) => setEingabe(e.target.value)} placeholder="Antwort der KI hier einfügen …" data-antwort/>
      <div className="button-row">
        <button type="button" className="button primary" disabled={!eingabe.trim() || !geladen} onClick={() => { void verarbeiten([{ name: "antwort.md", text: eingabe }]); setEingabe(""); }} data-zurueckfuehren><ArchiveRestore size={18}/> Zurückholen</button>
        <button type="button" className="button" disabled={!geladen} onClick={() => wahl.current?.click()}><FileText size={18}/> Antwort-Datei wählen</button>
        <input ref={wahl} type="file" multiple hidden accept=".md,.txt,.markdown,.docx,.odt,.png,.jpg,.jpeg,.webp,text/*,image/*" onChange={(e) => { if (e.target.files) void dateienLesen([...e.target.files]); e.target.value = ""; }} data-antwort-dateien/>
      </div>
    </section>
    {ergebnisse.length > 0 && <section className="card" data-karte="ergebnisse">
      <h2>Mit echten Angaben</h2>
      {ergebnisse.map((e, i) => <article key={`${e.name}-${i}`} className="ergebnis" data-ergebnis={e.art}>
        <div className="titel-zeile"><strong>{e.name}</strong>
          {e.art === "text" ? <>{e.ersetzt > 0 && <span className="badge gut">{e.ersetzt} Angaben eingesetzt</span>}{e.offen.length > 0 && <span className="badge pruefen" data-offen>unbekannt: {e.offen.join(", ")}</span>}</> : <span className="leise">{e.hinweis}</span>}
        </div>
        {e.art === "text" ? <>
          <BerichtAnzeige titel="Rückweg geprüft" punkte={e.bericht}/>
          <textarea className="ergebnis-text" rows={Math.min(18, Math.max(5, e.text.split("\n").length + 1))} value={e.text} onChange={(x) => aendern(i, x.target.value)} data-ergebnis-text/>
          <div className="button-row">
            <button type="button" className="button klein primary" onClick={async () => setMeldung((await kopieren(e.text, null)) !== "nichts" ? { text: "Kopiert.", art: "gut" } : { text: "Kopieren ging nicht.", art: "halt" })} data-ergebnis-kopieren><Copy size={16}/> Kopieren</button>
            <button type="button" className="button klein" onClick={() => void herunterladen(e.name.replace(/\.md$/, ".docx"), new Blob([docxBauen(e.text) as BlobPart], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }))} data-word><FileDown size={16}/> Word</button>
            <button type="button" className="button klein" onClick={() => void herunterladen(e.name, e.text, "text/markdown;charset=utf-8")}><FileDown size={16}/> Text</button>
            <button type="button" className="button klein" onClick={() => void neuPruefen(i)} data-rueck-pruefen><RotateCcw size={16}/> Erneut prüfen</button>
            {(e.text.match(UNSICHTBAR) || []).length > 0 && <button type="button" className="button klein" onClick={() => void neuPruefen(i, sauber(e.text))} data-unsichtbar-weg>Unsichtbare Zeichen entfernen</button>}
            {teilenMoeglich([new File([e.text], "x.txt", { type: "text/plain" })]) && <button type="button" className="button klein" onClick={() => void teilen(e.text, [])} data-ergebnis-teilen><Share2 size={16}/> Teilen …</button>}
            <button type="button" className="button klein" onClick={() => loeschen(i)} data-ergebnis-loeschen><Trash2 size={16}/> Löschen</button>
          </div>
        </> : <>
          <img className="ergebnis-bild" src={e.url} alt={e.name}/>
          <div className="button-row">
            <button type="button" className="button klein primary" onClick={() => void herunterladen(e.name, e.blob)}><Download size={16}/> Speichern</button>
            <button type="button" className="button klein" onClick={() => loeschen(i)}><Trash2 size={16}/> Löschen</button>
          </div>
        </>}
      </article>)}
    </section>}
    <section className="card" data-karte="auftraege">
      <div className="card-heading"><h2>Aufträge auf diesem Gerät</h2><Info titel="Aufträge" punkte={["Jeder Auftrag merkt sich die Zuordnung – verschlüsselt, nur auf diesem Gerät.", `Nach ${speicher.HALTBAR_TAGE} Tagen ohne Änderung wird er gelöscht; „Erledigt“ löscht sofort.`, "„Sichern“ legt die Zuordnung mit Passwort in eine Datei – für ein anderes Gerät. Nie an eine KI geben."]}/></div>
      {liste?.length ? <ul className="pseudo-liste">{liste.map((a) => <li key={a.id} className="pseudo-zeile" data-auftrag={a.id}>
        <span className="pseudo-name"><strong>{a.name}</strong><span className="leise" data-auftrag-stand>{`${a.stuecke.length} Dateien · noch ${tage(a)} Tage`}</span></span>
        <span className="pseudo-knoepfe">
          <button type="button" className="button klein" onClick={() => void sichern(a)}><KeyRound size={16}/> Sichern</button>
          <button type="button" className="button klein" onClick={async () => { if (confirm(`„${a.name}“ erledigt? Die Zuordnung wird gelöscht – Zurückholen geht danach nicht mehr.`)) { await speicher.loeschen(a.id); neu(); } }} data-erledigt><Trash2 size={16}/> Erledigt</button>
        </span>
      </li>)}</ul> : <p className="leise">Keine.</p>}
      <div className="button-row" style={{ marginTop: 10 }}>
        <button type="button" className="button klein" onClick={() => sicherung.current?.click()}><Upload size={16}/> Sicherung einlesen</button>
        <input ref={sicherung} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void einlesen(f); e.target.value = ""; }}/>
      </div>
    </section>
  </>;
}
