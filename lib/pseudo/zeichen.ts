// Unsichtbare Zeichen (Nullbreite, Richtungswechsel, weiches Trennzeichen, Unicode-Tags): können versteckte Kennungen oder
// Anweisungen tragen und gehen nie mit hinaus. Normale Leer- und Zeilenumbrüche bleiben. Ohne Abhängigkeiten, damit andere Apps
// (Datei-Organizer, Familienakte) diese Datei und lib/pseudo/rueckweg.ts byte-gleich mit Pin übernehmen können.
export const UNSICHTBAR = /[\u00AD\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]|[\u{E0000}-\u{E007F}]/gu;
export const sauber = (t: string) => t.replace(UNSICHTBAR, "").normalize("NFC");
