import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

const AppAlertContext = createContext(null);

function getAlertType(message = "") {
  const text = String(message).toLowerCase();

  if (
    text.includes("success") ||
    text.includes("saved") ||
    text.includes("copied") ||
    text.includes("created") ||
    text.includes("updated")
  ) {
    return "success";
  }

  if (
    text.includes("failed") ||
    text.includes("error") ||
    text.includes("wrong") ||
    text.includes("invalid")
  ) {
    return "error";
  }

  return "info";
}

function getAlertTitle(type) {
  if (type === "success") return "Success";
  if (type === "error") return "Something went wrong";
  return "Notice";
}

function getAlertStyles(type) {
  if (type === "success") {
    return {
      iconBox: "bg-emerald-400/10 text-emerald-300",
      border: "border-emerald-300/20",
      glow: "shadow-emerald-950/30",
      bar: "bg-emerald-300",
      Icon: CheckCircle2,
    };
  }

  if (type === "error") {
    return {
      iconBox: "bg-red-400/10 text-red-300",
      border: "border-red-300/20",
      glow: "shadow-red-950/30",
      bar: "bg-red-300",
      Icon: XCircle,
    };
  }

  return {
    iconBox: "bg-cyan-400/10 text-cyan-300",
    border: "border-cyan-300/20",
    glow: "shadow-cyan-950/30",
    bar: "bg-cyan-300",
    Icon: Info,
  };
}

export function AppAlertProvider({ children }) {
  const [alertData, setAlertData] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const confirmResolverRef = useRef(null);

  const showAlert = useCallback((message, options = {}) => {
    const type = options.type || getAlertType(message);

    setAlertData({
      id: Date.now(),
      type,
      title: options.title || getAlertTitle(type),
      message: String(message || "Something happened."),
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertData(null);
  }, []);

  const showConfirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;

      setConfirmData({
        title: options.title || "Are you sure?",
        message:
          options.message ||
          "This action cannot be undone. Please confirm before continuing.",
        confirmText: options.confirmText || "Yes, continue",
        cancelText: options.cancelText || "Cancel",
        type: options.type || "danger",
      });
    });
  }, []);

  const closeConfirm = useCallback((value) => {
    if (confirmResolverRef.current) {
      confirmResolverRef.current(value);
      confirmResolverRef.current = null;
    }

    setConfirmData(null);
  }, []);

  useEffect(() => {
    const oldAlert = window.alert;

    window.alert = (message) => {
      showAlert(message);
    };

    window.appConfirm = showConfirm;

    return () => {
      window.alert = oldAlert;
      delete window.appConfirm;
    };
  }, [showAlert, showConfirm]);

  useEffect(() => {
    if (!alertData) return undefined;

    const timer = setTimeout(() => {
      setAlertData(null);
    }, 3200);

    return () => clearTimeout(timer);
  }, [alertData]);

  const value = useMemo(
    () => ({
      showAlert,
      closeAlert,
      showConfirm,
    }),
    [showAlert, closeAlert, showConfirm]
  );

  const styles = alertData ? getAlertStyles(alertData.type) : null;
  const Icon = styles?.Icon;

  return (
    <AppAlertContext.Provider value={value}>
      {children}

      {alertData && (
        <div className="fixed inset-x-0 top-5 z-[9999] flex justify-center px-4 sm:top-6">
          <div
            className={`w-full max-w-md overflow-hidden rounded-3xl border ${styles.border} bg-[#0b0c11]/95 shadow-2xl ${styles.glow} backdrop-blur-2xl`}
          >
            <div className="flex gap-4 p-4 sm:p-5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${styles.iconBox}`}
              >
                {Icon && <Icon className="h-5 w-5" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  {alertData.title}
                </p>

                <p className="mt-1 break-words text-sm leading-6 text-zinc-400">
                  {alertData.message}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAlert}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="Close alert"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="h-1 w-full bg-white/[0.04]">
              <div
                className={`h-full animate-[alertProgress_3.2s_linear_forwards] ${styles.bar}`}
              />
            </div>
          </div>
        </div>
      )}

      {confirmData && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0c11]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl">
            <div className="p-6 sm:p-7">
              <div className="mb-5 flex items-start gap-4">
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-red-300/20 bg-red-500/10 text-red-300">
                  {confirmData.type === "delete" ||
                  confirmData.type === "danger" ? (
                    <Trash2 className="h-6 w-6" />
                  ) : (
                    <AlertTriangle className="h-6 w-6" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold tracking-tight text-white">
                    {confirmData.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {confirmData.message}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => closeConfirm(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
                  aria-label="Close confirmation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl border border-red-300/10 bg-red-500/[0.06] px-4 py-3">
                <p className="text-xs leading-5 text-red-100/80">
                  Please check carefully. This action may permanently remove
                  your selected data.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => closeConfirm(false)}
                  className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08]"
                >
                  {confirmData.cancelText}
                </button>

                <button
                  type="button"
                  onClick={() => closeConfirm(true)}
                  className="h-11 rounded-2xl bg-red-500 px-4 text-sm font-semibold text-white shadow-lg shadow-red-950/30 transition hover:bg-red-400"
                >
                  {confirmData.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppAlertContext.Provider>
  );
}