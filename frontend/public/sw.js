const CACHE_NAME =
  "viralo-ai-shell-v2";

const CORE_ASSETS = [
  "/",
  "/index.html",
  "/favicon.png",
  "/logo.mp4",
  "/og-image.png",
  "/site.webmanifest",
];

function isApiRequest(url) {
  return (
    url.pathname === "/api" ||
    url.pathname.startsWith("/api/")
  );
}

function isStaticAssetRequest(request) {
  return [
    "script",
    "style",
    "image",
    "font",
    "video",
    "audio",
    "manifest",
  ].includes(request.destination);
}

self.addEventListener(
  "install",
  (event) => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) =>
          Promise.allSettled(
            CORE_ASSETS.map((asset) =>
              cache.add(asset)
            )
          )
        )
    );

    self.skipWaiting();
  }
);

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) =>
                  key !== CACHE_NAME
              )
              .map((key) =>
                caches.delete(key)
              )
          )
        )
        .then(() =>
          self.clients.claim()
        )
    );
  }
);

self.addEventListener(
  "fetch",
  (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (
      request.method !== "GET" ||
      url.origin !== self.location.origin
    ) {
      return;
    }

    if (
      isApiRequest(url) ||
      request.headers
        .get("accept")
        ?.includes("application/json")
    ) {
      event.respondWith(fetch(request));
      return;
    }

    if (request.mode === "navigate") {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (
              response &&
              response.ok
            ) {
              const copy =
                response.clone();

              caches
                .open(CACHE_NAME)
                .then((cache) =>
                  cache.put(
                    "/index.html",
                    copy
                  )
                );
            }

            return response;
          })
          .catch(async () => {
            return (
              (await caches.match(
                "/index.html"
              )) ||
              (await caches.match("/"))
            );
          })
      );

      return;
    }

    if (!isStaticAssetRequest(request)) {
      event.respondWith(fetch(request));
      return;
    }

    event.respondWith(
      caches
        .match(request)
        .then((cachedResponse) => {
          const networkRequest =
            fetch(request)
              .then((response) => {
                if (
                  response &&
                  response.ok
                ) {
                  const copy =
                    response.clone();

                  caches
                    .open(CACHE_NAME)
                    .then((cache) =>
                      cache.put(
                        request,
                        copy
                      )
                    );
                }

                return response;
              });

          return (
            cachedResponse ||
            networkRequest
          );
        })
    );
  }
);
