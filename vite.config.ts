import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const FASSUNG = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version;

// Reine Browser-App: keine Serverfunktionen, relative Pfade. Quelle in src/, gebaut nach app/ (wird mitgeliefert, damit GitHub Pages
// sie ohne eigenen Bauschritt zeigt; die Wurzel-index.html leitet dorthin).
export default defineConfig({
  root: fileURLToPath(new URL("./src", import.meta.url)),
  base: "./",
  define: { __PD_FASSUNG__: JSON.stringify(FASSUNG) },
  // version.json neben der Seite: das Update-Fähnchen der Web-App vergleicht sie mit der eingebauten Fassung (src/kopf.tsx).
  plugins: [react(), { name: "pd-version", generateBundle() { this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ fassung: FASSUNG }) + "\n" }); } }],
  build: { outDir: fileURLToPath(new URL("./app", import.meta.url)), emptyOutDir: true, chunkSizeWarningLimit: 1500 },
  server: { port: 5175 },
});
