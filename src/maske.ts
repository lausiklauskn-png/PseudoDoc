// Symbol von PseudoDoc Pro (Klaus 14.11.2026): „die Maske als Icon – die Maske, die da war (Pseudonymisierer), selber Hintergrund,
// blau, mit leichtem Verlauf, aber nur leicht. Und die Maske mit einem 3D-Schatten.“ Umriss nach der Venezianischen Maske (lucide,
// ISC-Lizenz), hier gefüllt und plastisch: heller Verlauf, Lichtkante oben, Schatten unten, Augen ausgeschnitten.
// Reiner Text ohne JSX – scripts/logo.mjs erzeugt daraus alle App-Symbole (Android, Windows).

/** Inneres des Symbols, viewBox 0 0 64 64. `rand` = Anteil Rand für Android-Vordergrund (sichere Zone), sonst 0. `hintergrund` false
 *  für den Android-Vordergrund (der Hintergrund kommt dort als Farbe). */
export function MASKE(id: string, hintergrund = true, skala = 1): string {
  // Umriss (24er-Raster von lucide) mit ausgeschnittenen Augen; evenodd macht die Augen zu Löchern.
  const umriss = "M4 6a2 2 0 0 0-2 2v4a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V8a2 2 0 0 0-2-2h-3a8 8 0 0 0-5 2 8 8 0 0 0-5-2z";
  const augen = "M4.6 11.4Q7.3 9 10.1 11.5Q7.3 13.7 4.6 11.4zM19.4 11.4Q16.7 9 13.9 11.5Q16.7 13.7 19.4 11.4z";
  const s = 2.35 * skala, tx = 32 - 12 * s, ty = 32.5 - 12.5 * s;
  const lage = `transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(3)})"`;
  return `<defs>
<linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#103d66"/><stop offset="1" stop-color="#0b3154"/></linearGradient>
<linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e6f0f6"/><stop offset="1" stop-color="#b9cfdd"/></linearGradient>
<linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".45" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
<radialGradient id="${id}g" cx=".5" cy=".18" r=".55"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<filter id="${id}s" x="-30%" y="-30%" width="160%" height="170%">
<feGaussianBlur in="SourceAlpha" stdDeviation=".9" result="b1"/><feOffset in="b1" dy="1.3" result="o1"/>
<feComponentTransfer in="o1" result="s1"><feFuncA type="linear" slope=".55"/></feComponentTransfer>
<feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="b2"/><feOffset in="b2" dy="3.2" result="o2"/>
<feComponentTransfer in="o2" result="s2"><feFuncA type="linear" slope=".35"/></feComponentTransfer>
<feMerge><feMergeNode in="s2"/><feMergeNode in="s1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="${id}i" x="-10%" y="-10%" width="120%" height="120%">
<feOffset in="SourceAlpha" dy="-.35" result="o"/><feGaussianBlur in="o" stdDeviation=".35" result="b"/>
<feComposite in="SourceAlpha" in2="b" operator="out" result="rand"/><feFlood flood-color="#7f9db2" flood-opacity=".75"/>
<feComposite in2="rand" operator="in" result="schatten"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="schatten"/></feMerge></filter>
<clipPath id="${id}c"><path fill-rule="evenodd" d="${umriss}${augen}"/></clipPath>
</defs>
${hintergrund ? `<rect width="64" height="64" rx="14" fill="url(#${id}h)"/><rect width="64" height="64" rx="14" fill="url(#${id}g)" opacity=".35"/>` : ""}
<g ${lage}>
<g filter="url(#${id}s)"><path fill-rule="evenodd" d="${umriss}${augen}" fill="url(#${id}m)" filter="url(#${id}i)"/></g>
<g clip-path="url(#${id}c)"><path d="M0 4h24v7.5Q12 7 0 11.5z" fill="url(#${id}k)" opacity=".7"/></g>
<path d="${umriss}" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width=".22"/>
<path d="M18 11c-1.5 0-2.5.5-3 2M6 11c1.5 0 2.5.5 3 2" fill="none" stroke="#0b3154" stroke-opacity="0" stroke-width=".4"/>
</g>`;
}
