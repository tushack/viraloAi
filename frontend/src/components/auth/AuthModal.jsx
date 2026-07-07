import React, { useState } from "react";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    try {
      setLoading(true);
      setError("");

      await signInWithGoogle();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
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
      setLoading(false);
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
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              !isSignup
                ? "bg-cyan-300 text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              isSignup
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
            disabled={loading}
            className="h-12 w-full rounded-2xl bg-cyan-300 px-5 text-sm font-semibold text-black hover:bg-cyan-200"
          >
            {loading ? (
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
          disabled={loading}
          className="h-12 w-full rounded-2xl bg-white px-5 text-sm font-semibold text-black hover:bg-zinc-200"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Continue with Google"
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