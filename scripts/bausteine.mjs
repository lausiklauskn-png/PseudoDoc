// Bausteine byte-gleich übernehmen und mit Pin festhalten. Nie von Hand ändern.
//   node scripts/bausteine.mjs            → kopiert aus den Nachbar-Repos und schreibt bausteine.json
//   node scripts/bausteine.mjs --pruefen  → prüft nur, dass jede Datei ihrem Pin entspricht (läuft im Bau)
// Quellen: Familienakte (Maske = Schicht über Modul 25, Modul 25 selbst aus Sage) und Datei-Organizer (Leser für E-Mail, Office,
// PDF-Text, Dateiart; Prüfkern und Texterkennung, die dort selbst mit Pin aus der Familienakte liegen).
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const PIN = join(WURZEL, "bausteine.json");
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

if (process.argv.includes("--pruefen")) {
  const pins = JSON.parse(readFileSync(PIN, "utf8"));
  let fehler = 0, n = 0;
  for (const q of Object.values(pins.quellen)) for (const [rel, h] of Object.entries(q.dateien)) {
    n++; const p = join(WURZEL, rel);
    if (!existsSync(p) || sha(p) !== h) { console.error(`✗ Pin verletzt: ${rel}`); fehler++; }
  }
  if (fehler) { console.error("Bausteine nie von Hand ändern – node scripts/bausteine.mjs"); process.exit(1); }
  console.log(`bausteine: ${n} Dateien entsprechen ihrem Pin`);
  process.exit(0);
}

const alleDateien = (d) => readdirSync(d).flatMap((n) => statSync(join(d, n)).isDirectory() ? alleDateien(join(d, n)).map((x) => `${n}/${x}`) : [n]);
const QUELLEN = {
  familienakte: { pfad: process.env.FAMILIENAKTE || "../Meine-Familienakte", dateien: {
    "lib/maske.ts": "lib/maske/maske.ts", "lib/ki-auftrag.ts": "lib/maske/ki-auftrag.ts", "lib/namensmuster.ts": "lib/maske/namensmuster.ts",
    "public/native/25_pseudonym.js": "src/public/vendor/maske/25_pseudonym.js" } },
  "datei-organizer": { pfad: process.env.DATEI_ORGANIZER || "../Datei-Organizer", dateien: {
    "lib/typen.ts": "lib/bausteine/typen.ts", "lib/dateiart.ts": "lib/bausteine/dateiart.ts", "lib/eml.ts": "lib/bausteine/eml.ts",
    "lib/zip.ts": "lib/bausteine/zip.ts", "lib/gehalt.ts": "lib/bausteine/gehalt.ts", "lib/pdf-text.ts": "lib/bausteine/pdf-text.ts" } },
};
const DO = resolve(WURZEL, QUELLEN["datei-organizer"].pfad);
for (const f of alleDateien(join(DO, "src/public/vendor")).filter((f) => f !== "HERKUNFT.json" && !f.startsWith("maske/")))
  QUELLEN["datei-organizer"].dateien[`src/public/vendor/${f}`] = `src/public/vendor/${f}`;

const aus = { erzeugt: new Date().toISOString().slice(0, 10), quellen: {} };
for (const [name, q] of Object.entries(QUELLEN)) {
  const basis = resolve(WURZEL, q.pfad);
  let commit = "?"; try { commit = execFileSync("git", ["-C", basis, "rev-parse", "--short", "HEAD"]).toString().trim(); } catch {}
  const dateien = {};
  for (const [von, nach] of Object.entries(q.dateien)) { const z = join(WURZEL, nach); mkdirSync(dirname(z), { recursive: true }); copyFileSync(join(basis, von), z); dateien[nach] = sha(z); }
  aus.quellen[name] = { repo: `lausiklauskn-png/${name === "familienakte" ? "Meine-Familienakte" : "Datei-Organizer"}`, commit, dateien };
  console.log(`${name} @ ${commit}: ${Object.keys(dateien).length} Dateien`);
}
writeFileSync(PIN, JSON.stringify(aus, null, 1) + "\n");
