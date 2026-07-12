import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Database,
  History,
  Image,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { auth } from "../lib/firebase";
import {
  confirmDeleteAccount,
  deleteSelectedRecords,
  requestDeleteAccountOtp,
} from "../lib/api";

const recordOptions = [
  {
    key: "savedIdeas",
    title: "Saved Ideas",
    description: "Delete your saved topics, hooks, titles, and saved content ideas.",
    icon: Database,
  },
  {
    key: "researchHistory",
    title: "Research History",
    description: "Delete your previous research scans and history records.",
    icon: History,
  },
  {
    key: "savedThumbnails",
    title: "Saved Thumbnails",
    description: "Delete saved thumbnail records from your active workspace.",
    icon: Image,
  },
];

export default function DataPrivacy() {
  const navigate = useNavigate();

  const [selectedRecords, setSelectedRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);

  const closeConfirmDialog = () => {
    if (recordsLoading || deletingAccount) return;
    setConfirmDialog(null);
  };

  const runConfirmDialogAction = async () => {
    const action = confirmDialog?.onConfirm;
    setConfirmDialog(null);

    if (typeof action === "function") {
      await action();
    }
  };

  const toggleRecord = (key) => {
    setSelectedRecords((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  };

  const handleDeleteOneRecord = async (key) => {
    const selectedOption = recordOptions.find((item) => item.key === key);

    setConfirmDialog({
      title: `Delete ${selectedOption?.title || "this record"}?`,
      description:
        "This selected record type will be removed from your active workspace now. Permanent deletion will be processed after 30 days.",
      confirmText: "Delete This Record",
      tone: "danger",
      onConfirm: () => handleDeleteRecords([key], true),
    });
  };

  const handleDeleteRecords = async (
    targets = selectedRecords,
    skipConfirm = false
  ) => {
    if (!targets.length) {
      setError("Please select at least one record type.");
      return;
    }

    if (!skipConfirm) {
      const selectedLabels = targets
        .map((target) => recordOptions.find((item) => item.key === target)?.title)
        .filter(Boolean)
        .join(", ");

      setConfirmDialog({
        title: "Delete selected records?",
        description: `${selectedLabels || "Selected records"
          } will be removed from your active workspace now. Permanent deletion will be processed after 30 days.`,
        confirmText: "Delete Selected Records",
        tone: "danger",
        onConfirm: () => handleDeleteRecords([...targets], true),
      });

      return;
    }
    try {
      setRecordsLoading(true);
      setMessage("");
      setError("");

      const result = await deleteSelectedRecords(targets);

      setSelectedRecords([]);
      setMessage(
        result.message ||
        "Selected records removed from active workspace. Permanent deletion is scheduled after 30 days."
      );
    } catch (err) {
      setError(err.message || "Failed to delete selected records.");
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    try {
      setSendingOtp(true);
      setMessage("");
      setError("");

      const result = await requestDeleteAccountOtp();

      setOtp("");
      setOtpSent(true);
      setMessage(result.message || "6-digit verification code sent to your email.");
    } catch (err) {
      setError(err.message || "Failed to send verification code.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit verification code.");
      return;
    }

    setConfirmDialog({
      title: "Delete your account?",
      description:
        "This will remove your login access and delete saved ideas, research history, thumbnails, and profile from your active workspace. Permanent deletion will be processed after 30 days.",
      confirmText: "Delete My Account",
      tone: "danger",
      onConfirm: async () => {
        try {
          setDeletingAccount(true);
          setMessage("");
          setError("");

          await confirmDeleteAccount(otp);

          await signOut(auth);

          navigate("/dashboard", { replace: true });
        } catch (err) {
          setError(err.message || "Failed to delete account.");
        } finally {
          setDeletingAccount(false);
        }
      },
    });

    if (!confirmDelete) return;

    try {
      setDeletingAccount(true);
      setMessage("");
      setError("");
      await confirmDeleteAccount(otp);

      await signOut(auth);

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to delete account.");
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <DashboardLayout eyebrow="Data & Privacy" title="Manage your data">
      <div className="mb-6">
        <Button
          type="button"
          onClick={() => navigate("/settings")}
          className="h-10 rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm text-zinc-200 hover:bg-white/[0.1]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Button>
      </div>

      <section className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
          Data & Privacy
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-500">
          Manage your saved records or delete your account. Deleted items are
          removed from your active workspace now and scheduled for permanent
          deletion after 30 days.
        </p>
      </section>

      {message && (
        <p className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </p>
      )}

      {error && (
        <p className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="grid gap-6">
        <Card className="border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Delete Records
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
                  Select what you want to remove from your active workspace.
                  Only selected records will be removed. Other data will stay as
                  it is.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-200">
                <Clock className="h-4 w-4" />
                30-day purge process
              </div>
            </div>

            <div className="grid gap-3">
              {recordOptions.map((item) => {
                const Icon = item.icon;
                const checked = selectedRecords.includes(item.key);

                return (
                  <div
                    key={item.key}
                    className={`rounded-3xl border p-4 transition ${checked
                      ? "border-cyan-300/30 bg-cyan-300/[0.08]"
                      : "border-white/10 bg-black/20"
                      }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex min-w-0 cursor-pointer items-start gap-4">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRecord(item.key)}
                          className="mt-1 h-5 w-5 accent-cyan-300"
                        />

                        <div className="flex min-w-0 gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/10">
                            <Icon className="h-5 w-5 text-cyan-300" />
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-white sm:text-base">
                              {item.title}
                            </h3>

                            <p className="mt-1 text-sm leading-6 text-zinc-500">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </label>

                      <Button
                        type="button"
                        onClick={() => handleDeleteOneRecord(item.key)}
                        disabled={recordsLoading}
                        className="h-10 w-full shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-4 text-xs font-semibold text-zinc-200 hover:bg-white/[0.1] sm:w-auto"
                      >
                        Delete Only This
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-zinc-500">
                Selected: {selectedRecords.length} record type
                {selectedRecords.length === 1 ? "" : "s"}
              </p>

              <Button
                type="button"
                onClick={() => handleDeleteRecords()}
                disabled={recordsLoading || selectedRecords.length === 0}
                className="h-11 w-full rounded-full bg-cyan-300 px-5 text-sm font-semibold text-black hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {recordsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {recordsLoading ? "Processing..." : "Delete Selected Records"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-400/20 bg-red-500/[0.06] shadow-2xl shadow-black/20">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/15">
                <AlertTriangle className="h-6 w-6 text-red-300" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white">
                  Delete Account
                </h2>

                <p className="mt-1 max-w-3xl text-sm leading-7 text-red-100/75">
                  This will remove your login access and delete your saved
                  ideas, research history, saved thumbnails, and profile from
                  your active workspace. Permanent deletion will be processed
                  after 30 days.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-red-400/20 bg-black/20 p-4">
              <h3 className="text-sm font-semibold text-red-100">
                Account deletion includes:
              </h3>

              <ul className="mt-3 grid gap-2 text-sm text-red-100/75 sm:grid-cols-2">
                <li>• Saved ideas</li>
                <li>• Research history</li>
                <li>• Saved thumbnails</li>
                <li>• Profile data</li>
                <li>• Login access</li>
                <li>• Active workspace access</li>
              </ul>
            </div>

            <div className="mt-5 grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Email verification required
                </h3>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  We will send a 6-digit code to your registered email before
                  account deletion.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || deletingAccount}
                className="h-11 w-full rounded-full border border-cyan-300/20 bg-cyan-300/10 px-5 text-sm font-semibold text-cyan-200 hover:bg-cyan-300/20 sm:w-fit"
              >
                {sendingOtp ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {sendingOtp
                  ? "Sending Code..."
                  : otpSent
                    ? "Resend 6-Digit Code"
                    : "Send 6-Digit Code"}
              </Button>

              {otpSent && (
                <div className="grid gap-4">
                  <label className="block">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Enter verification code
                    </p>

                    <input
                      value={otp}
                      onChange={(event) =>
                        setOtp(
                          event.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="000000"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-center text-2xl font-semibold tracking-[0.5em] text-white outline-none placeholder:text-zinc-700 focus:border-red-300/40"
                    />
                  </label>

                  <Button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount || otp.length !== 6}
                    className="h-11 w-full rounded-full border border-red-400/30 bg-red-500/20 px-5 text-sm font-semibold text-red-100 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
                  >
                    {deletingAccount ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {deletingAccount
                      ? "Deleting Account..."
                      : "Delete My Account"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {confirmDialog && (
        <ConfirmActionModal
          dialog={confirmDialog}
          busy={recordsLoading || deletingAccount}
          onCancel={closeConfirmDialog}
          onConfirm={runConfirmDialogAction}
        />
      )}
      {deletingAccount && <DeletingAccountOverlay />}

    </DashboardLayout>
  );
}

function ConfirmActionModal({ dialog, busy, onCancel, onConfirm }) {
  const isDanger = dialog?.tone === "danger";

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-red-400/20 bg-[#0b0c11] p-6 shadow-2xl shadow-black/60">
        <div className="flex gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isDanger ? "bg-red-500/15" : "bg-cyan-300/10"
              }`}
          >
            {isDanger ? (
              <AlertTriangle className="h-6 w-6 text-red-300" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-cyan-300" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white">
              {dialog?.title || "Are you sure?"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {dialog?.description}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs leading-5 text-red-100/80">
          This action removes data from your active workspace immediately.
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-11 rounded-full border border-white/10 bg-white/[0.05] px-5 text-sm font-medium text-zinc-200 hover:bg-white/[0.1]"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="h-11 rounded-full border border-red-400/30 bg-red-500 px-5 text-sm font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {busy ? "Processing..." : dialog?.confirmText || "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeletingAccountOverlay() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 px-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl border border-red-400/20 bg-[#0b0c11] p-6 text-center shadow-2xl shadow-black/70">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15">
          <Loader2 className="h-7 w-7 animate-spin text-red-300" />
        </div>

        <h2 className="mt-5 text-lg font-semibold text-white">
          Deleting your account...
        </h2>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Please wait. We are removing your active workspace data and signing you
          out securely.
        </p>

        <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs leading-5 text-red-100/80">
          Do not close or refresh this page.
        </p>
      </div>
    </div>
  );
}