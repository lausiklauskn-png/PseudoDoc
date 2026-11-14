// Offline-Vorrat von PseudoDoc: nur die App selbst, nie Nutzerdateien. Neue Fassung = neue Nummer.
const VORRAT = "pseudodoc-v2";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VORRAT).then((c) => c.addAll(["./", "./index.html", "./manifest.webmanifest", "./pseudodoc.svg", "./pseudodoc-192.png", "./pseudodoc-512.png", "./datenschutz.html", "./vendor/maske/25_pseudonym.js"])).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n.startsWith("pseudodoc-v") && n !== VORRAT).map((n) => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || !u.pathname.startsWith(new URL("./", self.registration.scope).pathname)) return;
  if (u.pathname.endsWith("/version.json")) return; // Update-Fähnchen fragt immer das Netz, nie den Vorrat
  if (e.request.mode === "navigate") {
    const nebenseite = /\/[^/]+\.html$/.test(u.pathname) && !u.pathname.endsWith("/index.html");
    e.respondWith(fetch(e.request).then((r) => { const k = r.clone(); if (r.ok) caches.open(VORRAT).then((c) => c.put(nebenseite ? e.request : "./index.html", k)); return r; }).catch(() => caches.match(nebenseite ? e.request : "./index.html", { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(e.request).then((t) => t || fetch(e.request).then((r) => { if (r.ok && (u.pathname.includes("/assets/") || u.pathname.includes("/vendor/"))) { const k = r.clone(); caches.open(VORRAT).then((c) => c.put(e.request, k)); } return r; })));
});
