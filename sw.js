"use strict";
const SHELL_CACHE = "thaguthi-shell-v15";
const FONT_CACHE = "thaguthi-fonts-v1";

const SHELL_FILES = [
  "./",
  "./style.css",
  "./app.js",
  "./i18n.js",
  "./benefitCalculator.js",
  "./data/schemes.json",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];
const SHELL_PATHS = new Set(SHELL_FILES.map((f) => new URL(f, self.registration.scope).pathname));

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => Promise.all(SHELL_FILES.map((f) => cache.add(f).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== FONT_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Google Fonts: cache-first, populate on first fetch so an offline reload
  // never silently falls back to a system font swap.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(req).then((cached) => cached || fetch(req).then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => cached))
      )
    );
    return;
  }

  // Navigations: network-first, fall back to cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./"))
    );
    return;
  }

  // Everything else (app shell, /api/*): cache-first for same-origin static
  // assets, network passthrough for API calls.
  if (req.method === "GET" && url.origin === self.location.origin && SHELL_PATHS.has(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }
});
