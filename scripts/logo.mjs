// Zeichen und App-Symbole erzeugen – nie von Hand zeichnen.
//   node scripts/logo.mjs            → schreibt alle Dateien (PNG über den Browser)
//   node scripts/logo.mjs --pruefen  → prüft, dass die SVG-Dateien zu ZEICHEN/MASKE passen (läuft im Bau)
// Basic (Web-App): das Blatt mit Lichtstreifen (src/zeichen.ts) → src/public/pseudodoc*.{svg,png}.
// Pro (Android, Windows; Klaus 14.11.: „die Maske als Icon … blau, leichter Verlauf … Maske mit 3D-Schatten“): src/maske.ts →
// src/public/pseudodoc-pro.svg, -pro-256.png (Windows-Symbol), Android-Launcher (mipmap-*), adaptiver Vordergrund und Startbilder.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { ZEICHEN } from "../src/zeichen.ts";
import { MASKE } from "../src/maske.ts";

const W = (p) => new URL(`../${p}`, import.meta.url).pathname;
const svgVon = (innen) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${innen}</svg>\n`;
const BASIC = svgVon(ZEICHEN("pd", false)), PRO = svgVon(MASKE("pm"));
if (process.argv.includes("--pruefen")) {
  for (const [datei, soll] of [["src/public/pseudodoc.svg", BASIC], ["src/public/pseudodoc-pro.svg", PRO]])
    if (readFileSync(W(datei), "utf8") !== soll) { console.error(`✗ ${datei} passt nicht zum Zeichen – node scripts/logo.mjs`); process.exit(1); }
  console.log("logo: Dateien passen zu Zeichen und Maske"); process.exit(0);
}
writeFileSync(W("src/public/pseudodoc.svg"), BASIC);
writeFileSync(W("src/public/pseudodoc-pro.svg"), PRO);

const { chromium } = createRequire(import.meta.url)("playwright");
const b = await chromium.launch(); const p = await b.newPage();
async function bild(datei, breite, hoehe, html, durchsichtig = true) {
  await p.setViewportSize({ width: breite, height: hoehe });
  await p.setContent(`<html><body style="margin:0;width:${breite}px;height:${hoehe}px;overflow:hidden">${html}</body></html>`);
  await p.screenshot({ path: W(datei), omitBackground: durchsichtig });
}
const svg = (s, n, innen) => s.replace("<svg ", `<svg width="${n}" height="${n}" `).replace(/<svg([^>]*)>[\s\S]*<\/svg>/, `<svg$1>${innen ?? "$&"}</svg>`);
const voll = (n, quelle = BASIC) => quelle.replace("<svg ", `<svg width="${n}" height="${n}" style="display:block" `);

// Basic
for (const [n, name] of [[192, "pseudodoc-192.png"], [512, "pseudodoc-512.png"]]) await bild(`src/public/${name}`, n, n, voll(n));
await bild("src/public/pseudodoc-maskable-512.png", 512, 512, `<div style="background:#0b3154;width:512px;height:512px;display:grid;place-items:center">${voll(390)}</div>`, false);
// Pro: Windows-Symbol und Vorschau
await bild("src/public/pseudodoc-pro-256.png", 256, 256, voll(256, PRO));
await bild("src/public/pseudodoc-pro-512.png", 512, 512, voll(512, PRO));
// Android: Launcher (rund und eckig), adaptiver Vordergrund (sichere Zone 66/108), Startbilder
const dichte = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const VORN = svgVon(MASKE("pv", false, 0.62));
for (const [d, f] of Object.entries(dichte)) {
  const n = 48 * f, v = 108 * f;
  await bild(`android/app/src/main/res/mipmap-${d}/ic_launcher.png`, n, n, voll(n, PRO));
  await bild(`android/app/src/main/res/mipmap-${d}/ic_launcher_round.png`, n, n, `<div style="width:${n}px;height:${n}px;border-radius:50%;overflow:hidden">${voll(n, PRO).replace(/rx="14"/g, 'rx="0"')}</div>`);
  await bild(`android/app/src/main/res/mipmap-${d}/ic_launcher_foreground.png`, v, v, voll(v, VORN));
}
const groessen = { "drawable/splash.png": [480, 320] };
for (const [d, f] of Object.entries(dichte)) { groessen[`drawable-port-${d}/splash.png`] = [320 * f, 480 * f]; groessen[`drawable-land-${d}/splash.png`] = [480 * f, 320 * f]; }
groessen["drawable-land-xxhdpi/splash.png"] = [1600, 960]; groessen["drawable-land-xxxhdpi/splash.png"] = [1920, 1280];
groessen["drawable-port-xxhdpi/splash.png"] = [960, 1600]; groessen["drawable-port-xxxhdpi/splash.png"] = [1280, 1920];
groessen["drawable-land-hdpi/splash.png"] = [800, 480]; groessen["drawable-port-hdpi/splash.png"] = [480, 800];
groessen["drawable-land-xhdpi/splash.png"] = [1280, 720]; groessen["drawable-port-xhdpi/splash.png"] = [720, 1280];
for (const [datei, [bw, bh]] of Object.entries(groessen)) {
  const n = Math.round(Math.min(bw, bh) * 0.34);
  await bild(`android/app/src/main/res/${datei}`, bw, bh, `<div style="width:${bw}px;height:${bh}px;display:grid;place-items:center;background:radial-gradient(circle at 50% 38%,#164f7d,#0b3154 70%)">${voll(n, PRO)}</div>`, false);
}
await b.close();
console.log("logo: Basic-Zeichen, Pro-Maske, Android-Symbole und Startbilder geschrieben");
