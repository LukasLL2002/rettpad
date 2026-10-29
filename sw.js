/* RettPad – Service Worker: alle Dateien beim Installieren cachen (offline-fähig).
   Strategie: Navigation & App-Dateien network-first mit Cache-Fallback (Updates kommen sofort an, offline läuft alles aus dem Cache). */
const C = "rettpad-trainer-v13";
const FILES = ["./", "index.html", "app.css", "data.js", "app.js", "vendor/supabase.js", "manifest.webmanifest", "favicon.ico",
  "icons/icon.svg", "icons/icon-maskable.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-192.png", "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png", "icons/screenshot-wide.png", "icons/screenshot-narrow.png",
  "samples/monitor_a_demo.csv", "samples/monitor_b_demo.json"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then((res) => {
    if (res.ok && res.type === "basic") { const cp = res.clone(); caches.open(C).then((c) => c.put(req.mode === "navigate" ? "index.html" : req, cp)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});
