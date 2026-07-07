import React, { useRef, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  BarChart3,
  CalendarDays,
  ExternalLink,
  Heart,
  Loader2,
  Search,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { analyzeCompetitorChannel } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

function isValidYouTubeChannelInput(value) {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) return false;

  if (/^UC[a-zA-Z0-9_-]{20,}$/.test(cleanValue)) {
    return true;
  }

  if (/^@[a-zA-Z0-9._-]{3,}$/.test(cleanValue)) {
    return true;
  }

  try {
    const url = new URL(
      /^https?:\/\//i.test(cleanValue)
        ? cleanValue
        : `https://${cleanValue}`
    );

    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const firstPart = url.pathname.split("/").filter(Boolean)[0] || "";

    if (
      !["youtube.com", "m.youtube.com", "music.youtube.com"].includes(hostname)
    ) {
      return false;
    }

    return Boolean(
      firstPart &&
        !["watch", "shorts", "playlist", "live", "feed", "results"].includes(
          firstPart
        )
    );
  } catch {
    return false;
  }
}

function getScoreNumber(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function Metric({ label, value, hint = "" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-zinc-600">{hint}</p>}
    </div>
  );
}

function VideoCard({ video, onOpen }) {
  return (
    <Card className="overflow-hidden border-white/10 bg-white/[0.04]">
      {video.thumbnail ? (
        <button
          type="button"
          onClick={() => onOpen(video.url)}
          className="group block aspect-video w-full overflow-hidden bg-black/30"
          aria-label={`Open ${video.title} on YouTube`}
        >
          <img
            src={video.thumbnail}
            alt={video.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        </button>
      ) : (
        <div className="flex aspect-video items-center justify-center bg-black/30">
          <Video className="h-7 w-7 text-zinc-600" />
        </div>
      )}

      <CardContent className="p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-6 text-white">
          {video.title}
        </h3>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-cyan-300/10 px-3 py-1 font-semibold text-cyan-200">
            {video.views} views
          </span>

          {video.likesRaw > 0 && (
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-zinc-300">
              {video.likes} likes
            </span>
          )}

          {video.durationLabel && (
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-zinc-400">
              {video.durationLabel}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">{video.publishedLabel}</p>

          <Button
            type="button"
            onClick={() => onOpen(video.url)}
            disabled={!video.url}
            className="h-8 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs text-zinc-200 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Competitors() {
  const [channelUrl, setChannelUrl] = useState("");
  const [competitors, setCompetitors] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const insightsRef = useRef(null);
  const navigate = useNavigate();

  const handleOpenUrl = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleViewInsights = (competitor) => {
    setSelectedAnalysis(competitor);

    window.setTimeout(() => {
      insightsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const handleAnalyzeChannel = async () => {
    const cleanInput = channelUrl.trim();

    if (!cleanInput) {
      setError("Paste a YouTube channel URL, channel ID, or @handle first.");
      return;
    }

    if (!isValidYouTubeChannelInput(cleanInput)) {
      setError(
        "Enter a valid YouTube channel URL, channel ID, or @handle. Video and playlist links are not supported here."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await analyzeCompetitorChannel({
        channelUrl: cleanInput,
      });

      const analyzedCompetitor = {
        ...data,
        niche: "YouTube Channel",
        opportunityScore: data.opportunityScore || "0",
        topVideos: Array.isArray(data.topVideos) ? data.topVideos : [],
        recentVideos: Array.isArray(data.recentVideos) ? data.recentVideos : [],
      };

      setSelectedAnalysis(analyzedCompetitor);

      setCompetitors((current) => [
        analyzedCompetitor,
        ...current.filter(
          (item) =>
            item.channelId !== analyzedCompetitor.channelId &&
            item.channelUrl !== analyzedCompetitor.channelUrl
        ),
      ].slice(0, 6));
    } catch (err) {
      setError(err.message || "Failed to analyze this competitor channel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      eyebrow="Competitors"
      title="Analyze competitor channels"
    >
      <section className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
          Competitor Analysis
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
          Analyze any public YouTube channel with live YouTube Data API stats:
          subscriber visibility, recent upload pace, public views, likes, top
          videos, and a recent performance signal.
        </p>
      </section>

      <Card className="mb-6 border-white/10 bg-white/[0.04]">
        <CardContent className="grid gap-3 p-3 sm:grid-cols-[1fr_auto]">
          <label className="flex h-14 min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4">
            <Search className="h-5 w-5 shrink-0 text-zinc-500" />

            <input
              value={channelUrl}
              onChange={(event) => setChannelUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleAnalyzeChannel();
                }
              }}
              placeholder="Paste @handle or https://youtube.com/@channel"
              className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
            />
          </label>

          <Button
            type="button"
            onClick={handleAnalyzeChannel}
            disabled={loading}
            className="h-14 rounded-2xl bg-white px-5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4" />
                Analyze Channel
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <p className="mb-6 text-xs leading-5 text-zinc-600">
        Public YouTube data only. Hidden subscriber counts and non-public
        analytics cannot be retrieved.
      </p>

      {error && (
        <div className="mb-6 rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-6 flex min-h-[220px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
            Loading public YouTube channel data...
          </div>
        </div>
      )}

      {!loading && !competitors.length && !selectedAnalysis && (
        <div className="mb-6 rounded-3xl border border-dashed border-white/10 bg-white/[0.025] p-8 text-center">
          <Users className="mx-auto h-7 w-7 text-zinc-600" />
          <h2 className="mt-3 text-lg font-semibold text-white">
            Add a competitor channel
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">
            Paste a public YouTube channel link or @handle. No sample or fake
            competitor data is shown here.
          </p>
        </div>
      )}

      {!loading && selectedAnalysis && (
        <section
          ref={insightsRef}
          className="mb-6 scroll-mt-6 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5 sm:p-6"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-4">
              {selectedAnalysis.channelThumbnail ? (
                <img
                  src={selectedAnalysis.channelThumbnail}
                  alt={selectedAnalysis.channel}
                  className="h-14 w-14 shrink-0 rounded-2xl border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10">
                  <Users className="h-6 w-6 text-violet-300" />
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Live YouTube Analysis
                </p>

                <h2 className="mt-2 truncate text-2xl font-semibold text-white">
                  {selectedAnalysis.channel}
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                  {selectedAnalysis.summary}
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => handleOpenUrl(selectedAnalysis.channelUrl)}
              disabled={!selectedAnalysis.channelUrl}
              className="h-10 shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-4 text-xs text-zinc-200 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ExternalLink className="h-4 w-4" />
              Open Channel
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Subscribers"
              value={selectedAnalysis.subscribers || "Not available"}
              hint={
                selectedAnalysis.subscriberCountHidden
                  ? "This creator keeps it hidden"
                  : "Public channel total"
              }
            />
            <Metric
              label="Recent Avg Views"
              value={selectedAnalysis.avgViews || "0"}
              hint={`${selectedAnalysis.totalVideosAnalyzed || 0} uploads analyzed`}
            />
            <Metric
              label="Recent Momentum"
              value={selectedAnalysis.growth || "Not enough data"}
              hint="Daily view velocity comparison"
            />
            <Metric
              label="Upload Rate"
              value={selectedAnalysis.uploadRate || "Not available"}
              hint={`Last upload: ${selectedAnalysis.lastUploadLabel || "—"}`}
            />
            <Metric
              label="Total Channel Views"
              value={selectedAnalysis.totalChannelViews || "0"}
              hint={`${selectedAnalysis.totalChannelVideos || 0} total videos`}
            />
            <Metric
              label="Highest Recent View Count"
              value={selectedAnalysis.highestViews || "0"}
              hint="From analyzed uploads"
            />
            <Metric
              label="Avg Likes"
              value={selectedAnalysis.avgLikes || "0"}
              hint={
                selectedAnalysis.engagementRate !== null &&
                selectedAnalysis.engagementRate !== undefined
                  ? `${selectedAnalysis.engagementRate}% likes-to-views`
                  : "Likes unavailable"
              }
            />
            <Metric
              label="Opportunity Score"
              value={selectedAnalysis.opportunityScore || "0"}
              hint={selectedAnalysis.opportunityLabel || "Public-signal estimate"}
            />
          </div>
        </section>
      )}

      {!loading && competitors.length > 0 && (
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Analyzed Competitors
            </h2>

            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Each card uses live public YouTube API data from the channel you
              analyzed.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {competitors.map((item) => {
              const scoreNumber = getScoreNumber(item.opportunityScore);

              return (
                <Card
                  key={item.channelId || item.channelUrl || item.channel}
                  className="border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-cyan-950/20"
                >
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      {item.channelThumbnail ? (
                        <img
                          src={item.channelThumbnail}
                          alt={item.channel}
                          className="h-11 w-11 shrink-0 rounded-2xl border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10">
                          <Users className="h-5 w-5 text-violet-300" />
                        </div>
                      )}

                      <Button
                        type="button"
                        onClick={() => handleOpenUrl(item.channelUrl)}
                        disabled={!item.channelUrl}
                        className="h-9 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs text-zinc-200 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </Button>
                    </div>

                    <h3 className="truncate text-lg font-semibold text-white">
                      {item.channel}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      {item.niche || "YouTube Channel"}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Metric label="Subscribers" value={item.subscribers || "—"} />
                      <Metric label="Avg Views" value={item.avgViews || "0"} />
                      <Metric label="Momentum" value={item.growth || "—"} />
                      <Metric label="Uploads" value={item.uploadRate || "—"} />
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-zinc-500">Opportunity Score</p>
                        <p className="text-sm font-semibold text-cyan-300">
                          {item.opportunityScore || "0"}
                        </p>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-cyan-300"
                          style={{ width: `${scoreNumber}%` }}
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => handleViewInsights(item)}
                      className="mt-5 h-11 w-full rounded-full bg-gradient-to-r from-cyan-300/15 to-violet-400/15 text-sm font-semibold text-cyan-100 ring-1 ring-white/10 hover:from-cyan-300/25 hover:to-violet-400/25"
                    >
                      <BarChart3 className="h-4 w-4" />
                      View Insights
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {!loading && selectedAnalysis?.topVideos?.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300/10">
              <Zap className="h-5 w-5 text-cyan-200" />
            </div>

            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Top Videos From This Channel
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Highest-viewed videos among the public uploads analyzed.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {selectedAnalysis.topVideos.map((video) => (
              <VideoCard
                key={video.id || video.url || video.title}
                video={video}
                onOpen={handleOpenUrl}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && selectedAnalysis?.recentVideos?.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-400/10">
              <CalendarDays className="h-5 w-5 text-violet-200" />
            </div>

            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Recent Uploads
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Latest public uploads used to calculate upload pace and recent
                momentum.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {selectedAnalysis.recentVideos.map((video) => (
              <VideoCard
                key={video.id || video.url || video.title}
                video={video}
                onOpen={handleOpenUrl}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && selectedAnalysis?.source === "youtube-data-api" && (
        <div className="mt-8 flex items-start gap-3 rounded-3xl border border-white/10 bg-white/[0.025] p-4 text-xs leading-5 text-zinc-500">
          <Heart className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
          <p>
            Opportunity Score is an estimate derived from public views,
            upload consistency, subscriber visibility, and recent
            view-velocity. It is not private YouTube Analytics data.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}