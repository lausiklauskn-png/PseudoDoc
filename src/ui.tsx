// Bausteine der Oberfläche wie im Datei-Organizer/der Familienakte: „?“ mit Hinweisfenster, Ablaufbild.
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, X } from "lucide-react";

/** Fragezeichen mit Hinweisfenster wie in der Familienakte: Erklärungen nur hier, kurz, in Punkten. */
export function Info({ titel, punkte, mehr, label }: { titel: string; punkte?: string[]; mehr?: ReactNode; label?: string }) {
  const id = useId();
  const knopf = useRef<HTMLButtonElement>(null), fenster = useRef<HTMLSpanElement>(null);
  const [offen, setOffen] = useState(false);
  const [lage, setLage] = useState<CSSProperties>({ visibility: "hidden" });
  useEffect(() => {
    if (!offen) return;
    const aussen = (e: PointerEvent) => { const z = e.target as Node; if (!knopf.current?.contains(z) && !fenster.current?.contains(z)) setOffen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOffen(false); };
    const anderes = (e: Event) => { if ((e as CustomEvent<string>).detail !== id) setOffen(false); };
    document.addEventListener("pointerdown", aussen); document.addEventListener("keydown", esc); window.addEventListener("pseudodoc-info", anderes);
    return () => { document.removeEventListener("pointerdown", aussen); document.removeEventListener("keydown", esc); window.removeEventListener("pseudodoc-info", anderes); };
  }, [offen, id]);
  useLayoutEffect(() => {
    if (!offen) return;
    const setzen = () => {
      const k = knopf.current?.getBoundingClientRect(), f = fenster.current;
      if (!k || !f) return;
      const breite = Math.min(480, window.innerWidth - 24), hoehe = Math.min(f.scrollHeight, window.innerHeight * 0.7);
      const links = Math.max(12, Math.min(k.right - breite, window.innerWidth - 12 - breite));
      const top = window.innerHeight - k.bottom >= hoehe + 20 ? k.bottom + 8 : Math.max(12, k.top - 8 - hoehe);
      setLage({ top, left: links, width: breite, maxHeight: "70vh", visibility: "visible" });
    };
    setzen();
    window.addEventListener("scroll", setzen, true); window.addEventListener("resize", setzen);
    return () => { window.removeEventListener("scroll", setzen, true); window.removeEventListener("resize", setzen); };
  }, [offen]);
  const panel = offen ? <span ref={fenster} className="info-fenster" role="note" style={lage} data-info-fenster>
    <strong>{titel}</strong>
    {punkte && <ul>{punkte.map((p) => <li key={p}>{p}</li>)}</ul>}
    {mehr}
    <button type="button" className="info-zu" aria-label="Hinweis schließen" onClick={() => setOffen(false)}><X size={16}/></button>
  </span> : null;
  return <span className={`info ${offen ? "offen" : ""}`}>
    <button ref={knopf} type="button" className="info-knopf" aria-label={label || `${titel} erklären`} aria-expanded={offen} onClick={(e) => { e.stopPropagation(); if (!offen) window.dispatchEvent(new CustomEvent("pseudodoc-info", { detail: id })); setOffen(!offen); }}><CircleHelp size={18}/></button>
    {panel && createPortal(panel, document.body)}
  </span>;
}

export type Schritt = { titel: string; unter?: string; art?: "normal" | "hervor" | "gut" | "aus" };
export function Ablaufbild({ schritte, label }: { schritte: Schritt[]; label: string }) {
  return <ol className="ablaufbild" aria-label={label} data-ablaufbild>
    {schritte.map((s, i) => <li key={s.titel}><div className={`ablauf-knoten art-${s.art || "normal"}`} data-schritt={i + 1} aria-current={s.art === "hervor" ? "step" : undefined}>
      <span className="ablauf-nr" aria-hidden="true">{i + 1}</span><span className="ablauf-text"><strong>{s.titel}</strong>{s.unter && <small>{s.unter}</small>}</span>
    </div></li>)}
  </ol>;
}

export function Seitentitel({ symbol, titel, info }: { symbol: ReactNode; titel: string; info?: ReactNode }) {
  return <div className="page-title"><span className="page-title-icon">{symbol}</span><h1>{titel}</h1>{info}</div>;
}
