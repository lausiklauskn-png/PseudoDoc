// Probe PseudoDoc (Kern, ohne Browser): Auftrag aus drei erfundenen Dateien, gleiche Platzhalter über alle Dateien,
// nichts Persönliches im Ordner für die KI, Rückweg, Bildstellen, Flächen, ZIP/Word, kein Netzweg.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { sauber, auftragMaskieren, kiDateien, antwortenZurueck, stellenImBild, kennzeichenImBild, kennung, allesInEinerDatei } from "../lib/pseudo/auftrag.ts";
import { box, drin, inBox, anfasserZiehen, vieleckDoppeltipp, Verlauf, ausPixeln } from "../lib/pseudo/flaechen.ts";
import { zipBauen, docxBauen } from "../lib/pseudo/pakete.ts";
import { zipEintrag, officeText } from "../lib/bausteine/zip.ts";
import { runMaskeSelfTests } from "../lib/maske/maske.ts";

const welt = {};
new Function("window", "self", "globalThis", readFileSync("src/public/vendor/maske/25_pseudonym.js", "utf8"))(welt, welt, welt);
const p = welt.SbkimPseudonym || globalThis.SbkimPseudonym;
assert.ok(p, "Modul 25 hat sich nicht angemeldet");
let n = 0;
const ok = (name, bed, mehr = "") => { assert.ok(bed, `${name}${mehr ? ` – ${mehr}` : ""}`); n++; console.log(`🟢 ${name}`); };

for (const t of runMaskeSelfTests(p)) ok(`Maske (Familienakte): ${t.label}`, t.passed, t.summary);

// Erfundene Unterlagen: Brief des Vermieters, Nutzungsvereinbarung, AGB.
const brief = "Sehr geehrte Frau Mara Testfeld,\nIhre Wohnung Lindenweg 12, 12345 Musterstadt: Nachzahlung 412,50 € bis 31.12.2026.\nIBAN DE89 3704 0044 0532 0130 00. Mit freundlichen Grüßen Ole Brink, Hausverwaltung Brink";
const vereinbarung = "Nutzungsvereinbarung zwischen Ole Brink und Mara Testfeld über den Stellplatz.\nKundennummer: KD-2024-118833. Telefon 0170 1234567.";
const agb = "Allgemeine Geschäftsbedingungen der Schirmchen Versicherung GmbH\n§ 5 Abs. 2: Nachzahlungen sind binnen 30 Tagen fällig.";
const stuecke = [brief, vereinbarung, agb].map((text, i) => ({ kennung: kennung(i), pfad: `Datei ${i}.txt`, art: "text", text, fassung: "", funde: 0, unsicher: [], leck: null, schon: false }));
const r = auftragMaskieren(p, stuecke, { verdecken: [], bleibt: [] });
const geheim = ["Mara", "Testfeld", "Ole Brink", "Lindenweg 12", "12345 Musterstadt", "DE89", "KD-2024-118833", "0170 1234567"];
for (const s of r.stuecke) ok(`${s.kennung} ohne Klartext`, !geheim.some((g) => s.fassung.includes(g)) && !s.leck, geheim.filter((g) => s.fassung.includes(g)).join(", "));
const tokMara = Object.keys(r.map).find((k) => r.map[k] === "Mara Testfeld");
ok("Gleiche Person, gleicher Platzhalter in Brief und Vereinbarung", tokMara && r.stuecke[0].fassung.includes(tokMara) && r.stuecke[1].fassung.includes(tokMara), tokMara);
ok("AGB: Firma, Paragraf, Betrag und Frist bleiben lesbar", r.stuecke[2].fassung.includes("Schirmchen Versicherung GmbH") && r.stuecke[0].fassung.includes("412,50 €") && r.stuecke[0].fassung.includes("31.12.2026"));

const wahl = { ziel: "antwort", stile: ["freundlich", "kurz"], frei: "Bitte um Ratenzahlung.", brief: "D01" };
const dateien = kiDateien(wahl, r.stuecke);
const alles = dateien.map((d) => d.text).join("\n");
ok("Ordner für die KI: kein Klarwert, kein echter Dateiname, keine Zuordnung", !geheim.some((g) => alles.includes(g)) && !alles.includes("Datei 0.txt") && !Object.values(r.map).some((v) => v.length > 3 && alles.includes(v)));
ok("Auftrag nennt Stil und Brief", alles.includes("freundlich und zugewandt") && alles.includes("D01 (Brief)") && alles.includes("Ratenzahlung"));
ok("Eine Datei für die KI enthält alle drei", ["## D01", "## D02", "## D03"].every((k) => allesInEinerDatei(wahl, r.stuecke).includes(k)));
const weg = kiDateien(wahl, r.stuecke.map((s, i) => (i === 2 ? { ...s, weglassen: true } : s)));
ok("Abgewählte Datei geht nicht hinaus", !weg.some((d) => d.name === "D03.txt") && !weg.find((d) => d.name === "ALLES-IN-EINER-DATEI.md").text.includes("## D03"));

// Zweiter Durchgang mit „darf bleiben“
const r2 = auftragMaskieren(p, stuecke, { verdecken: ["Stellplatz"], bleibt: ["Hausverwaltung Brink"] });
ok("Korrektur: „immer verdecken“ greift", !r2.stuecke[1].fassung.includes("Stellplatz"));

// Rückweg
const antwort = `⟦PSEUDONYMISIERT v1⟧\nSehr geehrter ${Object.keys(r.map).find((k) => r.map[k] === "Ole Brink")},\nich, ${tokMara}, bitte um Ratenzahlung. ⟦NAME-77⟧`;
const z = antwortenZurueck(p, [{ name: "antwort.md", text: antwort }], r.map)[0];
ok("Zurückgeführt: echte Namen wieder drin", z.text.includes("Ole Brink") && z.text.includes("Mara Testfeld") && !z.text.startsWith("⟦PSEUDONYMISIERT"));
ok("Unbekannter Platzhalter wird gemeldet", z.offen.join() === "⟦NAME-77⟧" && z.name === "antwort (zurückgeführt).md");

// Bilder: Wörter aus der Texterkennung
const w = (text, x) => ({ text, x0: x, y0: 10, x1: x + 40, y1: 30 });
const woerter = [w("Frau", 0), w("Mara", 50), w("Testfeld,", 100), w("IBAN", 150), w("DE89", 200), w("3704", 250), w("0044", 300), w("0532", 350), w("0130", 400), w("00", 450), w("KN-AB", 500), w("123", 550)];
const stellen = stellenImBild(woerter, Object.values(r.map));
ok("Bild: Name und IBAN (über mehrere Wörter) gefunden", stellen.some((s) => s.x <= 50 && s.x + s.w >= 140) && stellen.some((s) => s.x <= 200 && s.x + s.w >= 490), JSON.stringify(stellen));
ok("Bild: Wort „Frau“ bleibt frei", !stellen.some((s) => s.x < 40 && s.x + s.w < 60));
ok("Bild: Kennzeichen erkannt", kennzeichenImBild(woerter).length === 1);

// Flächen
const f = ausPixeln({ x: 100, y: 50, w: 200, h: 100 }, 1000, 500, "test");
ok("Fläche relativ zum Bild", Math.abs(f.x - 0.1) < 1e-9 && Math.abs(f.h - 0.2) < 1e-9 && drin(f, 0.2, 0.2) && !drin(f, 0.5, 0.5));
ok("Anfasser: Ecke rechts unten vergrößert", JSON.stringify(anfasserZiehen({ x: 0, y: 0, w: 1, h: 1 }, 4, 0.5, 0.5)) === JSON.stringify({ x: 0, y: 0, w: 1.5, h: 1.5 }));
ok("Anfasser über die Kante gezogen dreht nicht um", anfasserZiehen({ x: 0.2, y: 0.2, w: 0.1, h: 0.1 }, 0, 0.3, 0).w > 0);
const ell = { id: "e", art: "ellipse", x: 0, y: 0, w: 1, h: 1 };
ok("Ellipse: Mitte drin, Ecke nicht", drin(ell, 0.5, 0.5) && !drin(ell, 0.02, 0.02));
const vier = { id: "v", art: "vieleck", punkte: [[0, 0], [1, 0], [1, 1], [0, 1]] };
const fuenf = vieleckDoppeltipp(vier, [0.5, 0.001], 0.02);
ok("Vieleck: Doppeltipp auf Linie setzt Punkt", fuenf && fuenf.punkte.length === 5);
ok("Vieleck: Doppeltipp auf Punkt nimmt ihn weg", vieleckDoppeltipp(fuenf, [0.5, 0.001], 0.02).punkte.length === 4);
ok("Vieleck: unter drei Punkte geht nicht", vieleckDoppeltipp({ ...vier, punkte: vier.punkte.slice(0, 3) }, [0, 0], 0.02) === null);
const gross = inBox(vier, { x: 0, y: 0, w: 2, h: 2 });
ok("Vieleck: Rahmen skaliert die Punkte", JSON.stringify(box(gross)) === JSON.stringify({ x: 0, y: 0, w: 2, h: 2 }));
const v = new Verlauf(2); v.merken(1); v.merken(2); v.merken(3);
ok("Rückgängig: höchstens N Schritte, Wiederholen", v.rueck(4) === 3 && v.rueck(3) === 2 && v.rueck(2) === null && v.wieder(2) === 3);

// Unsichtbare Zeichen: gehen nie hinaus, und ein Name mit Nullbreiten-Zeichen dazwischen wird trotzdem verdeckt.
const versteckt = "Mara\u200B Test\u200Dfeld\u2066 schreibt\u{E0041}\u00AD.";
ok("Unsichtbare Zeichen entfernt", sauber(versteckt) === "Mara Testfeld schreibt.", JSON.stringify(sauber(versteckt)));
const rv = auftragMaskieren(p, [{ ...stuecke[0], text: "Sehr geehrte Frau Mara Test\u200Bfeld,\nbitte zahlen." }], { verdecken: [], bleibt: [] });
ok("Name mit Nullbreiten-Zeichen wird verdeckt, kein unsichtbares Zeichen in der Fassung", !rv.stuecke[0].fassung.includes("Testfeld") && !/[\u200B-\u200F\u2060-\u206F\uFEFF]/.test(rv.stuecke[0].fassung), rv.stuecke[0].fassung);

// ZIP und Word
const zip = zipBauen([{ name: "a.txt", daten: "Hallo ⟦NAME-1⟧" }, { name: "b/c.txt", daten: "zwei" }]);
ok("ZIP lesbar", new TextDecoder().decode(await zipEintrag(zip, "a.txt")) === "Hallo ⟦NAME-1⟧" && new TextDecoder().decode(await zipEintrag(zip, "b/c.txt")) === "zwei");
ok("ZIP: gleicher Inhalt, gleiche Bytes", Buffer.compare(Buffer.from(zip), Buffer.from(zipBauen([{ name: "a.txt", daten: "Hallo ⟦NAME-1⟧" }, { name: "b/c.txt", daten: "zwei" }]))) === 0);
const doc = docxBauen("# Antwort\nSehr geehrter Herr Brink,\n**wichtig** & <klar>");
const docText = await officeText(doc, "x.docx");
ok("Word-Datei: Text kommt heraus", docText.includes("Sehr geehrter Herr Brink,") && docText.includes("wichtig & <klar>"), docText);

// Kein Netzweg in Kern und Oberfläche des Pseudonymisierers
const ohneNetz = (datei) => { const q = readFileSync(datei, "utf8").replace(/\/\/.*$/gm, ""); return !/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|import\(\s*["']https?:/.test(q); };
const dateienOhneNetz = [...readdirSync("lib/pseudo").map((d) => `lib/pseudo/${d}`), ...readdirSync("src").filter((d) => /\.tsx?$/.test(d)).map((d) => `src/${d}`)];
for (const d of dateienOhneNetz) ok(`Kein Netzaufruf: ${d}`, ohneNetz(d));
console.log(`PseudoDoc-Kern: ${n} grün`);
