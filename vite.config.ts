import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Reine Browser-App: keine Serverfunktionen, relative Pfade. Quelle in src/, gebaut nach app/ (wird mitgeliefert, damit GitHub Pages
// sie ohne eigenen Bauschritt zeigt; die Wurzel-index.html leitet dorthin).
export default defineConfig({
  root: fileURLToPath(new URL("./src", import.meta.url)),
  base: "./",
  plugins: [react()],
  build: { outDir: fileURLToPath(new URL("./app", import.meta.url)), emptyOutDir: true, chunkSizeWarningLimit: 1500 },
  server: { port: 5175 },
});
