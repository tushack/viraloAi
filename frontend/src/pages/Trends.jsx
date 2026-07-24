import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark,
  CalendarDays,
  ChevronDown,
  Clock3,
  Copy,
  ExternalLink,
  Flame,
  Globe2,
  Layers3,
  Loader2,
  RefreshCw,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Target,
  Video,
  X,
} from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  createContentPack,
  getTrendFeed,
  saveIdea,
  searchTrendTopics,
} from "../lib/api";
import {
  isBackgroundTaskRouteActive,
  markBackgroundTaskViewed,
  runBackgroundTask,
  useBackgroundTaskByKind,
} from "../lib/backgroundTasks";

const PLATFORM_OPTIONS = ["YouTube", "YouTube Shorts"];

const REGION_OPTIONS = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Global",
];

const TIME_RANGE_OPTIONS = [
  { value: "all", label: "Any time" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

const CONTENT_TYPE_OPTIONS = [
  "All",
  "Short-form",
  "Long-form",
  "Tutorial",
  "Review",
  "Explainer",
  "Story",
];

const MOMENTUM_OPTIONS = [
  "All",
  "Trending now",
  "Rising fast",
  "Fresh this week",
  "Low competition",
];

const INITIAL_FILTERS = {
  platform: "YouTube",
  region: "India",
  timeRange: "7d",
  contentType: "All",
  momentum: "All",
};

const CONTENT_PACK_TASK_KEY = "content-pack-generate";

function getText(value, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function copyToClipboard(value) {
  return navigator.clipboard.writeText(value);
}

function FilterSelect({
  label,
  icon: Icon,
  value,
  options,
  onChange,
  className = "",
}) {
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );

  return (
    <label
      className={`relative flex h-11 min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-zinc-300 transition hover:border-cyan-300/25 hover:bg-white/[0.06] ${className}`}
    >
      <Icon className="h-4 w-4 shrink-0 text-cyan-200" />

      <span className="sr-only">{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 appearance-none bg-transparent pr-6 text-sm font-medium text-zinc-200 outline-none"
      >
        {normalizedOptions.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-[#0b0e16] text-white"
          >
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-zinc-500" />
    </label>
  );
}

function TrendCard({
  item,
  onSave,
  onShare,
  onCreatePack,
  saving,
  creatingPack,
}) {
  const title = getText(item?.topic, "Untitled topic");
  const channel = getText(item?.channel, "Unknown creator");
  const sourceUrl = getText(item?.url, "");

  return (
    <Card className="group h-full overflow-hidden border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-cyan-950/30">
      <CardContent className="flex h-full flex-col p-0">
        <div className="relative h-36 overflow-hidden border-b border-white/10 bg-gradient-to-br from-cyan-300/[0.14] via-white/[0.04] to-violet-500/[0.12]">
          {item?.thumbnail ? (
            <img
              src={item.thumbnail}
              alt=""
              className="h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
              loading="lazy"
            />
          ) : (
            <>
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-300/20 blur-2xl" />
              <div className="absolute -bottom-10 left-1/3 h-28 w-28 rounded-full bg-violet-500/20 blur-2xl" />
              <Flame className="absolute bottom-4 left-4 h-7 w-7 text-cyan-100/80" />
            </>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#090b13]/80 via-transparent to-transparent" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-200/20 bg-[#071019]/75 px-2.5 py-1 text-[10px] font-semibold text-cyan-100 backdrop-blur-xl">
              {item?.momentum || "Live signal"}
            </span>

            <span className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-zinc-200 backdrop-blur-xl">
              Score {item?.trendScore || "—"}
            </span>
          </div>

          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-3 text-xs text-zinc-200">
            <span className="truncate">{channel}</span>
            <span className="shrink-0">{item?.displayViews || "—"} views</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-medium text-zinc-400">
              {item?.contentType || "Video"}
            </span>

            <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-[10px] font-medium text-violet-200">
              {item?.competition || "—"} competition
            </span>
          </div>

          <h3 className="line-clamp-3 text-base font-semibold leading-7 text-white">
            {title}
          </h3>

          <p className="mt-3 flex-1 text-sm leading-6 text-zinc-500">
            {item?.insight || "Live video signal from the selected source."}
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
            <Clock3 className="h-3.5 w-3.5 shrink-0 text-cyan-300/70" />
            {item?.publishedLabel || "Recent"}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={() => onCreatePack(item)}
              disabled={creatingPack}
              className="h-10 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/20"
            >
              {creatingPack ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Create Pack
            </Button>

            <Button
              type="button"
              onClick={() => onSave(item)}
              disabled={saving}
              className="h-10 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-zinc-200 hover:bg-white/[0.08]"
            >
              <Bookmark className="h-4 w-4" />
              {saving ? "Saving" : "Save"}
            </Button>

            <Button
              type="button"
              onClick={() => onShare(item)}
              className="h-10 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-zinc-200 hover:bg-white/[0.08]"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>

            {sourceUrl ? (
              <Button
                type="button"
                onClick={() =>
                  window.open(sourceUrl, "_blank", "noopener,noreferrer")
                }
                className="h-10 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-zinc-200 hover:bg-white/[0.08]"
              >
                <ExternalLink className="h-4 w-4" />
                Source
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() =>
                  copyToClipboard(title).then(() => {
                    window.alert("Topic copied");
                  })
                }
                className="h-10 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-zinc-200 hover:bg-white/[0.08]"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrendSection({
  section,
  onSave,
  onShare,
  onCreatePack,
  savingText,
  contentPackLoading,
}) {
  const items = Array.isArray(section?.items) ? section.items : [];

  if (!items.length) return null;

  return (
    <section className="mt-9 first:mt-0">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            {section.key === "for_you" ? (
              <Target className="h-5 w-5 text-violet-200" />
            ) : section.key === "search_results" ? (
              <Search className="h-5 w-5 text-cyan-200" />
            ) : (
              <Flame className="h-5 w-5 text-orange-300" />
            )}

            <h2 className="text-xl font-semibold tracking-tight text-white">
              {section.title}
            </h2>
          </div>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
            {section.subtitle}
          </p>
        </div>

        <p className="text-sm text-zinc-500">
          {items.length} topic{items.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => {
          const title = getText(item?.topic, `trend-${index}`);

          return (
            <TrendCard
              key={item?.id || `${title}-${index}`}
              item={item}
              onSave={onSave}
              onShare={onShare}
              onCreatePack={onCreatePack}
              saving={savingText === title}
              creatingPack={contentPackLoading === title}
            />
          );
        })}
      </div>
    </section>
  );
}

export default function Trends() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [feed, setFeed] = useState({ sections: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingText, setSavingText] = useState("");
  const [contentPackLoading, setContentPackLoading] = useState("");
  const [error, setError] = useState("");
  const contentPackTask = useBackgroundTaskByKind("content-pack-generate");

  useEffect(() => {
    if (contentPackTask?.status === "running") {
      setContentPackLoading(contentPackTask?.input?.topic || "");
      return;
    }

    if (contentPackTask) {
      setContentPackLoading("");
    }
  }, [
    contentPackTask?.id,
    contentPackTask?.input?.topic,
    contentPackTask?.status,
  ]);


  const visibleSections = useMemo(() => {
    const sections = (
      Array.isArray(feed?.sections)
        ? feed.sections
        : []
    ).filter(
      (section) =>
        Array.isArray(section?.items) &&
        section.items.length
    );

    /*
     * A manual search should show only its direct results.
     * Global and personalized sections remain hidden during search
     * to avoid showing three separate repeated sections.
     */
    const searchSection = sections.find(
      (section) =>
        section?.key === "search_results"
    );

    if (searchSection) {
      return [searchSection];
    }

    const personalizedSection =
      sections.find(
        (section) =>
          section?.key === "for_you"
      );

    const globalSection =
      sections.find(
        (section) =>
          section?.key === "trending_now"
      );

    /*
     * Combine personalized and global items into one feed.
     * Personalized items stay first.
     */
    if (personalizedSection) {
      const combinedItems = [
        ...(personalizedSection.items || []),
        ...(globalSection?.items || []),
      ];

      const seen = new Set();

      const uniqueItems = combinedItems.filter(
        (item) => {
          const key =
            item?.id ||
            item?.url ||
            `${String(
              item?.topic || ""
            ).toLowerCase()}-${String(
              item?.channel || ""
            ).toLowerCase()}`;

          if (
            !key ||
            seen.has(key)
          ) {
            return false;
          }

          seen.add(key);
          return true;
        }
      );

      return [
        {
          ...personalizedSection,

          key:
            "personalized_trending_now",

          title:
            "Trending Now For You",

          subtitle:
            feed?.meta
              ?.youtubePersonalizationConnected
              ? "Personalized using your niche, searches, saved ideas, activity and connected YouTube interests."
              : "Personalized using your niche, searches, saved ideas and recent activity.",

          items:
            uniqueItems,
        },
      ];
    }

    /*
     * New users without personalization get the normal global feed.
     */
    if (globalSection) {
      return [globalSection];
    }

    /*
     * Safe fallback for any future section type.
     */
    return sections.slice(0, 1);
  }, [feed]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const loadFeed = useCallback(
    async ({ showRefresh = false } = {}) => {
      try {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        setError("");

        const data = await getTrendFeed({
          ...filters,
          ...(showRefresh ? { refresh: "true" } : {}),
        });
        setFeed(data);
      } catch (err) {
        setError(err.message || "Failed to load live trends.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleSearch = async () => {
    const query = searchQuery.trim();

    if (!query) {
      setError("Enter a niche, topic, or keyword to search.");
      return;
    }

    try {
      setSearching(true);
      setError("");

      const data = await searchTrendTopics({
        query,
        ...filters,
      });

      setFeed(data);
    } catch (err) {
      setError(err.message || "Failed to search live trends.");
    } finally {
      setSearching(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilters(INITIAL_FILTERS);
  };

  const handleSaveTrend = async (item) => {
    const title = getText(item?.topic);

    if (!title) return;

    try {
      setSavingText(title);

      await saveIdea({
        type: "Trend",
        content: title,
        platform: item?.platform || filters.platform,
        niche: item?.sourceQuery || "Live trend",
      });

      window.alert("Trend saved successfully");
    } catch (err) {
      window.alert(err.message || "Failed to save trend");
    } finally {
      setSavingText("");
    }
  };

  const handleShareTrend = async (item) => {
    const title = getText(item?.topic, "Untitled trend");

    const text = [
      `Video idea: ${title}`,
      `Platform: ${item?.platform || filters.platform}`,
      `Trend score: ${item?.trendScore || "—"}`,
      item?.sourceQuery ? `Related search: ${item.sourceQuery}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        return;
      }

      await copyToClipboard(text);
      window.alert("Trend copied for sharing");
    } catch {
      // Native share was cancelled.
    }
  };

  const handleCreatePack = async (item) => {
    const title = getText(item?.topic, "Untitled trend");

    try {
      setContentPackLoading(title);

      const { id, promise } = runBackgroundTask({
        key: `${CONTENT_PACK_TASK_KEY}:${title.toLowerCase().trim()}`,
        kind: "content-pack-generate",
        title: `Content pack: ${title}`,
        route: "/content-pack",
        input: {
          topic: title,
          sourceRoute: "/trends",
        },
        successMessage: `Your content pack for "${title}" is ready.`,
        errorMessage: "The content pack could not be generated.",
        run: () =>
          createContentPack({
            topic: title,
            growth: item?.momentum || "Live signal",
            competition: item?.competition || "Medium",
            insight: item?.insight || "Live trend opportunity.",
            niche: item?.sourceQuery || "Live trend",
            platform: item?.platform || filters.platform,
            audience: "Creators researching current topics",
          }),
      });

      const pack = await promise;

      if (isBackgroundTaskRouteActive("/trends")) {
        markBackgroundTaskViewed(id);
        navigate("/content-pack", {
          state: {
            contentPack: pack,
          },
        });
      }
    } catch (err) {
      setError(err.message || "Failed to create content pack.");
    } finally {
      setContentPackLoading("");
    }
  };

  return (
    <DashboardLayout
      eyebrow="Live topic intelligence"
      title="Trends"
    >
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.12] via-white/[0.04] to-violet-500/[0.10] p-5 shadow-2xl shadow-cyan-950/20 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
            <Flame className="h-4 w-4" />
            Dynamic topic signals
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Discover what is gaining attention.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
            Trends appear immediately from the selected live source. Search any
            niche whenever you need, and future feeds start prioritizing topics
            related to your recent searches.
          </p>
        </div>
      </section>

      <Card className="mt-6 border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 transition focus-within:border-cyan-300/40">
              <Search className="h-4 w-4 shrink-0 text-cyan-200" />

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Search any niche, topic or keyword..."
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-zinc-500 transition hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>

            <Button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="h-12 rounded-2xl bg-cyan-300 px-5 text-sm font-semibold text-black shadow-[0_12px_28px_rgba(6,182,212,0.22)] hover:bg-cyan-200"
            >
              {searching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Search topics
                </>
              )}
            </Button>
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              <SlidersHorizontal className="h-4 w-4 text-cyan-200" />
              Filters
            </div>

            <div className="flex flex-wrap gap-3">
              <FilterSelect
                label="Platform"
                icon={Video}
                value={filters.platform}
                options={PLATFORM_OPTIONS}
                onChange={(value) => updateFilter("platform", value)}
                className="min-w-[185px]"
              />

              <FilterSelect
                label="Region"
                icon={Globe2}
                value={filters.region}
                options={REGION_OPTIONS}
                onChange={(value) => updateFilter("region", value)}
                className="min-w-[172px]"
              />

              <FilterSelect
                label="Time range"
                icon={CalendarDays}
                value={filters.timeRange}
                options={TIME_RANGE_OPTIONS}
                onChange={(value) => updateFilter("timeRange", value)}
                className="min-w-[178px]"
              />

              <FilterSelect
                label="Content type"
                icon={Layers3}
                value={filters.contentType}
                options={CONTENT_TYPE_OPTIONS}
                onChange={(value) => updateFilter("contentType", value)}
                className="min-w-[178px]"
              />

              <FilterSelect
                label="Momentum"
                icon={Target}
                value={filters.momentum}
                options={MOMENTUM_OPTIONS}
                onChange={(value) => updateFilter("momentum", value)}
                className="min-w-[178px]"
              />

              <button
                type="button"
                onClick={handleResetFilters}
                className="flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-medium text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
              >
                <X className="h-4 w-4" />
                Clear filters
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
            {feed?.mode === "personalized" ? "Personalized feed" : "Live global feed"}
          </span>

          {feed?.meta?.globalSourceStatus === "stale" && (
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
              Showing last available live data
            </span>
          )}
        </div>

        <Button
          type="button"
          onClick={() => loadFeed({ showRefresh: true })}
          disabled={refreshing || loading}
          className="h-10 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold text-zinc-200 hover:bg-white/[0.08]"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh feed
        </Button>
      </div>

      {error && (
        <Card className="mt-5 border-red-300/20 bg-red-500/10">
          <CardContent className="p-4 text-sm leading-6 text-red-100">
            {error}
          </CardContent>
        </Card>
      )}

      {loading && !visibleSections.length ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-[355px] animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
            />
          ))}
        </div>
      ) : visibleSections.length ? (
        <div className="mt-8">
          {visibleSections.map((section) => (
            <TrendSection
              key={section.key}
              section={section}
              onSave={handleSaveTrend}
              onShare={handleShareTrend}
              onCreatePack={handleCreatePack}
              savingText={savingText}
              contentPackLoading={contentPackLoading}
            />
          ))}
        </div>
      ) : (
        <Card className="mt-8 border-white/10 bg-white/[0.04]">
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Flame className="h-6 w-6 text-orange-300" />
            </div>

            <h2 className="mt-5 text-xl font-semibold text-white">
              No live topics matched these filters
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
              Change a filter, select another region, or refresh the live
              source.
            </p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
