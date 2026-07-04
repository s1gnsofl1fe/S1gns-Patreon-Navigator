const shellCacheName = "s1gns-navigator-shell-v2";
const contentCacheName = "s1gns-navigator-content-v2";
const githubLibraryUrl = "https://raw.githubusercontent.com/s1gnsofl1fe/S1gns-Patreon-Guide/main/library-content.json";
const appShellAssets = [
  ".",
  "index.html",
  "styles.css",
  "app.js",
  "data.js",
  "progress-import.js",
  "library-content-validator.js",
  "pwa-register.js",
  "manifest.webmanifest",
  "library-content.json",
  "local_cache/library-content-cache.js",
  "assets/S1gns_of_L1fe_PURPLE_LOGO.png",
  "assets/pwa-icon-192.png",
  "assets/pwa-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(cacheShellAssets());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => ![shellCacheName, contentCacheName].includes(name))
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (request.url === githubLibraryUrl) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "index.html"));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, "", shellCacheName));
  }
});

async function cacheShellAssets() {
  const cache = await caches.open(shellCacheName);
  await Promise.all(appShellAssets.map(async (asset) => {
    try {
      const response = await fetch(asset, { cache: "reload" });
      if (response.ok) await cache.put(asset, response);
    } catch {
      // local_cache is generated for distribution builds, so it may not exist in source/ during development.
    }
  }));
}

async function networkFirst(request, fallbackUrl = "", cacheName = contentCacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (fallbackUrl) {
      const shellCache = await caches.open(shellCacheName);
      const fallback = await shellCache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw error;
  }
}
