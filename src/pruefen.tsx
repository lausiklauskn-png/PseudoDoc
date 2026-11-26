// 0.2.0 (Klaus 26.11.2026): „prüft, was reingeht … prüft, was rausgeht“. Zwei Wege auf derselben Seite:
//  Rein – kann ich das öffnen? (Prüfkern des Auslieferungsprüfers, byte-gleich mit Pin)
//  Raus – kann ich das weitergeben? (Prüfkern + personenbezogene Angaben + bereinigte Kopie; Original bleibt unverändert)
// Kein Virenscanner. Was nicht gelesen werden kann, heißt „nicht geprüft“, nie „in Ordnung“.
import { useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Download, FileText, FolderOpen, Info as InfoSymbol, RotateCcw, Share2, ShieldAlert, TriangleAlert, Upload } from "lucide-react";
import { Info } from "./ui.tsx";
import { erkenneArt } from "../lib/bausteine/dateiart.ts";
import { officeText } from "../lib/bausteine/zip.ts";
import { auftragMaskieren, sauber, UNSICHTBAR, kennung as kennungAus, type Stueck } from "../lib/pseudo/auftrag.ts";
import { officeBereinigen, pdfAusBildern, kopieName } from "../lib/pseudo/bereinigen.ts";
import { docxBauen } from "../lib/pseudo/pakete.ts";
import { gesamt, type Punkt, type Stufe } from "../lib/pseudo/rueckweg.ts";
import type { Pseudonymisierer } from "../lib/maske/ki-auftrag.ts";
import { pruefen, pruefeMail, WARNUNG, type Befund } from "./pruefkern.ts";
import { lesen, pdfjs, ueberspringen, type Eingang } from "./lesen.ts";
import { abgedeckt } from "./bild.ts";
import { herunterladen } from "./ordner.ts";
import { teilen, teilenMoeglich } from "./ki.ts";

const modul25 = () => (window as unknown as { SbkimPseudonym?: Pseudonymisierer }).SbkimPseudonym;

const ACHTUNG = /ANHANG-|LINK-TARNUNG|ABSENDER-TARNUNG|ADRESS-TRICK|KONTO-WECHSEL|PRUEFUNG-DURCHGEFALLEN|PDF-AKTION|KI-ANWEISUNG/;
export const stufeVon = (kennung: string): Stufe => (WARNUNG.test(kennung) || ACHTUNG.test(kennung) ? "achtung" : "hinweis");
export const ausBefunden = (b: Befund[]): Punkt[] => [...new Map(b.map((x) => [`${x.kennung}|${x.satz}`, { stufe: stufeVon(x.kennung), kennung: x.kennung, satz: x.satz.replace(/ \([^()]*\)$/, "") } as Punkt])).values()];

const STUFE_NAME: Record<Stufe, string> = { achtung: "Achtung", hinweis: "Hinweis", ok: "In Ordnung" };
const STUFE_KLASSE: Record<Stufe, string> = { achtung: "warn", hinweis: "pruefen", ok: "gut" };

/** Bericht wie ein kurzer Arztbrief: schlimmste Stufe oben, dann jeder Punkt mit Stufe. */
export function BerichtAnzeige({ punkte, titel }: { punkte: Punkt[]; titel?: ReactNode }) {
  const g = gesamt(punkte);
  const Symbol = g === "achtung" ? ShieldAlert : g === "hinweis" ? TriangleAlert : CheckCircle2;
  return <div className={`pd-bericht stufe-${g}`} data-bericht={g}>
    {titel && <div className="pd-bericht-kopf"><Symbol size={18}/> {titel} <span className={`badge ${STUFE_KLASSE[g]}`} data-gesamt>{STUFE_NAME[g]}</span></div>}
    <ul>{punkte.map((p, i) => <li key={`${p.kennung}-${i}`} data-punkt={p.kennung} data-stufe={p.stufe}><span className={`badge ${STUFE_KLASSE[p.stufe]}`}>{STUFE_NAME[p.stufe]}</span> {p.satz}</li>)}</ul>
  </div>;
}

type Art = "pdf" | "bild" | "office" | "text" | "email" | "andere";
function artVon(e: Eingang): Art {
  const a = erkenneArt(e.name, e.bytes.slice(0, 600)).art;
  if (a === "pdf" || a === "bild" || a === "email" || a === "text") return a;
  if (a === "office" || a === "archiv" && /\.(docx|xlsx|pptx|odt|ods|odp)$/i.test(e.name)) return "office";
  if (/\.(txt|md|csv|json|html?|xml)$/i.test(e.name)) return "text";
  return "andere";
}

/** Personenbezogene Angaben zählen (Maske der Familienakte, wie bei „Zur KI“). */
function personenAngaben(text: string): { punkt: Punkt | null; fassung: string } {
  const p = modul25();
  if (!p || !text.trim()) return { punkt: null, fassung: "" };
  const st: Stueck = { kennung: kennungAus(0), pfad: "x", art: "text", text, fassung: "", funde: 0, unsicher: [], leck: null, schon: false };
  const r = auftragMaskieren(p, [st], { verdecken: [], bleibt: [] });
  const sorten = new Map<string, number>();
  for (const t of Object.keys(r.map)) { const s = t.match(/^⟦([A-Z_]+)-/)?.[1] || "ANGABE"; sorten.set(s, (sorten.get(s) || 0) + 1); }
  const NAME: Record<string, string> = { NAME: "Namen", PERSON: "Namen", ADRESSE: "Anschriften", ANSCHRIFT: "Anschriften", IBAN: "IBAN", MAIL: "Mailadressen", TELEFON: "Telefonnummern", SCHLUESSEL: "Zugangsschlüssel", DATUM: "Geburtsdaten", KUNDENNUMMER: "Kundennummern" };
  const liste = [...sorten].map(([s, n]) => `${n} × ${NAME[s] || s.toLowerCase()}`);
  return { fassung: r.stuecke[0].fassung, punkt: liste.length ? { stufe: sorten.has("SCHLUESSEL") ? "achtung" : "hinweis", kennung: "PERSONENBEZUG", satz: `Enthält personenbezogene Angaben: ${liste.join(", ")}. Wer sie nicht sehen soll, bekommt die Kopie mit Haken „auch pseudonymisieren“.` } : null };
}

/** Eine Datei prüfen. Rein: was sie verbirgt. Raus: zusätzlich, was an Persönlichem darin steht. */
export async function dateiPruefen(e: Eingang, modus: "rein" | "raus"): Promise<{ punkte: Punkt[]; text: string }> {
  const art = artVon(e);
  const punkte: Punkt[] = [];
  let text = "";
  try {
    if (art === "email") {
      const roh = new TextDecoder("utf-8").decode(e.bytes);
      punkte.push(...ausBefunden(await pruefeMail(roh)));
    } else if (art === "text") {
      text = new TextDecoder("utf-8").decode(e.bytes);
      punkte.push(...ausBefunden([...(await pruefen(e.name, e.bytes, /\.html?$/i.test(e.name) ? "html" : "text")).befunde, ...(await pruefeMail(text))]));
    } else {
      punkte.push(...ausBefunden((await pruefen(e.name, e.bytes, art === "pdf" ? "pdf" : "anhang")).befunde));
    }
  } catch (err) {
    punkte.push({ stufe: "hinweis", kennung: "NICHT-GEPRUEFT", satz: `Konnte nicht vollständig geprüft werden (${(err as Error).message}). Das heißt nicht „in Ordnung“.` });
  }
  if (art === "andere") punkte.push({ stufe: "hinweis", kennung: "ART-UNBEKANNT", satz: "Diese Dateiart kennt PseudoDoc nicht genau. Geprüft wurde nur, ob sie ein Programm ist oder ihre Endung täuscht." });
  if (modus === "raus" && art !== "bild" && art !== "andere") {
    if (!text) {
      if (art === "office" && /\.(docx|odt)$/i.test(e.name)) text = await officeText(e.bytes, e.name).catch(() => "");
      else if (art === "pdf" || art === "email" || art === "office") text = (await lesen(e, () => {}).catch(() => [])).map((g) => g.stueck.text).join("\n");
    }
    const u = (text.match(UNSICHTBAR) || []).length;
    if (u && !punkte.some((p) => p.kennung === "UNSICHTBARE-ZEICHEN")) punkte.push({ stufe: "achtung", kennung: "UNSICHTBARE-ZEICHEN", satz: `${u} unsichtbare Zeichen im Text. In der Kopie entfernt.` });
    const pa = personenAngaben(sauber(text)).punkt; if (pa) punkte.push(pa);
  }
  if (!punkte.length) punkte.push({ stufe: "ok", kennung: "NICHTS-GEFUNDEN", satz: modus === "rein" ? "Nichts Verstecktes gefunden: keine Anweisung an eine KI, kein versteckter Text, kein Makro, kein getarntes Programm." : "Nichts gefunden, was nicht mit hinausgehen sollte." });
  return { punkte, text };
}

/** Bereinigte Kopie bauen. Das Original wird nie verändert. */
export async function bereinigen(e: Eingang, text: string, mitPseudo: boolean): Promise<{ dateien: File[]; punkte: Punkt[] }> {
  const art = artVon(e), dateien: File[] = [], punkte: Punkt[] = [];
  if (art === "bild") {
    const typ = /\.png$/i.test(e.name) ? "image/png" : /\.webp$/i.test(e.name) ? "image/webp" : "image/jpeg";
    dateien.push(new File([await abgedeckt(new Blob([e.bytes as BlobPart], { type: typ }), [])], kopieName(e.name, ".png"), { type: "image/png" }));
    punkte.push({ stufe: "ok", kennung: "BILD-NEU-GEZEICHNET", satz: "Bild neu gezeichnet: keine Kamera-, Orts- oder Zeitangaben, kein Anhängsel hinter dem Bildende." });
  } else if (art === "office") {
    const r = /\.(docx|xlsx|pptx|odt|ods|odp)$/i.test(e.name) ? await officeBereinigen(e.bytes) : null;
    if (r) { dateien.push(new File([r.bytes as BlobPart], kopieName(e.name))); punkte.push(...r.punkte); }
    else punkte.push({ stufe: "hinweis", kennung: "KEINE-KOPIE", satz: "Für das alte Office-Format gibt es keine bereinigte Kopie. Im Programm als .docx/.xlsx/.pptx speichern und noch einmal prüfen." });
  } else if (art === "pdf") {
    const doc = await (await pdfjs()).getDocument({ data: e.bytes.slice(), isEvalSupported: false, verbosity: 0 }).promise;
    try {
      if (doc.numPages > 60) punkte.push({ stufe: "hinweis", kennung: "KEINE-KOPIE", satz: `Das PDF hat ${doc.numPages} Seiten – über 60 wird keine Kopie gebaut.` });
      else {
        const seiten = [];
        for (let n = 1; n <= doc.numPages; n++) {
          const s = await doc.getPage(n); const v1 = s.getViewport({ scale: 1 }); const vp = s.getViewport({ scale: 2 });
          const c = document.createElement("canvas"); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
          const ctx = c.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
          await s.render({ canvasContext: ctx, viewport: vp }).promise;
          const b = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.9));
          if (!b) throw new Error("Seite nicht gezeichnet");
          seiten.push({ jpeg: new Uint8Array(await b.arrayBuffer()), breite: c.width, hoehe: c.height, punktBreite: v1.width, punktHoehe: v1.height });
        }
        dateien.push(new File([pdfAusBildern(seiten) as BlobPart], kopieName(e.name), { type: "application/pdf" }));
        punkte.push({ stufe: "ok", kennung: "PDF-NEU-GEBAUT", satz: "PDF aus Seitenbildern neu gebaut: keine Dokument-Infos, keine Anhänge, kein versteckter Text. Der Text ist danach nicht mehr markierbar." });
      }
    } finally { await doc.destroy(); }
  } else if (art === "text") {
    const s = sauber(text);
    dateien.push(new File([s], kopieName(e.name), { type: "text/plain;charset=utf-8" }));
    punkte.push({ stufe: "ok", kennung: "TEXT-SAUBER", satz: "Text ohne unsichtbare Zeichen." });
  } else {
    punkte.push({ stufe: "hinweis", kennung: "KEINE-KOPIE", satz: art === "email" ? "Für Mails gibt es keine bereinigte Kopie. Anhänge einzeln hineinlegen." : "Für diese Dateiart gibt es keine bereinigte Kopie." });
  }
  if (mitPseudo) {
    const { fassung } = personenAngaben(sauber(text));
    if (fassung) {
      const docx = /\.(docx|odt|pdf)$/i.test(e.name) || art === "office";
      dateien.push(docx ? new File([docxBauen(fassung) as BlobPart], kopieName(e.name, "-pseudonymisiert.docx").replace("-bereinigt-pseudonymisiert", "-pseudonymisiert")) : new File([fassung], kopieName(e.name, "-pseudonymisiert.txt").replace("-bereinigt-pseudonymisiert", "-pseudonymisiert"), { type: "text/plain;charset=utf-8" }));
      punkte.push({ stufe: "ok", kennung: "PSEUDONYMISIERT", satz: `Pseudonymisierte Fassung als ${docx ? "Word-Datei" : "Text"} (nur der Text, ohne Gestaltung). Die Zuordnung wird hier nicht gemerkt – wer eine Antwort zurückholen will, nimmt den Weg „Zur KI“.` });
    } else if (art !== "bild") punkte.push({ stufe: "hinweis", kennung: "NICHTS-ZU-PSEUDONYMISIEREN", satz: "Kein lesbarer Text oder nichts Persönliches gefunden – keine pseudonymisierte Fassung." });
    else punkte.push({ stufe: "hinweis", kennung: "BILD-ABDECKEN", satz: "Bilder pseudonymisiert man durch Abdecken – das geht im Weg „Zur KI“." });
  }
  return { dateien, punkte };
}

type Zeile = { e: Eingang; punkte: Punkt[]; text: string; kopie?: { dateien: File[]; punkte: Punkt[] } };

/** Seite „Rein“ oder „Raus“: Dateien hineinlegen, Bericht je Datei, bei „Raus“ die bereinigte Kopie. */
export function PruefSeite({ modus }: { modus: "rein" | "raus" }) {
  const [zeilen, setZeilen] = useState<Zeile[]>([]);
  const [laeuft, setLaeuft] = useState("");
  const [mitPseudo, setMitPseudo] = useState(false);
  const [ziehen, setZiehen] = useState(false);
  const [meldung, setMeldung] = useState("");
  const wahl = useRef<HTMLInputElement>(null), ordner = useRef<HTMLInputElement>(null);

  async function einlesen(eingaenge: Eingang[]) {
    const neu: Zeile[] = [];
    const liste = eingaenge.filter((x) => !ueberspringen(x.name));
    for (let i = 0; i < liste.length; i++) {
      setLaeuft(`Prüfe ${i + 1} von ${liste.length}: ${liste[i].name}`);
      const r = await dateiPruefen(liste[i], modus);
      const z: Zeile = { e: liste[i], ...r };
      if (modus === "raus") { setLaeuft(`Bereinige ${liste[i].name}`); z.kopie = await bereinigen(liste[i], r.text, mitPseudo).catch((err) => ({ dateien: [], punkte: [{ stufe: "hinweis" as const, kennung: "KEINE-KOPIE", satz: `Kopie ging nicht: ${(err as Error).message}` }] })); }
      neu.push(z);
    }
    setZeilen((alt) => [...neu, ...alt]); setLaeuft("");
  }
  const ausFiles = async (l: FileList | File[]) => einlesen(await Promise.all([...l].map(async (f) => ({ pfad: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name, name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) }))));
  async function speichern(f: File) { await herunterladen(f.name, f, f.type || "application/octet-stream"); setMeldung(`„${f.name}“ gespeichert.`); }

  const rein = modus === "rein";
  return <>
    {meldung && <p className="meldung gut" role="status" data-meldung>{meldung}</p>}
    {laeuft && <p className="meldung" role="status" data-laeuft><span className="drehen"/> {laeuft}</p>}
    <section className={`card pd-rein ${zeilen.length ? "" : "leer"}`} data-karte={`pruef-${modus}`}>
      <div className="card-heading"><h2>{rein ? "Rein · Kann ich das öffnen?" : "Raus · Kann ich das weitergeben?"}</h2>
        <Info titel={rein ? "Rein" : "Raus"} punkte={rein
          ? ["Prüft eine Datei oder Mail, bevor du sie öffnest oder einer KI gibst: versteckter Text, Anweisungen an eine KI, Makros, getarnte Programme, fremde Links, Absender, der nicht passt.", "Alles auf diesem Gerät, nichts wird hochgeladen.", "Kein Virenscanner: geprüft werden Inhalt und Aufbau, nicht Schadcode."]
          : ["Prüft, was in einer Datei steckt, bevor du sie weitergibst: Ort im Foto, Autor und Kommentare, versteckter Text, personenbezogene Angaben.", "Legt eine bereinigte Kopie an. Das Original bleibt unverändert.", "Mit Haken zusätzlich eine pseudonymisierte Fassung (nur der Text).", "Pseudonymisiert ist nicht anonym (DSGVO Art. 4 Nr. 5)."]}/></div>
      <div className={`pseudo-ablage ${ziehen ? "aktiv" : ""}`} onDragOver={(e) => { e.preventDefault(); setZiehen(true); }} onDragLeave={() => setZiehen(false)} onDrop={(e) => { e.preventDefault(); setZiehen(false); void ausFiles(e.dataTransfer.files); }} data-ablage>
        <Upload size={zeilen.length ? 22 : 34}/><strong>{rein ? "Datei oder Mail hier hineinziehen" : "Datei, die hinausgehen soll, hier hineinziehen"}</strong>
        <div className="button-row pd-rein-knoepfe">
          <button type="button" className="button primary" onClick={() => wahl.current?.click()} data-pruef-waehlen><FileText size={18}/> Dateien wählen</button>
          <button type="button" className="button" onClick={() => ordner.current?.click()}><FolderOpen size={18}/> Ordner</button>
          {zeilen.length > 0 && <button type="button" className="button" onClick={() => { setZeilen([]); setMeldung(""); }} data-pruef-neu><RotateCcw size={18}/> Neu</button>}
        </div>
        {!rein && <label className="umschalter" data-pseudo-haken-feld><input type="checkbox" checked={mitPseudo} onChange={(e) => setMitPseudo(e.target.checked)} data-pseudo-haken/> auch pseudonymisieren (Namen, Nummern → Platzhalter)</label>}
        <input ref={wahl} type="file" multiple hidden onChange={(e) => { if (e.target.files) void ausFiles(e.target.files); e.target.value = ""; }} data-pruef-eingabe/>
        <input ref={ordner} type="file" multiple hidden {...({ webkitdirectory: "" } as object)} onChange={(e) => { if (e.target.files) void ausFiles(e.target.files); e.target.value = ""; }}/>
      </div>
      <p className="leise pd-grenze"><InfoSymbol size={14}/> Kein Virenscanner{rein ? "" : " · pseudonymisiert ist nicht anonym"} · liest, schlägt vor, verändert nur eine Kopie.</p>
    </section>
    {zeilen.map((z, i) => <section key={`${z.e.pfad}-${i}`} className="card" data-pruef-datei={z.e.name}>
      <BerichtAnzeige titel={<strong>{z.e.pfad}</strong>} punkte={z.punkte}/>
      {z.kopie && <>
        {z.kopie.punkte.length > 0 && <BerichtAnzeige punkte={z.kopie.punkte}/>}
        {z.kopie.dateien.length > 0 && <div className="button-row">
          {z.kopie.dateien.map((f) => <button key={f.name} type="button" className="button klein primary" onClick={() => void speichern(f)} data-kopie={f.name}><Download size={16}/> {f.name} speichern</button>)}
          {teilenMoeglich(z.kopie.dateien) && <button type="button" className="button klein" onClick={() => void teilen("", z.kopie!.dateien)} data-kopie-teilen><Share2 size={16}/> Teilen …</button>}
        </div>}
      </>}
    </section>)}
  </>;
}
