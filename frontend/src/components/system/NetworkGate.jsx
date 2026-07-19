import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import OfflinePage from "./OfflinePage";

const ONLINE_CHECK_INTERVAL_MS = 10000;
const OFFLINE_RETRY_INTERVAL_MS = 3000;
const REQUEST_TIMEOUT_MS = 4500;

function normalizeUrl(value) {
  return String(value || "").trim();
}

function isLocalOrPrivateHostname(hostname) {
  const cleanHostname = String(hostname || "")
    .trim()
    .toLowerCase();

  if (
    !cleanHostname ||
    cleanHostname === "localhost" ||
    cleanHostname === "127.0.0.1" ||
    cleanHostname === "::1" ||
    cleanHostname.endsWith(".local")
  ) {
    return true;
  }

  if (
    /^10\./.test(cleanHostname) ||
    /^192\.168\./.test(cleanHostname) ||
    /^169\.254\./.test(cleanHostname)
  ) {
    return true;
  }

  const private172Match =
    cleanHostname.match(/^172\.(\d{1,3})\./);

  if (private172Match) {
    const secondPart = Number(
      private172Match[1]
    );

    if (
      secondPart >= 16 &&
      secondPart <= 31
    ) {
      return true;
    }
  }

  return false;
}

function getCheckUrls() {
  const urls = [];

  const configuredUrl = normalizeUrl(
    import.meta.env.VITE_NETWORK_CHECK_URL
  );

  if (configuredUrl) {
    try {
      const parsedUrl = new URL(
        configuredUrl,
        window.location.origin
      );

      /*
       * A local/private API can keep working without public internet,
       * so it must not be treated as proof of internet connectivity.
       */
      if (
        !isLocalOrPrivateHostname(
          parsedUrl.hostname
        )
      ) {
        urls.push(parsedUrl.toString());
      }
    } catch {
      // Invalid custom heartbeat URL is ignored.
    }
  }

  urls.push(
    "https://www.gstatic.com/generate_204",
    "https://1.1.1.1/cdn-cgi/trace"
  );

  return [...new Set(urls)];
}

function createOfflineFetchError() {
  const error = new TypeError(
    "Internet connection is unavailable."
  );

  error.code = "VIRALO_OFFLINE";

  return error;
}

async function verifyInternetConnection(
  nativeFetch
) {
  if (
    navigator.onLine === false ||
    typeof nativeFetch !== "function"
  ) {
    return false;
  }

  const urls = getCheckUrls();

  const controllers = urls.map(
    () => new AbortController()
  );

  const timeoutId = window.setTimeout(() => {
    controllers.forEach((controller) => {
      controller.abort();
    });
  }, REQUEST_TIMEOUT_MS);

  try {
    await Promise.any(
      urls.map((url, index) =>
        nativeFetch(
          `${url}${
            url.includes("?") ? "&" : "?"
          }viralo_network_check=${Date.now()}`,
          {
            method: "GET",
            mode: "no-cors",
            cache: "no-store",
            credentials: "omit",
            redirect: "follow",
            signal:
              controllers[index].signal,
          }
        )
      )
    );

    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);

    controllers.forEach((controller) => {
      controller.abort();
    });
  }
}

export default function NetworkGate({
  children,
}) {
  /*
   * Refresh fix:
   * When the browser reports online, render the current page immediately.
   * Real internet verification still runs silently in the background.
   */
  const initialOnline =
    typeof navigator === "undefined"
      ? true
      : navigator.onLine !== false;

  const [status, setStatus] = useState(
    initialOnline ? "online" : "offline"
  );

  const statusRef = useRef(status);

  const nativeFetchRef = useRef(
    typeof window !== "undefined"
      ? window.fetch.bind(window)
      : null
  );

  const activeRequestControllersRef =
    useRef(new Set());

  const checkSequenceRef = useRef(0);
  const recoveryTimerRef = useRef(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const setConnectionStatus = useCallback(
    (nextStatus) => {
      statusRef.current = nextStatus;
      setStatus(nextStatus);
    },
    []
  );

  const abortApplicationRequests =
    useCallback(() => {
      activeRequestControllersRef.current.forEach(
        (controller) => {
          controller.abort();
        }
      );

      activeRequestControllersRef.current.clear();
    }, []);

  useEffect(() => {
    const originalFetch =
      nativeFetchRef.current;

    if (typeof originalFetch !== "function") {
      return undefined;
    }

    const guardedFetch = (
      input,
      init = {}
    ) => {
      if (
        statusRef.current !== "online"
      ) {
        return Promise.reject(
          createOfflineFetchError()
        );
      }

      const controller =
        new AbortController();

      activeRequestControllersRef.current.add(
        controller
      );

      const externalSignal = init?.signal;
      let detachExternalAbort = null;

      if (externalSignal) {
        const forwardAbort = () => {
          controller.abort(
            externalSignal.reason
          );
        };

        if (externalSignal.aborted) {
          forwardAbort();
        } else {
          externalSignal.addEventListener(
            "abort",
            forwardAbort,
            {
              once: true,
            }
          );

          detachExternalAbort = () => {
            externalSignal.removeEventListener(
              "abort",
              forwardAbort
            );
          };
        }
      }

      return originalFetch(input, {
        ...init,
        signal: controller.signal,
      }).finally(() => {
        activeRequestControllersRef.current.delete(
          controller
        );

        detachExternalAbort?.();
      });
    };

    window.fetch = guardedFetch;

    return () => {
      abortApplicationRequests();

      if (window.fetch === guardedFetch) {
        window.fetch = originalFetch;
      }
    };
  }, [abortApplicationRequests]);

  const runConnectionCheck = useCallback(
    async ({
      showChecking = false,
    } = {}) => {
      const sequence =
        checkSequenceRef.current + 1;

      checkSequenceRef.current = sequence;

      if (navigator.onLine === false) {
        abortApplicationRequests();
        setConnectionStatus("offline");
        return false;
      }

      /*
       * Do not show the checking screen during normal refresh,
       * focus checks, or automatic background retries.
       */
      if (
        showChecking &&
        statusRef.current !== "online"
      ) {
        setConnectionStatus("checking");
      }

      const connected =
        await verifyInternetConnection(
          nativeFetchRef.current
        );

      if (
        sequence !==
        checkSequenceRef.current
      ) {
        return connected;
      }

      if (!connected) {
        abortApplicationRequests();
        setConnectionStatus("offline");
        return false;
      }

      const wasDisconnected =
        statusRef.current === "offline" ||
        statusRef.current === "checking";

      if (wasDisconnected) {
        setConnectionStatus("restored");

        window.dispatchEvent(
          new Event(
            "viralo:network-restored"
          )
        );

        if (recoveryTimerRef.current) {
          window.clearTimeout(
            recoveryTimerRef.current
          );
        }

        recoveryTimerRef.current =
          window.setTimeout(() => {
            setConnectionStatus("online");
          }, 700);
      } else {
        setConnectionStatus("online");
      }

      return true;
    },
    [
      abortApplicationRequests,
      setConnectionStatus,
    ]
  );

  useEffect(() => {
    const handleOffline = () => {
      checkSequenceRef.current += 1;

      abortApplicationRequests();
      setConnectionStatus("offline");
    };

    const handleOnline = () => {
      runConnectionCheck({
        showChecking: true,
      });
    };

    const handleVisibilityOrFocus = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        runConnectionCheck({
          showChecking: false,
        });
      }
    };

    window.addEventListener(
      "offline",
      handleOffline
    );

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "focus",
      handleVisibilityOrFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityOrFocus
    );

    /*
     * Silent initial check:
     * Current route stays visible on refresh while connectivity is verified.
     */
    runConnectionCheck({
      showChecking: false,
    });

    return () => {
      window.removeEventListener(
        "offline",
        handleOffline
      );

      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "focus",
        handleVisibilityOrFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityOrFocus
      );
    };
  }, [
    abortApplicationRequests,
    runConnectionCheck,
    setConnectionStatus,
  ]);

  useEffect(() => {
    const intervalMs =
      status === "online"
        ? ONLINE_CHECK_INTERVAL_MS
        : OFFLINE_RETRY_INTERVAL_MS;

    const intervalId =
      window.setInterval(() => {
        runConnectionCheck({
          showChecking: false,
        });
      }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [runConnectionCheck, status]);

  useEffect(
    () => () => {
      abortApplicationRequests();

      if (recoveryTimerRef.current) {
        window.clearTimeout(
          recoveryTimerRef.current
        );
      }
    },
    [abortApplicationRequests]
  );

  if (status !== "online") {
    return (
      <OfflinePage
        status={status}
        onRetry={() =>
          runConnectionCheck({
            showChecking: true,
          })
        }
      />
    );
  }

  return children;
}