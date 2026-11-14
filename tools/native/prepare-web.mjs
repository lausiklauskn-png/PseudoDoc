// tools/native/prepare-web.mjs — baut das Web-Paket für die native Android-App „PseudoDoc Pro“ (Klaus 13.11.2026).
//
// Vorbild BookLedgerPro tools/native/prepare-web.mjs: kein rekursives Kopieren des Repos, sondern nur der gebaute Stand
// aus app/ (Vite, `npm run build`). Die Web-App bleibt byte-gleich; nur der Service Worker kommt nicht ins App-Paket
// (in der App lädt alles aus dem Paket, ein Offline-Vorrat wäre doppelt und könnte alte Stände festhalten).
// Prüft, dass die Seite nur relative Pfade nutzt (die App läuft unter https://localhost/, Pages unter /PseudoDoc/app/). Das Beispiel („Beispiel ansehen“) erzeugt die App selbst – kein Testordner nötig.
// Jede Abweichung bricht ab, statt zu raten.

import { readFile, writeFile, mkdir, rm, readdir, lstat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, dirname, resolve, relative, sep } from 'node:path';

export const root = fileURLToPath(new URL('../../', import.meta.url));
/** Was nie ins App-Paket darf, auch wenn es in app/ liegt. */
export const NIE = [/(^|\/)\.[^/]+$/, /\.map$/, /^sw\.js$/];
export const sha256 = (b) => createHash('sha256').update(b).digest('hex');

export function istLaufzeit(p) { return !NIE.some((re) => re.test(p)); }

/** Absolute Pfade in src/href würden unter https://localhost/ ins Leere zeigen. Rein, in Node prüfbar. */
export function absolutePfade(html) {
  return [...html.matchAll(/\s(?:src|href)="(\/[^"]*)"/g)].map((m) => m[1]);
}

async function alleDateien(ordner, basis = ordner) {
  const aus = [];
  for (const e of await readdir(ordner, { withFileTypes: true })) {
    const voll = join(ordner, e.name);
    if ((await lstat(voll)).isSymbolicLink()) throw new Error('Verweis statt Datei: ' + relative(basis, voll));
    if (e.isDirectory()) aus.push(...await alleDateien(voll, basis));
    else aus.push(relative(basis, voll).split(sep).join('/'));
  }
  return aus;
}

export async function prepareWeb({ wurzel = root } = {}) {
  const quelle = join(resolve(wurzel), 'app'), aus = join(resolve(wurzel), 'www');
  const auswahl = (await alleDateien(quelle)).filter(istLaufzeit).sort();
  if (!auswahl.includes('index.html') || !auswahl.some((p) => p.startsWith('assets/'))) throw new Error('app/ ist nicht gebaut (npm run build)');
  const html = (await readFile(join(quelle, 'index.html'))).toString('utf8');
  const absolut = absolutePfade(html);
  if (absolut.length) throw new Error('index.html nutzt absolute Pfade: ' + absolut.join(', '));
  for (const m of html.matchAll(/\s(?:src|href)="\.\/([^"?#]+)"/g)) {
    if (!auswahl.includes(m[1])) throw new Error('index.html verweist auf fehlende Datei: ' + m[1]);
  }
  await rm(aus, { recursive: true, force: true });
  await mkdir(aus, { recursive: true });
  const beleg = { quelle: 'PseudoDoc', app: 'PseudoDoc Pro', abweichungen: ['sw.js nicht im App-Paket (kein Offline-Vorrat in der App)'], dateien: [] };
  for (const p of auswahl) {
    const b = await readFile(join(quelle, p));
    await mkdir(dirname(join(aus, p)), { recursive: true });
    await writeFile(join(aus, p), b);
    beleg.dateien.push({ pfad: p, sha256: sha256(b) });
  }
  try { beleg.commit = execFileSync('git', ['-C', wurzel, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* ohne Git-Kopf */ }
  await writeFile(join(aus, 'native-bundle.json'), JSON.stringify(beleg, null, 2) + '\n');
  console.log('Natives Web-Paket: ' + beleg.dateien.length + ' Dateien nach www/');
  return beleg;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await prepareWeb();
