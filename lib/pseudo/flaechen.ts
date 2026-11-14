// Abdeck-Flächen für Bilder (Klaus 14.11.2026: „wie ein Bildbearbeitungsprogramm … Flächen, die 100 % schwarz sind“).
// Bedienung nach dem Kontur-Werkzeug aus Tomys Hub (promptgenerator/kontur.js, Klaus 31.10.): Doppeltipp setzt einen Punkt,
// Doppeltipp auf einen Punkt nimmt ihn weg, Punkt ziehen verschiebt, Rahmen mit 8 Anfassern, Rückgängig. Hier nur die Rechnung
// (rein, ohne DOM); alle Lagen relativ zum Bild (0 … 1), damit sie für jede Bildgröße gelten.

export type P = [number, number];
export type Flaeche =
  | { id: string; art: "rechteck"; x: number; y: number; w: number; h: number; auto?: string }
  | { id: string; art: "ellipse"; x: number; y: number; w: number; h: number; auto?: string }
  | { id: string; art: "vieleck"; punkte: P[]; auto?: string };

export type Box = { x: number; y: number; w: number; h: number };

let zaehler = 0;
export const neueId = () => `f${Date.now().toString(36)}${(zaehler++).toString(36)}`;

export function box(f: Flaeche): Box {
  if (f.art !== "vieleck") return { x: f.x, y: f.y, w: f.w, h: f.h };
  const xs = f.punkte.map((p) => p[0]), ys = f.punkte.map((p) => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Fläche in einen neuen Rahmen setzen (Anfasser ziehen, verschieben). */
export function inBox(f: Flaeche, neu: Box): Flaeche {
  const n = { x: neu.x, y: neu.y, w: Math.max(0.002, neu.w), h: Math.max(0.002, neu.h) };
  if (f.art !== "vieleck") return { ...f, ...n };
  const alt = box(f);
  const sx = alt.w ? n.w / alt.w : 1, sy = alt.h ? n.h / alt.h : 1;
  return { ...f, punkte: f.punkte.map(([u, v]) => [n.x + (u - alt.x) * sx, n.y + (v - alt.y) * sy] as P) };
}

export const verschieben = (f: Flaeche, dx: number, dy: number): Flaeche => { const b = box(f); return inBox(f, { ...b, x: b.x + dx, y: b.y + dy }); };

/** Anfasser 0–7 im Uhrzeigersinn ab links oben; 8 = Mitte (verschieben). */
export const ANFASSER: Array<[number, number]> = [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]];

export function anfasserZiehen(start: Box, griff: number, dx: number, dy: number, verhaeltnis = false): Box {
  let { x, y, w, h } = start;
  const [gx, gy] = ANFASSER[griff];
  if (gx === 0) { x += dx; w -= dx; } else if (gx === 1) w += dx;
  if (gy === 0) { y += dy; h -= dy; } else if (gy === 1) h += dy;
  if (verhaeltnis && gx !== 0.5 && gy !== 0.5 && start.w && start.h) {
    const f = Math.max(w / start.w, h / start.h);
    const nw = start.w * f, nh = start.h * f;
    if (gx === 0) x = start.x + start.w - nw;
    if (gy === 0) y = start.y + start.h - nh;
    w = nw; h = nh;
  }
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  return { x, y, w, h };
}

export function drin(f: Flaeche, u: number, v: number): boolean {
  if (f.art === "rechteck") return u >= f.x && u <= f.x + f.w && v >= f.y && v <= f.y + f.h;
  if (f.art === "ellipse") { const rx = f.w / 2, ry = f.h / 2; if (!rx || !ry) return false; const a = (u - f.x - rx) / rx, b = (v - f.y - ry) / ry; return a * a + b * b <= 1; }
  let innen = false;
  const p = f.punkte;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if ((p[i][1] > v) !== (p[j][1] > v) && u < ((p[j][0] - p[i][0]) * (v - p[i][1])) / (p[j][1] - p[i][1] || 1e-9) + p[i][0]) innen = !innen;
  }
  return innen;
}

/** Abstand eines Punktes zu einer Strecke (für „Doppeltipp auf eine Linie = Punkt dazu“). */
export function streckenAbstand(a: P, b: P, q: P): { d: number; t: number } {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2)) : 0;
  return { d: Math.hypot(a[0] + t * dx - q[0], a[1] + t * dy - q[1]), t };
}

/** Doppeltipp im Vieleck: auf einen Punkt = Punkt weg (mindestens 3 bleiben), auf eine Linie = Punkt dazu. Abstände in
 *  Bildanteilen (`nah` ≈ 12 px auf dem Schirm). Rückgabe null = nichts getroffen. */
export function vieleckDoppeltipp(f: Extract<Flaeche, { art: "vieleck" }>, q: P, nah: number): Flaeche | null {
  const i = f.punkte.findIndex((p) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= nah);
  if (i >= 0) return f.punkte.length > 3 ? { ...f, punkte: f.punkte.filter((_, k) => k !== i) } : null;
  let best = -1, bestD = nah;
  for (let k = 0; k < f.punkte.length; k++) {
    const { d } = streckenAbstand(f.punkte[k], f.punkte[(k + 1) % f.punkte.length], q);
    if (d <= bestD) { bestD = d; best = k; }
  }
  if (best < 0) return null;
  const punkte = f.punkte.slice(); punkte.splice(best + 1, 0, q);
  return { ...f, punkte };
}

/** Pixel-Rechteck → Fläche (für Vorschläge aus der Texterkennung). */
export const ausPixeln = (r: Box, breite: number, hoehe: number, auto: string): Flaeche =>
  ({ id: neueId(), art: "rechteck", x: Math.max(0, r.x / breite), y: Math.max(0, r.y / hoehe), w: Math.min(1, r.w / breite), h: Math.min(1, r.h / hoehe), auto });

/** Verlauf für Rückgängig/Wiederholen (bis 60 Schritte wie im Kontur-Werkzeug). */
export class Verlauf<T> {
  private zurueck: T[] = []; private vor: T[] = []; private max: number;
  constructor(max = 60) { this.max = max; }
  merken(stand: T) { this.zurueck.push(stand); if (this.zurueck.length > this.max) this.zurueck.shift(); this.vor.length = 0; }
  rueck(jetzt: T): T | null { const s = this.zurueck.pop(); if (s === undefined) return null; this.vor.push(jetzt); return s; }
  wieder(jetzt: T): T | null { const s = this.vor.pop(); if (s === undefined) return null; this.zurueck.push(jetzt); return s; }
  get kannRueck() { return this.zurueck.length > 0; }
  get kannVor() { return this.vor.length > 0; }
}
