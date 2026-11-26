// Rückweg prüfen (Klaus 26.11.2026: „ob ich beim Zurückweg auch Fehler gemacht habe … raus und wieder rein“).
// Reine Rechnung, ohne Browser: was die KI mit den Platzhaltern gemacht hat und was sie Neues hineingeschrieben hat.
// Die Prüfung auf Anweisungen an eine KI und versteckten Text macht der Prüfkern in der Oberfläche (src/bericht.ts).
import { UNSICHTBAR } from "./auftrag.ts";

export type Stufe = "achtung" | "hinweis" | "ok";
export type Punkt = { stufe: Stufe; kennung: string; satz: string };

const TOKEN = /⟦[A-Z][A-Z0-9_]*-\d+⟧/g;
const TOKEN_ROH = /⟦[^⟧\n]{1,40}⟧?/g;
const LINK = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;
const MAIL = /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,24}\b/g;
const IBAN = /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}(?: ?[A-Z0-9]{1,3})?\b/g;
const TELEFON = /(?:\+\d{1,3}[ \-/]?|\b0)\d{2,5}[ \-/]?\d{3,10}\b/g;

const liste = (t: string, re: RegExp) => [...new Set((t.match(re) || []).map((x) => x.replace(/[.,;:]+$/, "")))];
const knapp = (l: string[], n = 5) => (l.length > n ? `${l.slice(0, n).join(", ")} und ${l.length - n} weitere` : l.join(", "));
const ohneLeer = (s: string) => s.replace(/\s+/g, "").toLowerCase();

/**
 * Antwort der KI und Ergebnis nach dem Zurückführen gegeneinander halten.
 * - antwort: so, wie sie von der KI kam (mit Platzhaltern)
 * - ergebnis: nach dem Einsetzen der echten Angaben (kann der Nutzer danach noch ändern)
 * - map: Platzhalter → echte Angabe (nur dieser Auftrag)
 * - gesendet: was zur KI ging (die pseudonymisierten Fassungen), um Neues von Übernommenem zu trennen
 */
export function rueckwegPruefen(antwort: string, ergebnis: string, map: Record<string, string>, gesendet: string): Punkt[] {
  const aus: Punkt[] = [];
  const bekannt = new Set(Object.keys(map));

  const rest = liste(ergebnis, TOKEN_ROH);
  if (rest.length) aus.push({ stufe: "achtung", kennung: "PLATZHALTER-UEBRIG", satz: `Im Ergebnis steht noch ein Platzhalter: ${knapp(rest)}. Die KI hat ihn verändert, erfunden oder abgeschnitten. Bitte von Hand ersetzen.` });

  const erfunden = liste(antwort, TOKEN).filter((t) => !bekannt.has(t));
  if (erfunden.length) aus.push({ stufe: "achtung", kennung: "PLATZHALTER-ERFUNDEN", satz: `Diese Platzhalter gab es im Auftrag nicht: ${knapp(erfunden)}. Die KI hat sie selbst gebildet.` });

  const inGesendet = new Set(liste(gesendet, TOKEN).filter((t) => bekannt.has(t)));
  const inAntwort = new Set(liste(antwort, TOKEN));
  const fehlt = [...inGesendet].filter((t) => !inAntwort.has(t));
  if (fehlt.length) aus.push({ stufe: "hinweis", kennung: "PLATZHALTER-FEHLT", satz: `${fehlt.length} ${fehlt.length === 1 ? "Angabe kommt" : "Angaben kommen"} in der Antwort nicht mehr vor (${knapp(fehlt.map((t) => map[t] || t))}). Das kann richtig sein, wenn die KI sie nicht braucht.` });

  const alt = `${gesendet}\n${Object.values(map).join("\n")}`;
  const altKlein = ohneLeer(alt);
  const neu = (re: RegExp) => liste(ergebnis, re).filter((x) => !altKlein.includes(ohneLeer(x)));
  const links = neu(LINK), mails = neu(MAIL), ibans = neu(IBAN), tel = neu(TELEFON).filter((x) => x.replace(/\D/g, "").length >= 7);
  if (links.length) aus.push({ stufe: "hinweis", kennung: "NEUER-LINK", satz: `Die KI hat ${links.length === 1 ? "einen Link" : `${links.length} Links`} eingefügt, die nicht in deinen Unterlagen standen: ${knapp(links)}. Vor dem Weitergeben prüfen.` });
  if (mails.length) aus.push({ stufe: "hinweis", kennung: "NEUE-MAILADRESSE", satz: `Neue Mailadresse von der KI: ${knapp(mails)}. Stimmt sie?` });
  if (ibans.length) aus.push({ stufe: "achtung", kennung: "NEUE-IBAN", satz: `Die KI hat eine Kontonummer eingefügt, die nicht in deinen Unterlagen stand: ${knapp(ibans)}. Nie ungeprüft übernehmen.` });
  if (tel.length) aus.push({ stufe: "hinweis", kennung: "NEUE-TELEFONNUMMER", satz: `Neue Telefonnummer von der KI: ${knapp(tel)}. Stimmt sie?` });

  const unsichtbar = (ergebnis.match(UNSICHTBAR) || []).length;
  if (unsichtbar) aus.push({ stufe: "achtung", kennung: "UNSICHTBARE-ZEICHEN", satz: `${unsichtbar} unsichtbare Zeichen im Ergebnis. „Unsichtbare Zeichen entfernen“ macht den Text sauber.` });

  if (!aus.length) aus.push({ stufe: "ok", kennung: "RUECKWEG-SAUBER", satz: "Alle Platzhalter ersetzt, keine neuen Links, Kontonummern oder unsichtbaren Zeichen." });
  return aus;
}

/** Schlimmste Stufe einer Liste – für die Kopfzeile eines Berichts. */
export const gesamt = (l: Punkt[]): Stufe => (l.some((p) => p.stufe === "achtung") ? "achtung" : l.some((p) => p.stufe === "hinweis") ? "hinweis" : "ok");
