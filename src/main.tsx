import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App, VARIANTE } from "./app.tsx";
import "./styles.css";
import "./pseudo.css";
import "./pseudodoc.css";

createRoot(document.getElementById("root")!).render(<StrictMode><App/></StrictMode>);
document.title = `PseudoDoc ${VARIANTE}`;

// Installierbar und offline (nur über https bzw. localhost; nicht in der Pro-App).
const nativ = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
if (!nativ && "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => { /* ohne Vorrat weiter */ }); });
}
