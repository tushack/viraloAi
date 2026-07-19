import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import OfflinePage from "./OfflinePage";

const ONLINE_CHECK_INTERVAL_MS = 30000;
const OFFLINE_RETRY_INTERVAL_MS = 5000;
const REQUEST_TIMEOUT_MS = 5500;

function normalizeUrl(value) {
  return String(value || "").trim();
}

function getCheckUrls() {
  const configuredUrl = normalizeUrl(
    import.meta.env.VITE_NETWORK_CHECK_URL
  );

  const apiBaseUrl = normalizeUrl(
    import.meta.env.VITE_API_BASE_URL
  );

  const urls = [];

  if (configuredUrl) {
    urls.push(configuredUrl);
  }

  if (apiBaseUrl) {
    try {
      urls.push(
        new URL(apiBaseUrl, window.location.origin)
          .origin
      );
    } catch {
      // Invalid environment URL is ignored.
    }
  }

  /*
   * Public fallbacks prevent a temporary backend outage from being
   * incorrectly shown as "no internet".
   */
  urls.push(
    "https://www.gstatic.com/generate_204",
    "https://1.1.1.1/cdn-cgi/trace"
  );

  return [...new Set(urls)];
}

async function verifyInternetConnection() {
  if (navigator.onLine === false) {
    return false;
  }

  const urls = getCheckUrls();
  const controllers = urls.map(
    () => new AbortController()
  );

  const timeoutId = window.setTimeout(() => {
    controllers.forEach((controller) =>
      controller.abort()
    );
  }, REQUEST_TIMEOUT_MS);

  try {
    await Promise.any(
      urls.map((url, index) =>
        fetch(
          `${url}${
            url.includes("?") ? "&" : "?"
          }viralo_network_check=${Date.now()}`,
          {
            method: "GET",
            mode: "no-cors",
            cache: "no-store",
            credentials: "omit",
            signal: controllers[index].signal,
          }
        )
      )
    );

    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);

    controllers.forEach((controller) =>
      controller.abort()
    );
  }
}

export default function NetworkGate({ children }) {
  const initialOnline =
    typeof navigator === "undefined"
      ? true
      : navigator.onLine !== false;

  const [status, setStatus] = useState(
    initialOnline ? "online" : "offline"
  );

  const statusRef = useRef(status);
  const failedChecksRef = useRef(0);
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

  const runConnectionCheck = useCallback(
    async ({
      showChecking = false,
      requireTwoFailures = false,
    } = {}) => {
      const sequence =
        checkSequenceRef.current + 1;

      checkSequenceRef.current = sequence;

      if (navigator.onLine === false) {
        failedChecksRef.current = 2;
        setConnectionStatus("offline");
        return false;
      }

      if (
        showChecking &&
        statusRef.current !== "online"
      ) {
        setConnectionStatus("checking");
      }

      const connected =
        await verifyInternetConnection();

      if (
        sequence !== checkSequenceRef.current
      ) {
        return connected;
      }

      if (connected) {
        const wasDisconnected =
          statusRef.current === "offline" ||
          statusRef.current === "checking";

        failedChecksRef.current = 0;

        if (wasDisconnected) {
          setConnectionStatus("restored");

          window.dispatchEvent(
            new Event("viralo:network-restored")
          );

          if (recoveryTimerRef.current) {
            window.clearTimeout(
              recoveryTimerRef.current
            );
          }

          recoveryTimerRef.current =
            window.setTimeout(() => {
              setConnectionStatus("online");
            }, 900);
        } else {
          setConnectionStatus("online");
        }

        return true;
      }

      failedChecksRef.current += 1;

      if (
        !requireTwoFailures ||
        failedChecksRef.current >= 2
      ) {
        setConnectionStatus("offline");
      }

      return false;
    },
    [setConnectionStatus]
  );

  useEffect(() => {
    const handleOffline = () => {
      checkSequenceRef.current += 1;
      failedChecksRef.current = 2;
      setConnectionStatus("offline");
    };

    const handleOnline = () => {
      failedChecksRef.current = 0;

      runConnectionCheck({
        showChecking: true,
      });
    };

    const handleVisibilityOrFocus = () => {
      if (
        document.visibilityState === "visible"
      ) {
        runConnectionCheck({
          showChecking:
            statusRef.current !== "online",
          requireTwoFailures:
            statusRef.current === "online",
        });
      }
    };

    window.addEventListener(
      "offline",
      handleOffline
    );
    window.addEventListener("online", handleOnline);
    window.addEventListener(
      "focus",
      handleVisibilityOrFocus
    );
    document.addEventListener(
      "visibilitychange",
      handleVisibilityOrFocus
    );

    runConnectionCheck({
      requireTwoFailures: false,
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
  }, [runConnectionCheck, setConnectionStatus]);

  useEffect(() => {
    const intervalMs =
      status === "online"
        ? ONLINE_CHECK_INTERVAL_MS
        : OFFLINE_RETRY_INTERVAL_MS;

    const intervalId = window.setInterval(
      () => {
        runConnectionCheck({
          showChecking: false,
          requireTwoFailures:
            statusRef.current === "online",
        });
      },
      intervalMs
    );

    return () =>
      window.clearInterval(intervalId);
  }, [runConnectionCheck, status]);

  useEffect(() => {
    const shouldLockScroll =
      status !== "online";

    const previousOverflow =
      document.body.style.overflow;

    if (shouldLockScroll) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [status]);

  useEffect(
    () => () => {
      if (recoveryTimerRef.current) {
        window.clearTimeout(
          recoveryTimerRef.current
        );
      }
    },
    []
  );

  return (
    <>
      {children}

      {status !== "online" ? (
        <OfflinePage
          status={status}
          onRetry={() =>
            runConnectionCheck({
              showChecking: true,
            })
          }
        />
      ) : null}
    </>
  );
}
