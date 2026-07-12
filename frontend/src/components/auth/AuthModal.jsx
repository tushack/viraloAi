import React, { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getPasswordPolicyError } from "../../lib/passwordPolicy";
import { Button } from "../ui/button";

function getAuthErrorMessage(error) {
  const code = String(error?.code || "");

  const messages = {
    "auth/email-already-in-use":
      "An account already exists with this email. Please sign in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/user-not-found": "Incorrect email or password.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/too-many-requests":
      "Too many attempts. Please wait a moment and try again.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/popup-blocked":
      "Google sign-in popup was blocked. Please allow popups and try again.",
    "auth/account-exists-with-different-credential":
      "This email already has another sign-in method. Sign in with email/password first, then connect Google from Settings.",
  };

  return messages[code] || error?.message || "Authentication failed.";
}

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function GoogleIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export default function AuthModal() {
  const {
    authModalOpen,
    setAuthModalOpen,
    signInWithGoogle,
    createEmailPasswordAccount,
    signInWithEmailPassword,
  } = useAuth();

  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState(EMPTY_FORM);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const googlePopupActiveRef = useRef(false);
  const googleFocusTimerRef = useRef(null);


  useEffect(() => {
    if (!googleLoading) return undefined;

    const stopGoogleLoaderAfterFocus = () => {
      if (!googlePopupActiveRef.current) return;

      if (googleFocusTimerRef.current) {
        window.clearTimeout(googleFocusTimerRef.current);
      }

      googleFocusTimerRef.current = window.setTimeout(() => {
        googlePopupActiveRef.current = false;
        setGoogleLoading(false);
      }, 300);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        stopGoogleLoaderAfterFocus();
      }
    };

    window.addEventListener("focus", stopGoogleLoaderAfterFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (googleFocusTimerRef.current) {
        window.clearTimeout(googleFocusTimerRef.current);
        googleFocusTimerRef.current = null;
      }

      window.removeEventListener("focus", stopGoogleLoaderAfterFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [googleLoading]);
  if (!authModalOpen) return null;

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setForm(EMPTY_FORM);
  };

  const handleGoogleSignIn = async () => {
    if (emailLoading || googlePopupActiveRef.current) return;

    try {
      googlePopupActiveRef.current = true;
      setGoogleLoading(true);
      setError("");

      await signInWithGoogle();
    } catch (err) {
      const code = String(err?.code || "");

      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/user-cancelled"
      ) {
        setError("");
        return;
      }

      setError(getAuthErrorMessage(err));
    } finally {
      googlePopupActiveRef.current = false;

      if (googleFocusTimerRef.current) {
        window.clearTimeout(googleFocusTimerRef.current);
        googleFocusTimerRef.current = null;
      }

      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (emailLoading || googleLoading) return;

      setEmailLoading(true);
      setError("");

      if (mode === "signup") {
        const passwordError = getPasswordPolicyError(form.password);

        if (!form.name.trim()) {
          throw new Error("User name is required.");
        }

        if (passwordError) {
          throw new Error(passwordError);
        }

        if (form.password !== form.confirmPassword) {
          throw new Error("Password and confirm password do not match.");
        }

        await createEmailPasswordAccount({
          name: form.name,
          email: form.email,
          password: form.password,
        });
      } else {
        await signInWithEmailPassword({
          email: form.email,
          password: form.password,
        });
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setEmailLoading(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0c11] p-6 shadow-2xl shadow-black/50">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {isSignup ? "Create your account" : "Welcome back"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {isSignup
                ? "Create your Viralo AI account using email and password."
                : "Sign in with your email and password, or continue with Google."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAuthModalOpen(false)}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-zinc-400 hover:bg-white/[0.08]"
            aria-label="Close authentication modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${!isSignup
              ? "bg-cyan-300 text-black"
              : "text-zinc-400 hover:text-white"
              }`}
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${isSignup
              ? "bg-cyan-300 text-black"
              : "text-zinc-400 hover:text-white"
              }`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                User name
              </span>

              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                maxLength={80}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Email
            </span>

            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Password
            </span>

            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="12–24 letters and numbers"
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={12}
              maxLength={24}
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
            />
          </label>

          {isSignup && (
            <>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Confirm password
                </span>

                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    updateField("confirmPassword", event.target.value)
                  }
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={24}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
                />
              </label>

              <p className="text-xs leading-5 text-zinc-500">
                Password must be 12–24 characters, contain only letters and
                numbers, and include at least one letter and one number.
              </p>
            </>
          )}

          <Button
            type="submit"
            disabled={emailLoading || googleLoading}
            className="h-12 w-full rounded-2xl bg-cyan-300 px-5 text-sm font-semibold text-black hover:bg-cyan-200"
          >
            {emailLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Please wait...
              </>
            ) : isSignup ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
            Or
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <Button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={emailLoading || googleLoading}
          className="h-12 w-full rounded-2xl bg-white px-5 text-sm font-semibold text-black hover:bg-zinc-200"
        >
          {googleLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <GoogleIcon className="h-4 w-4" />
              Continue with Google
            </>
          )}
        </Button>

        {error && (
          <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
            {error}
          </p>
        )}

        <p className="mt-5 text-center text-xs leading-5 text-zinc-500">
          {isSignup
            ? "Already have an account?"
            : "New to Viralo AI?"}{" "}
          <button
            type="button"
            onClick={() => switchMode(isSignup ? "signin" : "signup")}
            className="font-semibold text-cyan-300 hover:text-cyan-200"
          >
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}