// PseudoDoc-Zeichen (Klaus 14.11.2026: „besser als die Standard-Grafik“). Ein Blatt, über das ein Lichtstreifen fährt: links vom
// Streifen sind die Zeilen schon geschwärzt, rechts steht noch Text. Im Kopf fährt der Streifen beim Laden einmal über das Blatt
// (und bei Mausberührung erneut); bei „Bewegung reduzieren“ steht er still. Die Datei public/pseudodoc.svg ist dasselbe Bild ohne
// Bewegung (App-Symbol, Startbildschirm) – beide aus ZEICHEN, damit sie nie auseinanderlaufen (Probe vergleicht).
import { useId, useState } from "react";
import { ZEICHEN } from "./zeichen.ts";

export function Logo({ groesse = 44 }: { groesse?: number }) {
  const id = "pd" + useId().replace(/[^a-z0-9]/gi, "");
  const [lauf, setLauf] = useState(0);
  return <svg key={lauf} viewBox="0 0 64 64" width={groesse} height={groesse} role="img" aria-label="PseudoDoc" className="pd-logo" data-logo
    onMouseEnter={() => setLauf((n) => n + 1)} dangerouslySetInnerHTML={{ __html: ZEICHEN(id, true) }}/>;
}
