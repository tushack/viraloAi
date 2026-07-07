import React, { useState } from "react";
import {
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    Link2,
    Loader2,
    ShieldCheck,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getPasswordPolicyError } from "../../lib/passwordPolicy";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

function getSecurityErrorMessage(error) {
    const code = String(error?.code || "");

    const messages = {
        "auth/credential-already-in-use":
            "This login method is already connected to another account.",
        "auth/email-already-in-use":
            "This email is already being used by another account.",
        "auth/provider-already-linked":
            "This login method is already connected.",
        "auth/popup-closed-by-user": "Google connection was cancelled.",
        "auth/popup-blocked":
            "Google popup was blocked. Allow popups and try again.",
        "auth/requires-recent-login":
            "For security, please sign out and sign in again before making this change.",
    };

    return messages[code] || error?.message || "Could not update account security.";
}

export default function AccountSecurityCard() {
    const {
        user,
        hasPasswordProvider,
        hasGoogleProvider,
        addPasswordToCurrentAccount,
        connectGoogleToCurrentAccount,
    } = useAuth();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [busyAction, setBusyAction] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    if (!user) return null;

    const handleCreatePassword = async (event) => {
        event.preventDefault();

        const passwordError = getPasswordPolicyError(password);

        if (passwordError) {
            setError(passwordError);
            return;
        }

        if (password !== confirmPassword) {
            setError("Password and confirm password do not match.");
            return;
        }

        try {
            setBusyAction("password");
            setError("");
            setMessage("");

            await addPasswordToCurrentAccount({ password });

            setPassword("");
            setConfirmPassword("");
            setMessage(
                "Password login is enabled. You can now sign in using Google or email and password."
            );
        } catch (requestError) {
            setError(getSecurityErrorMessage(requestError));
        } finally {
            setBusyAction("");
        }
    };

    const handleConnectGoogle = async () => {
        try {
            setBusyAction("google");
            setError("");
            setMessage("");

            await connectGoogleToCurrentAccount();

            setMessage(
                "Google sign-in is connected. You can now use Google or email and password."
            );
        } catch (requestError) {
            setError(getSecurityErrorMessage(requestError));
        } finally {
            setBusyAction("");
        }
    };

    return (
        <Card className="border-violet-400/20 bg-violet-400/[0.04] transition hover:bg-violet-400/[0.06]">
            <CardContent className="p-5">
                <div className="flex flex-col gap-5">
                    <div className="flex min-w-0 gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10">
                            <ShieldCheck className="h-5 w-5 text-violet-300" />
                        </div>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-semibold text-white sm:text-base">
                                    Account Security
                                </h3>

                                <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-200">
                                    Login methods
                                </span>
                            </div>

                            <p className="mt-1 text-sm leading-6 text-zinc-500">
                                Manage the ways you can access your Viralo AI account.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <KeyRound className="h-4 w-4 text-cyan-300" />
                                    <span className="text-sm font-medium text-white">
                                        Email & password
                                    </span>
                                </div>

                                {hasPasswordProvider ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                                ) : null}
                            </div>

                            <p className="mt-2 text-xs leading-5 text-zinc-500">
                                {hasPasswordProvider
                                    ? "Enabled"
                                    : "Not enabled yet"}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Link2 className="h-4 w-4 text-cyan-300" />
                                    <span className="text-sm font-medium text-white">
                                        Google
                                    </span>
                                </div>

                                {hasGoogleProvider ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                                ) : null}
                            </div>

                            <p className="mt-2 text-xs leading-5 text-zinc-500">
                                {hasGoogleProvider
                                    ? "Connected"
                                    : "Not connected yet"}
                            </p>
                        </div>
                    </div>

                    {!hasPasswordProvider && (
                        <form
                            onSubmit={handleCreatePassword}
                            className="rounded-2xl border border-white/10 bg-black/20 p-4"
                        >
                            <h4 className="text-sm font-semibold text-white">
                                Create password login
                            </h4>

                            <p className="mt-1 text-xs leading-5 text-zinc-500">
                                Your Google account will remain connected. This adds email and
                                password login to the same account.
                            </p>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder="New password"
                                        autoComplete="new-password"
                                        minLength={12}
                                        maxLength={24}
                                        className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 pr-11 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword((current) => !current)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-cyan-300"
                                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                                        title={showNewPassword ? "Hide password" : "Show password"}
                                    >
                                        {showNewPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>

                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        placeholder="Confirm password"
                                        autoComplete="new-password"
                                        minLength={12}
                                        maxLength={24}
                                        className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 pr-11 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((current) => !current)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-cyan-300"
                                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                        title={showConfirmPassword ? "Hide password" : "Show password"}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <p className="mt-3 text-xs leading-5 text-zinc-500">
                                12–24 characters, only letters and numbers, with at least one
                                letter and one number.
                            </p>

                            <Button
                                type="submit"
                                disabled={busyAction === "password"}
                                className="mt-4 h-10 rounded-full bg-cyan-300 px-4 text-xs font-semibold text-black hover:bg-cyan-200"
                            >
                                {busyAction === "password" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <KeyRound className="h-4 w-4" />
                                )}
                                Create password login
                            </Button>
                        </form>
                    )}

                    {!hasGoogleProvider && (
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <h4 className="text-sm font-semibold text-white">
                                Connect Google sign-in
                            </h4>

                            <p className="mt-1 text-xs leading-5 text-zinc-500">
                                Connect Google to this same account, then sign in using either
                                Google or your email and password.
                            </p>

                            <Button
                                type="button"
                                onClick={handleConnectGoogle}
                                disabled={busyAction === "google"}
                                className="mt-4 h-10 rounded-full border border-white/10 bg-white/[0.06] px-4 text-xs font-semibold text-zinc-100 hover:bg-white/[0.1]"
                            >
                                {busyAction === "google" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Link2 className="h-4 w-4" />
                                )}
                                Connect Google
                            </Button>
                        </div>
                    )}

                    {message && (
                        <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-200">
                            {message}
                        </p>
                    )}

                    {error && (
                        <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
                            {error}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}