// „Zur KI“ (Klaus 14.11.2026): ein Klick – die pseudonymisierte Fassung liegt in der Zwischenablage, auf Wunsch zusammen mit den
// abgedeckten Bildern, und die KI öffnet sich in einem neuen Fenster; dort nur noch einfügen (Strg+V / lange drücken → Einfügen).
// Am Handy geht es auch über „Teilen“ direkt an die App der KI (Dateien + Text). Die App selbst ruft keine KI auf und sendet nichts.

export const ZIELE = [
  { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com/" },
  { id: "claude", name: "Claude", url: "https://claude.ai/new" },
  { id: "claudecode", name: "Claude Code", url: "https://claude.ai/code" },
  { id: "gemini", name: "Gemini", url: "https://gemini.google.com/app" },
] as const;
export type ZielId = (typeof ZIELE)[number]["id"];

export type Bild = { name: string; blob: Blob };

const laden = (b: Blob) => createImageBitmap(b);
const zuBlob = (c: HTMLCanvasElement) => new Promise<Blob>((ok, nein) => c.toBlob((b) => (b ? ok(b) : nein(new Error("Bild nicht erzeugt"))), "image/png"));

/** Mehrere Bilder zu EINEM Bild (die Zwischenablage hält nur eines): untereinander, jedes mit seiner Kennung (D04 …) als Kopfzeile,
 *  höchstens 2000 px breit. Neu gezeichnet – keine Metadaten aus den Einzelbildern. */
export async function sammelbild(bilder: Bild[]): Promise<Blob | null> {
  if (!bilder.length) return null;
  if (bilder.length === 1) return bilder[0].blob;
  const bm = await Promise.all(bilder.map((b) => laden(b.blob)));
  const breite = Math.min(2000, Math.max(...bm.map((b) => b.width)));
  const kopf = 44, rand = 16;
  const hoehen = bm.map((b) => Math.round(b.height * Math.min(1, breite / b.width)));
  const c = document.createElement("canvas");
  c.width = breite + 2 * rand; c.height = hoehen.reduce((a, h) => a + h + kopf + rand, rand);
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, c.width, c.height);
  let y = rand;
  bm.forEach((b, i) => {
    g.fillStyle = "#0b3154"; g.font = "bold 26px Arial, sans-serif"; g.textBaseline = "middle"; g.fillText(bilder[i].name.replace(/\.png$/, ""), rand, y + kopf / 2);
    y += kopf;
    const w = Math.round(b.width * Math.min(1, breite / b.width));
    g.drawImage(b, rand, y, w, hoehen[i]); y += hoehen[i] + rand;
    b.close();
  });
  return zuBlob(c);
}

const html = (text: string, bildUrl?: string) =>
  `<div>${text.split(/\n/).map((z) => `<p>${z.replace(/&/g, "&amp;").replace(/</g, "&lt;") || "&nbsp;"}</p>`).join("")}${bildUrl ? `<p><img src="${bildUrl}" alt="Bild"></p>` : ""}</div>`;
const alsDataUrl = (b: Blob) => new Promise<string>((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(b); });

/** Text (und ein Bild) in die Zwischenablage. Rückgabe: was hineinging. Muss direkt im Klick laufen. */
export async function kopieren(text: string, bild: Blob | null): Promise<"beides" | "text" | "nichts"> {
  const cb = navigator.clipboard as Clipboard | undefined;
  if (bild && cb?.write && typeof ClipboardItem !== "undefined") {
    try {
      const url = await alsDataUrl(bild);
      await cb.write([new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([html(text, url)], { type: "text/html" }),
        "image/png": bild.type === "image/png" ? bild : new Blob([await bild.arrayBuffer()], { type: "image/png" }),
      })]);
      return "beides";
    } catch { /* weiter mit nur Text */ }
  }
  try { await cb!.writeText(text); return "text"; } catch {
    const t = document.createElement("textarea"); t.value = text; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select();
    const ok = document.execCommand("copy"); t.remove(); return ok ? "text" : "nichts";
  }
}

/** Nur das Bild in die Zwischenablage (zweiter Schritt, falls die KI beim Einfügen nur den Text nimmt). */
export async function bildKopieren(bild: Blob): Promise<boolean> {
  try { await navigator.clipboard.write([new ClipboardItem({ "image/png": bild })]); return true; } catch { return false; }
}

export const teilenMoeglich = (dateien: File[]) => { try { return !!navigator.canShare?.({ files: dateien }); } catch { return false; } };

/** Teilen an eine App (Android/iOS: ChatGPT, Claude, Gemini …): eine Textdatei mit allem und die abgedeckten Bilder. */
export async function teilen(text: string, dateien: File[]): Promise<boolean> {
  try { await navigator.share({ files: dateien, text: text.length < 4000 ? text : undefined, title: "PseudoDoc" }); return true; }
  catch (e) { if ((e as Error).name === "AbortError") return true; return false; }
}

export function oeffnen(url: string) { window.open(url, "_blank", "noopener,noreferrer"); }
