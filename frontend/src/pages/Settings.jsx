import React from "react";
import {
  Bell,
  CheckCircle2,
  CreditCard,
  Database,
  KeyRound,
  Link2,
  Loader2,
  Unlink,
  User,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  disconnectYoutubeConnection,
  getYoutubeAuthUrl,
  getYoutubeConnection,
} from "../lib/api";
import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import PasswordSettingsModal from "../components/settings/PasswordSettingsModal";

function formatConnectedDate(value) {
  if (!value) return "Recently";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPasswordProvider } = useAuth();
  const [passwordModalOpen, setPasswordModalOpen] = React.useState(false);

  const [youtubeLoading, setYoutubeLoading] = React.useState(true);
  const [youtubeBusy, setYoutubeBusy] = React.useState(false);
  const [youtubeConnection, setYoutubeConnection] = React.useState(null);
  const [youtubeMessage, setYoutubeMessage] = React.useState("");
  const [youtubeError, setYoutubeError] = React.useState("");

  const loadYoutubeConnection = React.useCallback(async () => {
    try {
      setYoutubeLoading(true);
      setYoutubeError("");

      const data = await getYoutubeConnection();
      setYoutubeConnection(data?.connected ? data.connection : null);
    } catch (error) {
      setYoutubeConnection(null);
      setYoutubeError(error.message || "Failed to load YouTube connection.");
    } finally {
      setYoutubeLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadYoutubeConnection();
  }, [loadYoutubeConnection]);

  React.useEffect(() => {
    const status = searchParams.get("youtube");
    const message = searchParams.get("youtubeMessage");

    if (!status) return;

    if (status === "connected") {
      setYoutubeMessage("YouTube channel connected successfully.");
      setYoutubeError("");
      loadYoutubeConnection();
    } else if (status === "cancelled") {
      setYoutubeMessage("");
      setYoutubeError(message || "YouTube connection was cancelled.");
    } else if (status === "failed") {
      setYoutubeMessage("");
      setYoutubeError(message || "Could not connect YouTube. Please try again.");
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("youtube");
    nextParams.delete("youtubeMessage");
    setSearchParams(nextParams, { replace: true });
  }, [loadYoutubeConnection, searchParams, setSearchParams]);

  const handleConnectYoutube = async () => {
    try {
      setYoutubeBusy(true);
      setYoutubeError("");
      setYoutubeMessage("");

      const data = await getYoutubeAuthUrl();

      if (!data?.url) {
        throw new Error("Could not create the YouTube authorization link.");
      }

      window.location.assign(data.url);
    } catch (error) {
      setYoutubeError(error.message || "Failed to start YouTube connection.");
      setYoutubeBusy(false);
    }
  };

  const handleDisconnectYoutube = async () => {
    const channelTitle = youtubeConnection?.channelTitle || "this YouTube channel";
    const confirmed = window.confirm(
      `Disconnect ${channelTitle}? Generated content will not be deleted.`
    );

    if (!confirmed) return;

    try {
      setYoutubeBusy(true);
      setYoutubeError("");
      setYoutubeMessage("");

      await disconnectYoutubeConnection();

      setYoutubeConnection(null);
      setYoutubeMessage("YouTube channel disconnected successfully.");
    } catch (error) {
      setYoutubeError(error.message || "Failed to disconnect YouTube.");
    } finally {
      setYoutubeBusy(false);
    }
  };

  const isConnected = Boolean(youtubeConnection?.channelId);

  return (
    <DashboardLayout eyebrow="Settings" title="Manage your workspace">
      <section className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
          Account Settings
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Manage your profile, research preferences, connected accounts,
          notifications, and subscription settings.
        </p>
      </section>

      <section className="grid gap-4">
        <SettingCard
          icon={User}
          title="Profile"
          description="Update your name, email, profile image, and creator profile details."
          buttonText="Edit Profile"
          onClick={() => navigate("/profile")}
        />

        <SettingCard
          icon={KeyRound}
          title="Set / Update Password"
          description="Set or update your password for email sign-in."
          buttonText={hasPasswordProvider ? "Update Password" : "Set Password"}
          onClick={() => setPasswordModalOpen(true)}
        />

        <Card className="border-cyan-300/15 bg-cyan-300/[0.04] transition hover:bg-cyan-300/[0.06]">
          <CardContent className="p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/10">
                  <Link2 className="h-5 w-5 text-cyan-300" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-white sm:text-base">
                      YouTube Channel
                    </h3>

                    {youtubeLoading ? (
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                        Checking
                      </span>
                    ) : isConnected ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Connected
                      </span>
                    ) : (
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                        Not connected
                      </span>
                    )}
                  </div>

                  {youtubeLoading ? (
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Checking your connected channel...
                    </p>
                  ) : isConnected ? (
                    <div className="mt-3 flex min-w-0 items-center gap-3">
                      {youtubeConnection?.channelThumbnail ? (
                        <img
                          src={youtubeConnection.channelThumbnail}
                          alt={youtubeConnection.channelTitle || "YouTube channel"}
                          className="h-10 w-10 shrink-0 rounded-2xl border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-xs font-semibold text-cyan-200">
                          YT
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {youtubeConnection.channelTitle || "Connected YouTube channel"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Connected {formatConnectedDate(youtubeConnection.updatedAt)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Connect your own YouTube channel to apply generated title,
                      description, tags, and thumbnail to videos you own.
                    </p>
                  )}
                </div>
              </div>

              {isConnected ? (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button
                    type="button"
                    onClick={handleConnectYoutube}
                    disabled={youtubeBusy}
                    className="h-10 w-full rounded-full bg-white px-4 text-xs font-semibold text-black hover:bg-zinc-200 sm:w-auto"
                  >
                    {youtubeBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    Reconnect
                  </Button>

                  <Button
                    type="button"
                    onClick={handleDisconnectYoutube}
                    disabled={youtubeBusy}
                    className="h-10 w-full rounded-full border border-red-400/20 bg-red-500/10 px-4 text-xs font-semibold text-red-200 hover:bg-red-500/20 sm:w-auto"
                  >
                    <Unlink className="h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={handleConnectYoutube}
                  disabled={youtubeLoading || youtubeBusy}
                  className="h-10 w-full rounded-full bg-cyan-300 px-4 text-xs font-semibold text-black hover:bg-cyan-200 sm:w-auto"
                >
                  {youtubeBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  Connect YouTube
                </Button>
              )}
            </div>

            {youtubeMessage && (
              <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                {youtubeMessage}
              </p>
            )}

            {youtubeError && (
              <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
                {youtubeError}
              </p>
            )}
          </CardContent>
        </Card>

        <SettingCard
          icon={CreditCard}
          title="Subscription"
          description="View your current plan, usage limits, billing details, and upgrade options."
          buttonText="View Plan"
          onClick={() => navigate("/payment")}
        />

        <SettingCard
          icon={Database}
          title="Data & Privacy"
          description="Delete selected records or delete your account after email verification. Permanent purge is scheduled after 30 days."
          buttonText="Manage Data"
          onClick={() => navigate("/data-privacy")}
        />
      </section>
      <PasswordSettingsModal
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
      />
    </DashboardLayout>
  );
}

function SettingCard({ icon: Icon, title, description, buttonText, onClick }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] transition hover:bg-white/[0.06]">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/10">
            <Icon className="h-5 w-5 text-cyan-300" />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white sm:text-base">
              {title}
            </h3>

            <p className="mt-1 text-sm leading-6 text-zinc-500">
              {description}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={onClick}
          className="h-10 w-full shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-4 text-xs font-medium text-zinc-200 hover:bg-white/[0.1] sm:w-auto"
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
}
