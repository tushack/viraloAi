import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  LogOut,
  MailCheck,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const RESEND_COOLDOWN_SECONDS = 60;

function getErrorMessage(error) {
  const code = String(error?.code || "");

  const messages = {
    "auth/too-many-requests":
      "Too many verification emails were requested. Please wait and try again.",
    "auth/network-request-failed":
      "Network connection failed. Check your internet and try again.",
    "auth/user-token-expired":
      "Your session has expired. Please sign in again.",
  };

  return messages[code] || error?.message || "Something went wrong.";
}

function BrandLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-950 shadow-lg shadow-cyan-950/30 sm:h-12 sm:w-12">
        <video
          src="/logo.mp4"
          autoPlay
          muted
          loop
          playsInline
          controls={false}
          disablePictureInPicture
          className="pointer-events-none absolute left-1/2 top-1/2 h-[138%] w-[138%] -translate-x-1/2 -translate-y-1/2 object-cover"
          aria-label="Viralo AI"
        />
      </div>

      <div>
        <p className="text-base font-bold tracking-tight text-white sm:text-lg">
          Viralo AI
        </p>
        <p className="text-[10px] font-medium text-zinc-500 sm:text-[11px]">
          Creator Intelligence
        </p>
      </div>
    </div>
  );
}

function FlowStep({ number, title, description, active, complete }) {
  return (
    <div
      className={`relative flex items-start gap-3 rounded-2xl border p-3.5 ${
        active
          ? "border-cyan-300/20 bg-cyan-300/[0.065]"
          : "border-transparent"
      }`}
    >
      <span
        className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
          complete
            ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
            : active
              ? "border-cyan-300 bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/25"
              : "border-white/10 bg-white/[0.04] text-zinc-600"
        }`}
      >
        {complete ? <CheckCircle2 className="h-4 w-4" /> : number}
      </span>

      <div>
        <p
          className={`text-sm font-semibold ${
            active ? "text-white" : "text-zinc-500"
          }`}
        >
          {title}
        </p>
        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmail() {
  const navigate = useNavigate();

  const {
    user,
    sendVerificationEmailForCurrentUser,
    refreshCurrentUser,
    signOut,
  } = useAuth();

  const cooldownStorageKey = useMemo(
    () => `viraloVerificationResendAt:${user?.uid || "guest"}`,
    [user?.uid]
  );

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState(
    "A verification link has been sent to your email address."
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const storedTime = Number(localStorage.getItem(cooldownStorageKey) || 0);
    const remainingSeconds = Math.max(
      0,
      Math.ceil((storedTime - Date.now()) / 1000)
    );

    setCooldown(remainingSeconds);
  }, [cooldownStorageKey]);

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      const storedTime = Number(localStorage.getItem(cooldownStorageKey) || 0);
      const remainingSeconds = Math.max(
        0,
        Math.ceil((storedTime - Date.now()) / 1000)
      );

      setCooldown(remainingSeconds);

      if (remainingSeconds <= 0) {
        localStorage.removeItem(cooldownStorageKey);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown, cooldownStorageKey]);

  const checkVerification = useCallback(
    async ({ silent = false } = {}) => {
      if (checking) {
        return;
      }

      try {
        setChecking(true);

        if (!silent) {
          setError("");
          setMessage("");
        }

        const refreshedUser = await refreshCurrentUser();

        if (refreshedUser?.emailVerified) {
          localStorage.removeItem(cooldownStorageKey);
          navigate("/dashboard", { replace: true });
          return;
        }

        if (!silent) {
          setError(
            "Your email is not verified yet. Open the verification link in your inbox, then try again."
          );
        }
      } catch (err) {
        if (!silent) {
          setError(getErrorMessage(err));
        }
      } finally {
        setChecking(false);
      }
    },
    [checking, cooldownStorageKey, navigate, refreshCurrentUser]
  );

  useEffect(() => {
    const handleWindowFocus = () => {
      checkVerification({ silent: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVerification({ silent: true });
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkVerification]);

  const handleResend = async () => {
    if (resending || cooldown > 0) {
      return;
    }

    try {
      setResending(true);
      setError("");
      setMessage("");

      await sendVerificationEmailForCurrentUser();

      const nextAllowedTime =
        Date.now() + RESEND_COOLDOWN_SECONDS * 1000;

      localStorage.setItem(
        cooldownStorageKey,
        String(nextAllowedTime)
      );

      setCooldown(RESEND_COOLDOWN_SECONDS);
      setMessage(
        "A new verification email has been sent. Please also check your spam or promotions folder."
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate("/", { replace: true });
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050711] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(34,211,238,0.13),transparent_28%),radial-gradient(circle_at_90%_12%,rgba(139,92,246,0.14),transparent_30%),linear-gradient(180deg,#050711_0%,#070a13_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:46px_46px]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1350px] flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <header className="flex min-h-16 items-center border-b border-white/10 pb-4">
          <BrandLogo />
        </header>

        <div className="flex flex-1 items-center py-6 sm:py-8">
          <div className="grid w-full gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-7">
            <aside className="hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/25 backdrop-blur-xl lg:flex lg:min-h-[620px] lg:flex-col">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secure account setup
                </span>

                <h1 className="mt-5 text-xl font-semibold text-white">
                  Complete your account
                </h1>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Email verification is required before Viralo AI can create your
                  personalized workspace.
                </p>
              </div>

              <div className="mt-7 space-y-2">
                <FlowStep
                  number={1}
                  title="Create account"
                  description="Google or email signup"
                  complete
                />

                <FlowStep
                  number={2}
                  title="Verify email"
                  description="Confirm your account email"
                  active
                />

                <FlowStep
                  number={3}
                  title="Creator onboarding"
                  description="Select niche and preferences"
                />

                <FlowStep
                  number={4}
                  title="Open dashboard"
                  description="Get personalized creator ideas"
                />
              </div>

              <div className="mt-auto rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                  <p className="text-xs leading-5 text-zinc-500">
                    Your onboarding and creator tools will unlock immediately
                    after verification.
                  </p>
                </div>
              </div>
            </aside>

            <section className="flex min-w-0 items-center">
              <div className="w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0d16]/95 shadow-2xl shadow-black/30 backdrop-blur-2xl">
                <div className="border-b border-white/10 px-5 py-6 text-center sm:px-8 sm:py-8">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-lg shadow-cyan-950/25">
                    <MailCheck className="h-8 w-8" />
                  </span>

                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    Step 2 of 4
                  </p>

                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                    Verify your email address
                  </h2>

                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-500 sm:text-base">
                    We sent a verification link to{" "}
                    <strong className="break-all font-semibold text-zinc-200">
                      {user?.email || "your registered email"}
                    </strong>
                    . Open the link, then return here to continue.
                  </p>
                </div>

                <div className="p-5 sm:p-8">
                  <div className="mx-auto max-w-2xl">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <MailCheck className="h-5 w-5 text-cyan-200" />
                        <p className="mt-3 text-sm font-semibold text-white">
                          Open your inbox
                        </p>
                        <p className="mt-1 text-xs leading-5 text-zinc-600">
                          Find the email sent by Firebase or Viralo AI.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <ArrowRight className="h-5 w-5 text-violet-200" />
                        <p className="mt-3 text-sm font-semibold text-white">
                          Click the link
                        </p>
                        <p className="mt-1 text-xs leading-5 text-zinc-600">
                          Confirm that this email belongs to you.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                        <p className="mt-3 text-sm font-semibold text-white">
                          Continue setup
                        </p>
                        <p className="mt-1 text-xs leading-5 text-zinc-600">
                          You will move to creator onboarding.
                        </p>
                      </div>
                    </div>

                    {message ? (
                      <p className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] px-4 py-3 text-sm leading-6 text-emerald-100">
                        {message}
                      </p>
                    ) : null}

                    {error ? (
                      <p className="mt-5 rounded-2xl border border-red-400/15 bg-red-500/[0.08] px-4 py-3 text-sm leading-6 text-red-200">
                        {error}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => checkVerification()}
                      disabled={checking}
                      className="mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-500 px-6 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {checking ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Checking verification...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          I have verified my email
                        </>
                      )}
                    </button>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resending || cooldown > 0}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.065] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {resending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : cooldown > 0 ? (
                          <>
                            <Clock3 className="h-4 w-4" />
                            Resend in {cooldown}s
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Resend verification email
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-5 text-sm font-semibold text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                      >
                        <LogOut className="h-4 w-4" />
                        Use another account
                      </button>
                    </div>

                    <p className="mt-5 text-center text-xs leading-6 text-zinc-600">
                      Cannot find the email? Check your spam, junk and promotions
                      folders. Ensure that the displayed email address is correct.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
