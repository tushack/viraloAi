import React, { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, X } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getPasswordPolicyError } from "../../lib/passwordPolicy";
import { Button } from "../ui/button";

function getPasswordErrorMessage(error) {
  const code = String(error?.code || "");

  const messages = {
    "auth/wrong-password": "Current password is incorrect.",
    "auth/invalid-credential": "Current password is incorrect.",
    "auth/requires-recent-login":
      "For security, please sign out and sign in again before changing your password.",
    "auth/credential-already-in-use":
      "This email already has password login enabled on another account.",
    "auth/email-already-in-use":
      "This email is already being used by another account.",
  };

  return messages[code] || error?.message || "Could not update password.";
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggleVisibility,
  placeholder,
  autoComplete,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </span>

      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={12}
          maxLength={24}
          required
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 pr-12 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
        />

        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-cyan-300"
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </label>
  );
}

export default function PasswordSettingsModal({ open, onOpenChange }) {
  const {
    hasPasswordProvider,
    addPasswordToCurrentAccount,
    changePasswordForCurrentAccount,
  } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setMessage("");
    setError("");
  }, [open, hasPasswordProvider]);

  if (!open) return null;

  const isUpdateMode = hasPasswordProvider;

  const closeModal = () => {
    if (saving) return;
    onOpenChange(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const passwordError = getPasswordPolicyError(newPassword);

    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (isUpdateMode && !currentPassword) {
      setError("Current password is required.");
      return;
    }

    if (isUpdateMode && currentPassword === newPassword) {
      setError("New password must be different from current password.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (isUpdateMode) {
        await changePasswordForCurrentAccount({
          currentPassword,
          newPassword,
        });

        setMessage("Password updated successfully.");
      } else {
        await addPasswordToCurrentAccount({
          password: newPassword,
        });

        setMessage("Password set successfully.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(getPasswordErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0b0c11] p-6 shadow-2xl shadow-black/60">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/10">
              <KeyRound className="h-5 w-5 text-cyan-300" />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white">
                {isUpdateMode ? "Update Password" : "Set Password"}
              </h2>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                {isUpdateMode
                  ? "Update your email sign-in password securely."
                  : "Set a password to use email and password sign-in."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Close password settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isUpdateMode && (
            <PasswordField
              label="Current Password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              visible={showCurrentPassword}
              onToggleVisibility={() =>
                setShowCurrentPassword((current) => !current)
              }
              placeholder="Enter current password"
              autoComplete="current-password"
            />
          )}

          <PasswordField
            label={isUpdateMode ? "New Password" : "Password"}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            visible={showNewPassword}
            onToggleVisibility={() =>
              setShowNewPassword((current) => !current)
            }
            placeholder="Enter password"
            autoComplete="new-password"
          />

          <PasswordField
            label="Confirm Password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            visible={showConfirmPassword}
            onToggleVisibility={() =>
              setShowConfirmPassword((current) => !current)
            }
            placeholder="Confirm password"
            autoComplete="new-password"
          />

          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-5 text-zinc-500">
            Password must be 12–24 characters and contain uppercase,
            lowercase, number and special character. Spaces are not allowed.
          </p>

          {message && (
            <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
              {message}
            </p>
          )}

          {error && (
            <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="h-11 rounded-full border border-white/10 bg-white/[0.05] px-5 text-sm font-medium text-zinc-200 hover:bg-white/[0.1]"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={saving}
              className="h-11 rounded-full bg-cyan-300 px-5 text-sm font-semibold text-black hover:bg-cyan-200"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  {isUpdateMode ? "Update Password" : "Set Password"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}