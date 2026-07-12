import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "../../context/AuthContext";
import { Loader2, MailCheck, RefreshCw } from "lucide-react";


export default function DashboardLayout({
  children,
  eyebrow = "Research Dashboard",
  title = "Discover your next viral video",
  onNewScan,
  customSidebar = null,
  headerActionLabel,
  headerActionIcon,
  hideHeaderAction = false,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    user,
    authLoading,
    sendVerificationEmailForCurrentUser,
    refreshCurrentUser,
  } = useAuth();

  const [verificationAction, setVerificationAction] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationError, setVerificationError] = useState("");

  const shouldShowEmailVerification =
    user?.email && user.emailVerified === false;

  const handleRefreshVerification = async () => {
    try {
      setVerificationAction("refresh");
      setVerificationError("");
      setVerificationMessage("");

      const refreshedUser = await refreshCurrentUser();

      if (refreshedUser?.emailVerified) {
        setVerificationMessage("Email verified successfully.");
      } else {
        setVerificationError("Email is not verified yet. Please check your inbox.");
      }
    } catch (error) {
      setVerificationError(
        error?.message || "Could not refresh verification status."
      );
    } finally {
      setVerificationAction("");
    }
  };

  const handleSendVerificationEmail = async () => {
    try {
      setVerificationAction("send");
      setVerificationError("");
      setVerificationMessage("");

      await sendVerificationEmailForCurrentUser();

      setVerificationMessage("Verification email sent. Please check your inbox.");
    } catch (error) {
      setVerificationError(
        error?.message || "Could not send verification email."
      );
    } finally {
      setVerificationAction("");
    }
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("viraloSidebarCollapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("viraloSidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const mainPaddingClass = customSidebar
    ? "lg:pl-72"
    : sidebarCollapsed
      ? "lg:pl-24"
      : "lg:pl-72";

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08090d] text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-white">
              Loading ViralMind...
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Checking your account session
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#08090d] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-12rem] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl sm:h-[34rem] sm:w-[34rem]" />
        <div className="absolute right-[-12rem] top-32 h-[20rem] w-[20rem] rounded-full bg-violet-500/10 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[-16rem] left-[-8rem] h-[22rem] w-[22rem] rounded-full bg-blue-500/10 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
      </div>

      {customSidebar ? (
        customSidebar({
          sidebarOpen,
          setSidebarOpen,
          sidebarCollapsed,
          setSidebarCollapsed,
        })
      ) : (
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />
      )}

      <main
        className={`relative z-10 min-w-0 transition-all duration-300 ${mainPaddingClass}`}
      >
        <Header
          setSidebarOpen={setSidebarOpen}
          eyebrow={eyebrow}
          title={title}
          onNewScan={onNewScan}
          actionLabel={headerActionLabel}
          actionIcon={headerActionIcon}
          hideAction={hideHeaderAction}
        />

        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {shouldShowEmailVerification && (
            <div className="mb-6 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4 shadow-lg shadow-black/20">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-300/15">
                    <MailCheck className="h-5 w-5 text-amber-200" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-amber-100">
                      Verify your email to use free credits
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-100/70">
                      We sent verification to{" "}
                      <span className="font-semibold text-amber-50">
                        {user.email}
                      </span>
                      . After verifying, click refresh status.
                    </p>

                    {(verificationMessage || verificationError) && (
                      <p
                        className={`mt-2 text-xs ${verificationError ? "text-red-200" : "text-emerald-200"
                          }`}
                      >
                        {verificationError || verificationMessage}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleSendVerificationEmail}
                    disabled={Boolean(verificationAction)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-4 text-xs font-semibold text-amber-50 transition hover:bg-amber-200/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {verificationAction === "send" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MailCheck className="h-4 w-4" />
                    )}
                    Resend email
                  </button>

                  <button
                    type="button"
                    onClick={handleRefreshVerification}
                    disabled={Boolean(verificationAction)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-amber-200 px-4 text-xs font-semibold text-black transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {verificationAction === "refresh" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Refresh status
                  </button>
                </div>
              </div>
            </div>
          )}

          {children}
        </div>
      </main>
    </div>
  );
}