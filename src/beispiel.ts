// Beispiel zum Ausprobieren (alles erfunden, Nummern ausgedacht): Brief der Hausverwaltung, Nutzungsvereinbarung, AGB und ein
// Foto vom Parkplatz mit Kennzeichen und Namensschild – im Browser gezeichnet, keine echte Aufnahme.
import type { Eingang } from "./lesen.ts";

const t = (s: string) => new TextEncoder().encode(s);

async function foto(): Promise<Uint8Array> {
  const c = document.createElement("canvas"); c.width = 1200; c.height = 800;
  const g = c.getContext("2d")!;
  g.fillStyle = "#9db7c9"; g.fillRect(0, 0, 1200, 380);
  g.fillStyle = "#6f757b"; g.fillRect(0, 380, 1200, 420);
  g.fillStyle = "#b03a2e"; g.beginPath(); g.roundRect(220, 300, 760, 300, 60); g.fill();
  g.fillStyle = "#cfe3f1"; g.fillRect(330, 330, 230, 110); g.fillRect(600, 330, 260, 110);
  g.fillStyle = "#222"; for (const x of [330, 870]) { g.beginPath(); g.arc(x, 610, 75, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = "#fff"; g.fillRect(450, 500, 300, 70); g.strokeStyle = "#111"; g.lineWidth = 4; g.strokeRect(450, 500, 300, 70);
  g.fillStyle = "#1f4fa0"; g.fillRect(450, 500, 30, 70);
  g.fillStyle = "#111"; g.font = "bold 50px Arial"; g.textBaseline = "middle"; g.fillText("KN-XY 123", 492, 537);
  g.fillStyle = "#fffbe8"; g.fillRect(60, 80, 420, 120); g.strokeRect(60, 80, 420, 120);
  g.fillStyle = "#111"; g.font = "bold 38px Arial"; g.fillText("Stellplatz 7", 90, 120); g.font = "34px Arial"; g.fillText("Mara Testfeld", 90, 170);
  const b = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/png"));
  return new Uint8Array(await b!.arrayBuffer());
}

export async function beispielDateien(): Promise<Eingang[]> {
  return [
    { pfad: "Brief Hausverwaltung.txt", name: "Brief Hausverwaltung.txt", bytes: t("Hausverwaltung Brink\nOle Brink · Kastanienallee 4 · 78462 Konstanz\n\nFrau\nMara Testfeld\nLindenweg 12\n12345 Musterstadt\n\nKonstanz, 02.11.2026\n\nNebenkostenabrechnung 2025 – Stellplatz 7\n\nSehr geehrte Frau Testfeld,\nfür den Stellplatz ergibt sich eine Nachzahlung von 412,50 €. Bitte überweisen Sie den Betrag bis 31.12.2026 auf das Konto IBAN DE89 3704 0044 0532 0130 00.\nRückfragen gern unter Telefon 07531 998877.\n\nMit freundlichen Grüßen\nOle Brink\n") },
    { pfad: "Nutzungsvereinbarung Stellplatz.txt", name: "Nutzungsvereinbarung Stellplatz.txt", bytes: t("Nutzungsvereinbarung\nzwischen Ole Brink (Vermieter) und Mara Testfeld (Mieterin), geb. 03.04.1981, Kundennummer: KD-2024-118833\n\n§ 1 Gegenstand: Stellplatz 7 auf dem Grundstück Kastanienallee 4.\n§ 3 Nebenkosten: Umgelegt werden nur Reinigung und Beleuchtung des Stellplatzes, höchstens 120 € im Jahr.\n§ 5 Zahlung: Nachzahlungen sind binnen 30 Tagen nach Zugang der Abrechnung fällig.\n") },
    { pfad: "AGB Schirmchen Versicherung.txt", name: "AGB Schirmchen Versicherung.txt", bytes: t("Allgemeine Geschäftsbedingungen der Schirmchen Versicherung GmbH\n\n§ 1 Geltung: Diese Bedingungen gelten für alle Stellplatz-Versicherungen.\n§ 4 Schäden am Fahrzeug sind innerhalb einer Woche zu melden.\n") },
    { pfad: "Foto Parkplatz.png", name: "Foto Parkplatz.png", bytes: await foto() },
  ];
}
