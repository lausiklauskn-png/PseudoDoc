// Probe PseudoDoc (Kern, ohne Browser): Auftrag aus drei erfundenen Dateien, gleiche Platzhalter über alle Dateien,
// nichts Persönliches im Ordner für die KI, Rückweg, Bildstellen, Flächen, ZIP/Word, kein Netzweg.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { sauber, auftragMaskieren, kiDateien, antwortenZurueck, stellenImBild, kennzeichenImBild, kennung, allesInEinerDatei } from "../lib/pseudo/auftrag.ts";
import { box, drin, inBox, anfasserZiehen, vieleckDoppeltipp, Verlauf, ausPixeln } from "../lib/pseudo/flaechen.ts";
import { zipBauen, docxBauen } from "../lib/pseudo/pakete.ts";
import { zipEintrag, officeText } from "../lib/bausteine/zip.ts";
import { runMaskeSelfTests } from "../lib/maske/maske.ts";
import { rueckwegPruefen, gesamt } from "../lib/pseudo/rueckweg.ts";
import { officeBereinigen, pdfAusBildern, kopieName } from "../lib/pseudo/bereinigen.ts";

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

// Rückweg prüfen (0.2.0): der ganze Kreis hin und zurück mit einer gestellten KI-Antwort.
{
  const gesendet = r.stuecke.map((s) => s.fassung).join("\n");
  const tokBrink = Object.keys(r.map).find((k) => r.map[k] === "Ole Brink");
  const sauberAntwort = `Sehr geehrter ${tokBrink},\nich bitte um Ratenzahlung.\nMit freundlichen Grüßen ${tokMara}`;
  const z0 = antwortenZurueck(p, [{ name: "a.md", text: sauberAntwort }], r.map)[0];
  const k0 = rueckwegPruefen(sauberAntwort, z0.text, r.map, gesendet);
  ok("Rückweg ohne Fehler: Bericht „in Ordnung“", gesamt(k0.filter((x) => x.kennung !== "PLATZHALTER-FEHLT")) === "ok" && z0.text.includes("Ole Brink") && z0.text.includes("Mara Testfeld"), JSON.stringify(k0));
  const kaputt = `Sehr geehrter ${tokBrink},\nbitte überweisen Sie an DE02 1203 0000 0000 2020 51, Infos unter https://raten.example/x.\nGruß ${tokMara.replace("-", "_")} und ⟦NAME-99⟧`;
  const z1 = antwortenZurueck(p, [{ name: "b.md", text: kaputt }], r.map)[0];
  const k1 = rueckwegPruefen(kaputt, z1.text, r.map, gesendet).map((x) => x.kennung);
  for (const k of ["PLATZHALTER-UEBRIG", "PLATZHALTER-ERFUNDEN", "PLATZHALTER-FEHLT", "NEUER-LINK", "NEUE-IBAN"]) ok(`Rückweg: ${k} wird gemeldet`, k1.includes(k), k1.join(", "));
  ok("Rückweg: eine IBAN aus den eigenen Unterlagen ist nicht neu", !rueckwegPruefen("DE89 3704 0044 0532 0130 00", "DE89 3704 0044 0532 0130 00", r.map, brief).some((x) => x.kennung === "NEUE-IBAN"));
  ok("Rückweg: unsichtbare Zeichen im Ergebnis werden gemeldet", rueckwegPruefen("a", "a​b", {}, "").some((x) => x.kennung === "UNSICHTBARE-ZEICHEN"));
}

// Raus: bereinigte Kopie (0.2.0). Erfundene Word-Datei mit Autor, Firma, Kommentar, Änderungsverfolgung.
{
  const core = `<?xml version="1.0"?><cp:coreProperties xmlns:cp="x" xmlns:dc="y"><dc:title>Angebot</dc:title><dc:creator>Mara Testfeld</dc:creator><cp:lastModifiedBy>Ole Brink</cp:lastModifiedBy></cp:coreProperties>`;
  const app = `<?xml version="1.0"?><Properties><Company>Hausverwaltung Brink</Company><Manager>Ole Brink</Manager></Properties>`;
  const docx = zipBauen([{ name: "[Content_Types].xml", daten: "<Types/>" }, { name: "docProps/core.xml", daten: core }, { name: "docProps/app.xml", daten: app },
    { name: "word/document.xml", daten: `<w:document><w:body><w:p><w:r><w:t>Angebot</w:t></w:r><w:ins w:author="Ole"><w:r><w:t>neu</w:t></w:r></w:ins><w:r><w:rPr><w:vanish/></w:rPr><w:t>geheim</w:t></w:r></w:p></w:body></w:document>` },
    { name: "word/comments.xml", daten: `<w:comments><w:comment w:id="0" w:author="Mara"><w:p><w:r><w:t>Kunde zahlt schlecht</w:t></w:r></w:p></w:comment></w:comments>` }]);
  const b = await officeBereinigen(docx);
  const dec = new TextDecoder();
  const core2 = dec.decode(await zipEintrag(b.bytes, "docProps/core.xml")), app2 = dec.decode(await zipEintrag(b.bytes, "docProps/app.xml"));
  ok("Raus/Word: Autor, Bearbeiter, Firma, Vorgesetzter geleert, Titel bleibt", !/Mara|Brink/.test(core2 + app2) && core2.includes("<dc:title>Angebot</dc:title>"), core2 + app2);
  const kn = b.punkte.map((x) => x.kennung);
  for (const k of ["OFFICE-EIGENSCHAFTEN", "OFFICE-KOMMENTARE", "OFFICE-AENDERUNGEN", "OFFICE-VERSTECKT"]) ok(`Raus/Word: ${k} gemeldet`, kn.includes(k), kn.join(", "));
  ok("Raus/Word: Inhalt des Dokuments unverändert", dec.decode(await zipEintrag(b.bytes, "word/document.xml")).includes("<w:t>Angebot</w:t>"));
  ok("Raus: Original-Bytes unverändert", dec.decode(await zipEintrag(docx, "docProps/core.xml")) === core);
  ok("Raus: kein ZIP → null statt Absturz", (await officeBereinigen(new TextEncoder().encode("kein zip"))) === null);
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
  const pdf = pdfAusBildern([{ jpeg, breite: 10, hoehe: 20, punktBreite: 5, punktHoehe: 10 }, { jpeg, breite: 10, hoehe: 20, punktBreite: 5, punktHoehe: 10 }]);
  const pt = Buffer.from(pdf).toString("latin1");
  const xrefAn = Number(pt.match(/startxref\n(\d+)/)[1]);
  const lagen = pt.slice(xrefAn).match(/^\d{10} 00000 n $/gm).map((z) => Number(z.slice(0, 10)));
  ok("Raus/PDF: aus Seitenbildern, ohne Info und XMP, Querverweise stimmen", pt.startsWith("%PDF-1.4") && pt.trimEnd().endsWith("%%EOF") && !/\/Info|\/Metadata|\/Author/.test(pt) && /\/Count 2/.test(pt) && lagen.every((l, i) => pt.startsWith(`${i + 1} 0 obj`, l)), String(lagen));
  ok("Raus: Name der Kopie", kopieName("Brief.docx") === "Brief-bereinigt.docx" && kopieName("Scan.pdf") === "Scan-bereinigt.pdf" && kopieName("Foto.jpg", ".png") === "Foto-bereinigt.png");
}

// Kein Netzweg in Kern und Oberfläche des Pseudonymisierers
// Einzige erlaubte Abfrage: die eigene version.json (Update-Fähnchen der Web-App, src/kopf.tsx).
const ohneNetz = (datei) => { const q = readFileSync(datei, "utf8").replace(/\/\/.*$/gm, "").replace(/fetch\(`\.\/version\.json\?t=\$\{Date\.now\(\)\}`/g, ""); return !/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|import\(\s*["']https?:/.test(q); };
const dateienOhneNetz = [...readdirSync("lib/pseudo").map((d) => `lib/pseudo/${d}`), ...readdirSync("src").filter((d) => /\.tsx?$/.test(d)).map((d) => `src/${d}`)];
for (const d of dateienOhneNetz) ok(`Kein Netzaufruf: ${d}`, ohneNetz(d));
console.log(`PseudoDoc-Kern: ${n} grün`);
