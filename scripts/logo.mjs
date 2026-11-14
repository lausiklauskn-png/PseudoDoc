// Statisches Zeichen und App-Symbole aus ZEICHEN (src/logo.tsx) erzeugen: public/pseudodoc.svg, -192.png, -512.png, -maskable-512.png.
//   node scripts/logo.mjs            → schreibt die Dateien (PNG über den Browser)
//   node scripts/logo.mjs --pruefen  → prüft, dass public/pseudodoc.svg zum Zeichen passt (läuft im Bau)
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { ZEICHEN } from "../src/zeichen.ts";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${ZEICHEN("pd", false)}</svg>\n`;
const ZIEL = new URL("../src/public/pseudodoc.svg", import.meta.url);
if (process.argv.includes("--pruefen")) {
  if (readFileSync(ZIEL, "utf8") !== svg) { console.error("✗ public/pseudodoc.svg passt nicht zum Zeichen – node scripts/logo.mjs"); process.exit(1); }
  console.log("logo: Datei passt zum Zeichen"); process.exit(0);
}
writeFileSync(ZIEL, svg);
const { chromium } = createRequire(import.meta.url)("playwright");
const b = await chromium.launch(); const p = await b.newPage();
for (const [n, rand, name] of [[192, 0, "pseudodoc-192.png"], [512, 0, "pseudodoc-512.png"], [512, 0.12, "pseudodoc-maskable-512.png"]]) {
  await p.setViewportSize({ width: n, height: n });
  const innen = Math.round(n * (1 - 2 * rand));
  await p.setContent(`<html><body style="margin:0;background:${rand ? "#0b3154" : "transparent"};display:grid;place-items:center;width:${n}px;height:${n}px">${svg.replace("<svg ", `<svg width="${innen}" height="${innen}" `)}</body></html>`);
  await p.screenshot({ path: new URL(`../src/public/${name}`, import.meta.url).pathname, omitBackground: !rand });
}
await b.close();
console.log("logo: pseudodoc.svg und Symbole geschrieben");
