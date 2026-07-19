async function clearOldViraloCaches() {
  if (!("caches" in window)) {
    return;
  }

  const cacheKeys =
    await window.caches.keys();

  await Promise.all(
    cacheKeys
      .filter((key) =>
        key.startsWith(
          "viralo-ai-shell-"
        )
      )
      .map((key) =>
        window.caches.delete(key)
      )
  );
}

async function removeDevelopmentWorkers() {
  if (
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  const registrations =
    await navigator.serviceWorker.getRegistrations();

  await Promise.all(
    registrations.map(
      (registration) =>
        registration.unregister()
    )
  );

  await clearOldViraloCaches();
}

export function registerServiceWorker() {
  if (
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  if (!import.meta.env.PROD) {
    removeDevelopmentWorkers().catch(
      (error) => {
        console.error(
          "Could not clear development service worker:",
          error
        );
      }
    );

    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
      .then((registration) => {
        registration.update().catch(
          () => undefined
        );
      })
      .catch((error) => {
        console.error(
          "Viralo AI service worker registration failed:",
          error
        );
      });
  });
}
