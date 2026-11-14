// Abdeck-Editor (Klaus 14.11.2026): Flächen, die 100 % schwarz sind, frei auf das Bild legen – Rechteck, Kreis/Ellipse,
// Vieleck mit Vektorpunkten (Kennzeichen, Gesichter, Szenen). Bedienung nach dem Kontur-Werkzeug aus Tomys Hub: Vieleck – Tipp
// setzt Punkt, Tipp auf den ersten schließt; danach Punkte ziehen, Doppeltipp auf eine Linie = Punkt dazu, Doppeltipp auf einen
// Punkt = Punkt weg. Gewählte Fläche: Rahmen mit 8 Anfassern (Ecke mit Umschalt = im Verhältnis), in der Fläche ziehen =
// verschieben. Rückgängig/Wiederholen (Strg+Z, Strg+Y), Entf löscht. Das Original wird nie verändert.
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from "react";
import { Check, Circle, Eye, EyeOff, Maximize2, Minimize2, MousePointer2, Pentagon, Redo2, Square, Trash2, Undo2, WandSparkles, X } from "lucide-react";
import { ANFASSER, anfasserZiehen, box, drin, inBox, neueId, verschieben, vieleckDoppeltipp, Verlauf, type Box, type Flaeche, type P } from "../lib/pseudo/flaechen.ts";

type Werkzeug = "zeiger" | "rechteck" | "ellipse" | "vieleck";
type Zug =
  | { art: "neu"; id: string; start: P }
  | { art: "bewegen"; id: string; start: P; vorher: Flaeche; bewegt: boolean }
  | { art: "griff"; id: string; griff: number; start: P; b0: Box }
  | { art: "punkt"; id: string; i: number };

export function Abdecken({ bildUrl, breite, hoehe, anfang, vorschlaege, titel, fertig, abbrechen }: {
  bildUrl: string; breite: number; hoehe: number; anfang: Flaeche[]; vorschlaege: Flaeche[]; titel: string;
  fertig: (f: Flaeche[]) => void; abbrechen: () => void;
}) {
  const [flaechen, setFlaechen] = useState<Flaeche[]>(anfang);
  const [sel, setSel] = useState<string | null>(null);
  const [werkzeug, setWerkzeug] = useState<Werkzeug>("zeiger");
  const [entwurf, setEntwurf] = useState<P[]>([]);
  const [durch, setDurch] = useState(false);
  const [gross, setGross] = useState(false);
  const verlauf = useMemo(() => new Verlauf<Flaeche[]>(60), []);
  const [, neu] = useState(0);
  const svg = useRef<SVGSVGElement>(null);
  const zug = useRef<Zug | null>(null);
  const letzterTipp = useRef<{ t: number; x: number; y: number } | null>(null);
  const stand = useRef(flaechen); stand.current = flaechen;

  const aendern = (f: Flaeche[], merken = true) => { if (merken) verlauf.merken(stand.current); setFlaechen(f); neu((x) => x + 1); };
  const rueck = () => { const s = verlauf.rueck(stand.current); if (s) { setFlaechen(s); setSel(null); neu((x) => x + 1); } };
  const vor = () => { const s = verlauf.wieder(stand.current); if (s) { setFlaechen(s); setSel(null); neu((x) => x + 1); } };
  const weg = () => { if (sel) { aendern(stand.current.filter((f) => f.id !== sel)); setSel(null); } };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input,textarea")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) vor(); else rueck(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); vor(); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); weg(); }
      else if (e.key === "Escape") { if (entwurf.length) setEntwurf([]); else if (sel) setSel(null); else abbrechen(); }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });

  const lage = () => svg.current!.getBoundingClientRect();
  const punkt = (e: { clientX: number; clientY: number }): P => { const r = lage(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  const nah = () => { const r = lage(); return { u: 14 / r.width, v: 14 / r.height }; };
  const naheBei = (a: P, b: P) => { const n = nah(); return Math.abs(a[0] - b[0]) <= n.u && Math.abs(a[1] - b[1]) <= n.v; };
  const gewaehlt = flaechen.find((f) => f.id === sel) || null;

  function runter(e: RPE<SVGSVGElement>) {
    if (e.button > 0) return;
    svg.current!.setPointerCapture(e.pointerId);
    const q = punkt(e);
    const jetzt = Date.now(), lt = letzterTipp.current;
    const doppel = !!lt && jetzt - lt.t < 400 && Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < 18;
    letzterTipp.current = doppel ? null : { t: jetzt, x: e.clientX, y: e.clientY };
    if (werkzeug === "rechteck" || werkzeug === "ellipse") {
      const f: Flaeche = { id: neueId(), art: werkzeug, x: q[0], y: q[1], w: 0, h: 0 };
      aendern([...stand.current, f]); setSel(f.id); zug.current = { art: "neu", id: f.id, start: q }; return;
    }
    if (werkzeug === "vieleck") {
      if (entwurf.length >= 3 && (naheBei(q, entwurf[0]) || doppel)) { schliessen(entwurf); return; }
      setEntwurf([...entwurf, q]); return;
    }
    // Zeiger
    if (gewaehlt) {
      const b = box(gewaehlt);
      const griff = ANFASSER.findIndex(([gx, gy]) => naheBei(q, [b.x + gx * b.w, b.y + gy * b.h]));
      if (gewaehlt.art === "vieleck") {
        if (doppel) { const n = nah(); const r = vieleckDoppeltipp(gewaehlt, q, Math.max(n.u, n.v)); if (r) { aendern(stand.current.map((f) => (f.id === r.id ? r : f))); return; } }
        const i = gewaehlt.punkte.findIndex((p) => naheBei(q, p));
        if (i >= 0) { verlauf.merken(stand.current); zug.current = { art: "punkt", id: gewaehlt.id, i }; return; }
      }
      if (griff >= 0) { verlauf.merken(stand.current); zug.current = { art: "griff", id: gewaehlt.id, griff, start: q, b0: b }; return; }
    }
    const treffer = [...stand.current].reverse().find((f) => drin(f, q[0], q[1]));
    if (treffer) { setSel(treffer.id); zug.current = { art: "bewegen", id: treffer.id, start: q, vorher: treffer, bewegt: false }; return; }
    setSel(null);
  }

  function ziehen(e: RPE<SVGSVGElement>) {
    const z = zug.current; if (!z) return;
    const q = punkt(e);
    const setze = (id: string, f: (alt: Flaeche) => Flaeche) => setFlaechen((l) => l.map((x) => (x.id === id ? f(x) : x)));
    if (z.art === "neu") setze(z.id, (f) => inBox(f, { x: Math.min(z.start[0], q[0]), y: Math.min(z.start[1], q[1]), w: Math.abs(q[0] - z.start[0]), h: Math.abs(q[1] - z.start[1]) }));
    else if (z.art === "bewegen") {
      if (!z.bewegt) { if (Math.hypot(q[0] - z.start[0], q[1] - z.start[1]) < 0.004) return; verlauf.merken(stand.current); z.bewegt = true; }
      setze(z.id, () => verschieben(z.vorher, q[0] - z.start[0], q[1] - z.start[1]));
    } else if (z.art === "griff") setze(z.id, (f) => inBox(f, anfasserZiehen(z.b0, z.griff, q[0] - z.start[0], q[1] - z.start[1], e.shiftKey)));
    else if (z.art === "punkt") setze(z.id, (f) => (f.art === "vieleck" ? { ...f, punkte: f.punkte.map((p, k) => (k === z.i ? q : p)) } : f));
  }

  function hoch() {
    const z = zug.current; zug.current = null;
    if (z?.art === "neu") {
      setFlaechen((l) => l.map((f) => { if (f.id !== z.id) return f; const b = box(f); return b.w < 0.01 && b.h < 0.01 ? inBox(f, { x: z.start[0] - 0.06, y: z.start[1] - 0.04, w: 0.12, h: 0.08 }) : f; }));
      setWerkzeug("zeiger");
    }
  }

  function schliessen(punkte: P[]) {
    const f: Flaeche = { id: neueId(), art: "vieleck", punkte };
    aendern([...stand.current, f]); setSel(f.id); setEntwurf([]); setWerkzeug("zeiger");
  }

  const pfadD = (f: Flaeche) => f.art === "vieleck" ? `M${f.punkte.map(([u, v]) => `${u * breite},${v * hoehe}`).join("L")}Z` : "";
  const r = svg.current ? lage() : null;
  const griffGroesse = r ? (10 / r.width) * breite : breite / 80;
  const neueVorschlaege = vorschlaege.filter((v) => !flaechen.some((f) => f.auto && JSON.stringify(box(f)) === JSON.stringify(box(v))));
  const wz = (w: Werkzeug, Symbol: typeof Square, name: string) => <button type="button" className={`button klein ${werkzeug === w ? "primary" : ""}`} aria-pressed={werkzeug === w} title={name} aria-label={name} data-werkzeug={w}
    onClick={() => { setWerkzeug(w); setEntwurf([]); if (w !== "zeiger") setSel(null); }}><Symbol size={17}/></button>;

  return <div className={`abdecken ${gross ? "gross" : ""}`} role="dialog" aria-label={`Abdecken: ${titel}`} data-abdecken>
    <div className="abdecken-kopf">
      <strong>{titel}</strong>
      <span className="leise" data-flaechen-zahl={flaechen.length}>{flaechen.length} {flaechen.length === 1 ? "Fläche" : "Flächen"}</span>
      <button type="button" className="info-knopf" aria-label={gross ? "Kleiner" : "Großes Blatt"} title={gross ? "Kleiner" : "Großes Blatt"} onClick={() => setGross(!gross)}>{gross ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}</button>
    </div>
    <div className="werkzeug-leiste abdecken-leiste">
      {wz("zeiger", MousePointer2, "Auswählen und verschieben")}
      {wz("rechteck", Square, "Rechteck aufziehen")}
      {wz("ellipse", Circle, "Kreis/Ellipse aufziehen")}
      {wz("vieleck", Pentagon, "Vieleck: Punkte setzen, Tipp auf den ersten Punkt schließt")}
      <span className="trenner"/>
      <button type="button" className="button klein" title="Rückgängig (Strg+Z)" aria-label="Rückgängig" disabled={!verlauf.kannRueck} onClick={rueck} data-rueck><Undo2 size={17}/></button>
      <button type="button" className="button klein" title="Wiederholen (Strg+Y)" aria-label="Wiederholen" disabled={!verlauf.kannVor} onClick={vor}><Redo2 size={17}/></button>
      <button type="button" className="button klein" title="Gewählte Fläche löschen (Entf)" aria-label="Fläche löschen" disabled={!sel} onClick={weg} data-flaeche-weg><Trash2 size={17}/></button>
      <button type="button" className="button klein" title={durch ? "Wieder 100 % schwarz zeigen" : "Durchscheinend zeigen (nur zum Ausrichten – gespeichert wird immer 100 % schwarz)"} aria-label="Durchscheinend" aria-pressed={durch} onClick={() => setDurch(!durch)} data-durch>{durch ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
      {neueVorschlaege.length > 0 && <button type="button" className="button klein" title="Vorschläge aus der Texterkennung wieder dazunehmen" onClick={() => aendern([...stand.current, ...neueVorschlaege])} data-vorschlaege><WandSparkles size={17}/> {neueVorschlaege.length}</button>}
    </div>
    {/* Hinweiszeile steht immer da (feste Höhe), damit das Bild beim Werkzeugwechsel nicht springt. */}
    <p className="leise abdecken-hinweis" data-hinweis>{werkzeug === "vieleck" ? <>Tippe Punkte um die Stelle. {entwurf.length >= 3 ? <>Tipp auf den ersten Punkt schließt – oder <button type="button" className="text-link" onClick={() => schliessen(entwurf)} data-vieleck-schliessen>jetzt schließen</button>.</> : `${entwurf.length} von mindestens 3 Punkten.`}</>
      : werkzeug === "zeiger" ? (gewaehlt?.art === "vieleck" ? "Punkte ziehen · Doppeltipp auf eine Linie = Punkt dazu · Doppeltipp auf einen Punkt = Punkt weg." : "Tipp auf eine Fläche wählt sie aus · ziehen verschiebt · Anfasser ändern die Größe (Umschalt = im Verhältnis).")
      : "Aufziehen – oder nur tippen für eine kleine Fläche."}</p>
    <div className="abdecken-buehne">
      <svg ref={svg} viewBox={`0 0 ${breite} ${hoehe}`} style={{ aspectRatio: `${breite} / ${hoehe}`, ["--verh" as string]: breite / hoehe }} className={`abdecken-svg wz-${werkzeug}`}
        onPointerDown={runter} onPointerMove={ziehen} onPointerUp={hoch} onPointerCancel={hoch} data-abdecken-svg>
        <image href={bildUrl} x={0} y={0} width={breite} height={hoehe}/>
        {flaechen.map((f) => {
          const st = { fill: "#000", fillOpacity: durch ? 0.55 : 1 };
          return f.art === "rechteck" ? <rect key={f.id} x={f.x * breite} y={f.y * hoehe} width={f.w * breite} height={f.h * hoehe} {...st} data-flaeche={f.art}/>
            : f.art === "ellipse" ? <ellipse key={f.id} cx={(f.x + f.w / 2) * breite} cy={(f.y + f.h / 2) * hoehe} rx={(f.w / 2) * breite} ry={(f.h / 2) * hoehe} {...st} data-flaeche={f.art}/>
            : <path key={f.id} d={pfadD(f)} {...st} data-flaeche={f.art}/>;
        })}
        {gewaehlt && (() => { const b = box(gewaehlt); return <g className="auswahl" pointerEvents="none">
          <rect x={b.x * breite} y={b.y * hoehe} width={b.w * breite} height={b.h * hoehe} fill="none" stroke="#54b8d2" strokeWidth={griffGroesse / 4} strokeDasharray={`${griffGroesse} ${griffGroesse / 2}`}/>
          {ANFASSER.map(([gx, gy], i) => <rect key={i} x={(b.x + gx * b.w) * breite - griffGroesse / 2} y={(b.y + gy * b.h) * hoehe - griffGroesse / 2} width={griffGroesse} height={griffGroesse} fill="#fff" stroke="#087f7a" strokeWidth={griffGroesse / 6}/>)}
          {gewaehlt.art === "vieleck" && gewaehlt.punkte.map(([u, v], i) => <circle key={`p${i}`} cx={u * breite} cy={v * hoehe} r={griffGroesse / 2} fill="#c0392b" stroke="#fff" strokeWidth={griffGroesse / 8}/>)}
        </g>; })()}
        {entwurf.length > 0 && <g pointerEvents="none">
          <polyline points={entwurf.map(([u, v]) => `${u * breite},${v * hoehe}`).join(" ")} fill="rgba(0,0,0,.35)" stroke="#c0392b" strokeWidth={griffGroesse / 4}/>
          {entwurf.map(([u, v], i) => <circle key={i} cx={u * breite} cy={v * hoehe} r={griffGroesse / (i === 0 ? 1.5 : 2)} fill={i === 0 ? "#087f7a" : "#c0392b"} stroke="#fff" strokeWidth={griffGroesse / 8}/>)}
        </g>}
      </svg>
    </div>
    <div className="button-row abdecken-fuss">
      <button type="button" className="button primary" onClick={() => fertig(flaechen)} data-abdecken-fertig><Check size={18}/> Fertig</button>
      <button type="button" className="button" onClick={abbrechen}><X size={18}/> Abbrechen</button>
      <span className="leise">Schwarz ist 100 % deckend. Das Original bleibt unverändert.</span>
    </div>
  </div>;
}
