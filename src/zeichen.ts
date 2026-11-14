// Das PseudoDoc-Zeichen als reiner Text (ohne JSX), damit scripts/logo.mjs es in Node lesen kann. Erklärung: src/logo.tsx.
/** Inneres des Zeichens, viewBox 0 0 64 64. `id` macht Verläufe/Ausschnitte eindeutig (mehrere Zeichen auf einer Seite). */
export function ZEICHEN(id: string, bewegt: boolean): string {
  const z = [[17, 47], [17, 47], [17, 40], [17, 44], [17, 33]];
  const zeilen = z.map(([x, b], i) => `<rect x="${x}" y="${23 + i * 6}" width="${b - x}" height="2.6" rx="1.3"/>`).join("");
  const schwarz = z.map(([x, b], i) => `<rect x="${x - 0.6}" y="${22.2 + i * 6}" width="${b - x + 1.2}" height="4.2" rx="0.8"/>`).join("");
  const lauf = bewegt ? ` class="pd-lauf"` : "";
  return `<defs>
<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b3154"/><stop offset=".62" stop-color="#11506f"/><stop offset="1" stop-color="#087f7a"/></linearGradient>
<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5ff2e4" stop-opacity="0"/><stop offset=".55" stop-color="#7ef7ea" stop-opacity=".95"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
<linearGradient id="${id}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e3eef4"/></linearGradient>
<clipPath id="${id}c"><path${lauf} d="M-40 0H41L27.4 64H-40z"/></clipPath>
<clipPath id="${id}b"><path d="M13 9h27l11 11v35H13z"/></clipPath>
<filter id="${id}f" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.6" flood-color="#021a2c" flood-opacity=".45"/></filter>
</defs>
<rect width="64" height="64" rx="15" fill="url(#${id}g)"/>
<path d="M0 46 Q20 38 64 52 V64 H0z" fill="#ffffff" opacity=".05"/>
<g filter="url(#${id}f)"><path d="M13 9h27l11 11v35H13z" fill="url(#${id}p)"/></g>
<path d="M40 9v8.5a2.5 2.5 0 0 0 2.5 2.5H51z" fill="#b9d3e1"/>
<g fill="#9fb6c6">${zeilen}</g>
<g clip-path="url(#${id}c)"><g fill="#0a0f14">${schwarz}</g></g>
<g clip-path="url(#${id}b)"><path${bewegt ? ` class="pd-strahl"` : ""} d="M37 0H44L30.4 64H23.4z" fill="url(#${id}s)"/></g>
<circle cx="47.5" cy="47.5" r="6.4" fill="#087f7a" stroke="#ffffff" stroke-width="2"/>
<path d="M44.6 47.6l2 2 3.9-4.1" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`;
}
