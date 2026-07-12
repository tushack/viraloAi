import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ContentCalendarWidget from "../components/calendar/ContentCalendarWidget";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { redirectToUpgrade } from "../lib/upgrade";
import {
  BarChart3,
  Check,
  ChevronDown,
  Clipboard,
  Compass,
  Copy,
  FileDown,
  Flame,
  Loader2,
  Search,
  Share2,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  createContentPack,
  getDailyNicheIdeas,
  getResearchHistory,
  getSavedIdeas,
  getTrendFeed,
  saveIdea,
} from "../lib/api";

const CURRENT_RESEARCH_KEY = "viralMindCurrentResearch";
const DASHBOARD_HEADLINE_WORDS = ["Discover something new today"];

function getCurrentResearchKey(userId) {
  return userId ? `${CURRENT_RESEARCH_KEY}:${userId}` : CURRENT_RESEARCH_KEY;
}

function getList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function isGroqDashboardData(value) {
  return Boolean(
    value &&
    (value.source === "groq" || value?.meta?.aiProvider === "groq")
  );
}

function normalizeApiList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.history)) return response.history;
  if (Array.isArray(response?.savedIdeas)) return response.savedIdeas;
  return [];
}

function getHistoryResponse(item) {
  if (!item) return null;

  const value = item.response_json || item.data || item.response || item;

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (value && typeof value === "object") {
    return value;
  }

  return null;
}

function getTextValue(value, fallback = "Unknown") {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => getTextValue(item, ""))
      .filter(Boolean)
      .join(", ");
  }

  if (value && typeof value === "object") {
    return (
      value.name ||
      value.title ||
      value.topic ||
      value.channelName ||
      value.channelTitle ||
      value.author ||
      value.authorName ||
      value.text ||
      fallback
    );
  }

  return fallback;
}

function parseGrowthNumber(value) {
  const text = getTextValue(value, "");
  const match = text.match(/-?\d+(\.\d+)?/);

  if (!match) return null;

  const number = Number(match[0]);

  return Number.isFinite(number) ? number : null;
}

function formatAverageGrowth(topics) {
  const growthNumbers = getList(topics)
    .map((item) => parseGrowthNumber(item?.growth))
    .filter((value) => Number.isFinite(value));

  if (!growthNumbers.length) {
    return "0%";
  }

  const average = Math.round(
    growthNumbers.reduce((sum, value) => sum + value, 0) / growthNumbers.length
  );

  return `${average >= 0 ? "+" : ""}${average}%`;
}

function getDashboardLiveTopics(feed) {
  const sections = Array.isArray(feed?.sections) ? feed.sections : [];

  const trendSection =
    sections.find(
      (section) =>
        section?.key === "trending_now" &&
        Array.isArray(section?.items) &&
        section.items.length
    ) ||
    sections.find(
      (section) =>
        Array.isArray(section?.items) &&
        section.items.length
    );

  return getList(trendSection?.items)
    .slice(0, 4)
    .map((item, index) => ({
      id: item?.id || item?.url || `live-trend-${index}`,
      topic: getTextValue(item?.topic, "Untitled trend"),
      growth: getTextValue(item?.momentum, "Trending now"),
      competition: getTextValue(item?.competition, "Medium"),
      difficulty: getTextValue(item?.contentType, "Video"),
      insight: getTextValue(
        item?.insight,
        "Live YouTube trend signal from the latest feed."
      ),
      niche: getTextValue(item?.sourceQuery, "Live YouTube trends"),
      platform: getTextValue(item?.platform, "YouTube"),
      url: getTextValue(item?.url, ""),
      thumbnail: getTextValue(item?.thumbnail, ""),
      source: "live-trends",
    }));
}

function sameResearchData(first, second) {
  if (!first || !second) return false;

  return (
    JSON.stringify(getList(first.trendingTopics)) ===
    JSON.stringify(getList(second.trendingTopics)) &&
    JSON.stringify(getList(first.viralHooks)) ===
    JSON.stringify(getList(second.viralHooks))
  );
}

function formatDate(dateValue) {
  if (!dateValue) return "Not scanned yet";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not scanned yet";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildDashboardStats({ activeData, history, savedIdeasCount }) {
  const historyData = getList(history).map(getHistoryResponse).filter(Boolean);
  const dataSets = [...historyData];

  if (activeData && !dataSets.some((item) => sameResearchData(item, activeData))) {
    dataSets.unshift(activeData);
  }

  const allTopics = dataSets.flatMap((item) => getList(item.trendingTopics));
  const allHooks = dataSets.flatMap((item) => getList(item.viralHooks));
  const allCompetitors = dataSets.flatMap((item) => getList(item.competitors));

  return {
    scanCount:
      getList(history).length + (activeData && !historyData.length ? 1 : 0),
    topicsCount: allTopics.length || getList(activeData?.trendingTopics).length,
    averageGrowth: formatAverageGrowth(
      allTopics.length ? allTopics : activeData?.trendingTopics
    ),
    hooksCount: allHooks.length || getList(activeData?.viralHooks).length,
    competitorsCount:
      allCompetitors.length || getList(activeData?.competitors).length,
    savedIdeasCount,
  };
}

function buildDashboardCompetitorsFromResearch(activeData, activeNiche) {
  const directCompetitors = getList(activeData?.competitors);

  if (directCompetitors.length > 0) {
    return directCompetitors.slice(0, 4);
  }

  const topics = getList(activeData?.trendingTopics).slice(0, 4);

  return topics.map((item, index) => {
    const topicText = getTextValue(
      item?.topic || item?.title,
      `Competitor signal ${index + 1}`
    );

    return {
      channel:
        getTextValue(item?.sourceChannel || item?.channel, "") ||
        `${activeNiche} Signal ${index + 1}`,
      channelName:
        getTextValue(item?.sourceChannel || item?.channel, "") ||
        `${activeNiche} Signal ${index + 1}`,
      score: getTextValue(
        item?.score || item?.aiFit || item?.opportunityScore,
        `${85 - index * 7}`
      ),
      views: getTextValue(
        item?.actualViews || item?.views || item?.averageViews,
        "Scan based"
      ),
      growth: getTextValue(item?.growth || item?.momentum, "Growing"),
      channelHandle: "Research scan",
      channelUrl: getTextValue(item?.sourceUrl || item?.url, ""),
      sourceUrl: getTextValue(item?.sourceUrl || item?.url, ""),
    };
  });
}

function StatCard({ icon: Icon, label, value, caption }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20 backdrop-blur-xl">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] sm:mb-5">
          <Icon className="h-5 w-5 text-cyan-300" />
        </div>

        <p className="text-xs text-zinc-400 sm:text-sm">{label}</p>

        <h3 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
          {value}
        </h3>

        <p className="mt-2 text-xs leading-5 text-zinc-500">{caption}</p>
      </CardContent>
    </Card>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button
      onClick={handleCopy}
      type="button"
      className="h-8 shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs text-zinc-200 hover:bg-white/[0.1]"
    >
      <Copy className="h-3.5 w-3.5" />
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function EmptyPanel({ title, description, buttonLabel, onButtonClick }) {
  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardContent className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
          <Sparkles className="h-6 w-6 text-cyan-300" />
        </div>

        <h3 className="text-lg font-semibold text-white">{title}</h3>

        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
          {description}
        </p>

        {buttonLabel && onButtonClick && (
          <Button
            type="button"
            onClick={onButtonClick}
            className="mt-5 rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-zinc-200"
          >
            {buttonLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function TypewriterText({ words, className = "" }) {
  const safeWords = words?.length
    ? words
    : ["Discover something new today"];

  const [wordIndex, setWordIndex] = useState(0);
  const [letterCount, setLetterCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = safeWords[wordIndex] || safeWords[0] || "";

    let delay = isDeleting ? 28 : 55;

    if (!isDeleting && letterCount === currentWord.length) {
      delay = 1200;
    }

    if (isDeleting && letterCount === 0) {
      delay = 260;
    }

    const timer = setTimeout(() => {
      if (!isDeleting && letterCount < currentWord.length) {
        setLetterCount((current) => current + 1);
        return;
      }

      if (!isDeleting && letterCount === currentWord.length) {
        setIsDeleting(true);
        return;
      }

      if (isDeleting && letterCount > 0) {
        setLetterCount((current) => current - 1);
        return;
      }

      setIsDeleting(false);
      setWordIndex((current) => (current + 1) % safeWords.length);
    }, delay);

    return () => clearTimeout(timer);
  }, [isDeleting, letterCount, safeWords, wordIndex]);

  const currentWord = safeWords[wordIndex] || safeWords[0] || "";
  const visibleText = currentWord.slice(0, letterCount);

  return (
    <span
      className={`block h-[1.15em] max-w-full overflow-hidden whitespace-nowrap ${className}`}
      title={currentWord}
    >
      <span className="inline-block whitespace-nowrap align-bottom">
        {visibleText || "\u00A0"}
      </span>

      <span className="ml-1 inline-block h-[0.9em] w-[3px] animate-pulse rounded-full bg-cyan-300 align-middle" />
    </span>
  );
}

function PrettySelect({ value, onChange, options, label }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div
      ref={dropdownRef}
      className={`relative h-14 min-w-0 ${open ? "z-[9999]" : "z-10"}`}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-14 w-full min-w-0 items-center justify-between gap-3 rounded-2xl border px-4 text-left text-sm outline-none transition ${open
          ? "border-cyan-300/40 bg-cyan-300/[0.08] shadow-lg shadow-cyan-950/30"
          : "border-white/10 bg-white/[0.05] hover:border-white/20 hover:bg-white/[0.08]"
          }`}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </p>

          <p className="mt-0.5 truncate font-medium text-white">{value}</p>
        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25 transition ${open ? "rotate-180 text-cyan-200" : "text-zinc-400"
            }`}
        >
          <ChevronDown className="h-4 w-4" />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[9999] overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#050711]/95 p-1 shadow-2xl shadow-black/80 backdrop-blur-2xl">
          {options.map((option) => {
            const isSelected = option === value;

            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={`flex h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm transition ${isSelected
                  ? "bg-cyan-300/15 text-cyan-100"
                  : "text-zinc-300 hover:bg-white/[0.07] hover:text-white"
                  }`}
              >
                <span className="truncate">{option}</span>

                {isSelected && (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-black">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function createSlugWords(text) {
  return String(text || "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 4);
}

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authLoading, requireAuth, setAuthModalOpen } = useAuth();
  const storageKey = getCurrentResearchKey(user?.uid);

  const [contentPackLoading, setContentPackLoading] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("YouTube");
  const [selectedAudience, setSelectedAudience] = useState("New creators");
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [researchHistory, setResearchHistory] = useState([]);
  const [savedIdeasCount, setSavedIdeasCount] = useState(0);
  const [dashboardError, setDashboardError] = useState("");
  const [liveTrendTopics, setLiveTrendTopics] = useState([]);
  const [youtubeCompetitors, setYoutubeCompetitors] = useState([]);
  const [competitorsLoading, setCompetitorsLoading] = useState(false);
  const [competitorsError, setCompetitorsError] = useState("");
  const [niche, setNiche] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiData, setApiData] = useState(null);
  const [error, setError] = useState("");
  const [savingText, setSavingText] = useState("");

  // Restore the current scan from navigation state or browser storage.
  // This does not call the API and therefore keeps the UI responsive.
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setNiche("");
      setSelectedPlatform("YouTube");
      setSelectedAudience("New creators");
      setApiData(null);
      setResearchHistory([]);
      setSavedIdeasCount(0);
      setLiveTrendTopics([]);
      setYoutubeCompetitors([]);
      setCompetitorsLoading(false);
      setCompetitorsError("");
      setDashboardError("");
      setDashboardLoading(false);
      return;
    }

    const historyScan = location.state?.historyScan;

    if (historyScan) {
      const historyData = getHistoryResponse(historyScan);

      setNiche(historyScan.niche || "");
      setSelectedPlatform(historyScan.platform || "YouTube");
      setSelectedAudience(historyScan.audience || "New creators");
      setApiData(historyData || null);

      localStorage.setItem(
        storageKey,
        JSON.stringify({
          niche: historyScan.niche || "",
          platform: historyScan.platform || "YouTube",
          audience: historyScan.audience || "New creators",
          data: historyData || null,
          createdAt:
            historyScan.createdAt ||
            historyScan.created_at ||
            new Date().toISOString(),
        })
      );

      return;
    }

    const savedScan =
      localStorage.getItem(storageKey) ||
      localStorage.getItem(CURRENT_RESEARCH_KEY);

    if (!savedScan) {
      return;
    }

    try {
      const parsedScan = JSON.parse(savedScan);

      setNiche(parsedScan.niche || "");
      setSelectedPlatform(parsedScan.platform || "YouTube");
      setSelectedAudience(parsedScan.audience || "New creators");
      setApiData(parsedScan.data || null);
    } catch {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(CURRENT_RESEARCH_KEY);
    }
  }, [authLoading, location.state, storageKey, user]);

  // Load each source independently. A failed history/saved-ideas request must
  // never prevent the live trends or the rest of the dashboard from rendering.
  useEffect(() => {
    if (authLoading) return undefined;

    if (!user) {
      setDashboardLoading(false);
      return undefined;
    }

    let isMounted = true;

    async function loadDashboardData() {
      setDashboardLoading(true);
      setDashboardError("");

      try {
        const [
          dailyResult,
          historyResult,
          savedIdeasResult,
          trendsResult,
        ] = await Promise.allSettled([
          getDailyNicheIdeas({
            niche: "",
            platform: selectedPlatform,
            audience: selectedAudience,
            limit: 20,
            forceRefresh: false,
          }),
          getResearchHistory(),
          getSavedIdeas(),
          getTrendFeed({
            platform: selectedPlatform,
            region: "India",
            timeRange: "7d",
            contentType: "All",
            momentum: "All",
            limit: 12,
          }),
        ]);

        if (!isMounted) return;

        const dailyResponse =
          dailyResult.status === "fulfilled" ? dailyResult.value : null;

        const historyList =
          historyResult.status === "fulfilled"
            ? normalizeApiList(historyResult.value)
            : [];

        const savedIdeasList =
          savedIdeasResult.status === "fulfilled"
            ? normalizeApiList(savedIdeasResult.value)
            : [];

        const trendFeed =
          trendsResult.status === "fulfilled" ? trendsResult.value : null;

        const liveTopics = getDashboardLiveTopics(trendFeed);

        setResearchHistory(historyList);
        setSavedIdeasCount(savedIdeasList.length);
        setLiveTrendTopics(liveTopics);

        const hasHistoryScan = Boolean(location.state?.historyScan);
        const dailyTopics = getList(dailyResponse?.trendingTopics);

        // These dashboard cards are Groq-only. Replace any old locally cached
        // Apify/fallback scan with the latest Groq response unless the user
        // intentionally opened a specific item from History.
        if (!hasHistoryScan && isGroqDashboardData(dailyResponse) && dailyTopics.length > 0) {
          setApiData(dailyResponse);

          if (dailyResponse?.niche) {
            setNiche((current) => current.trim() || dailyResponse.niche);
          }
        }

        const errors = [
          dailyResult,
          historyResult,
          savedIdeasResult,
          trendsResult,
        ]
          .filter((result) => result.status === "rejected")
          .map((result) => result.reason?.message)
          .filter(Boolean);

        const hasVisibleData =
          dailyTopics.length > 0 ||
          historyList.length > 0 ||
          liveTopics.length > 0;

        if (dailyResult.status === "rejected") {
          setDashboardError(
            dailyResult.reason?.message || "Groq could not generate dashboard ideas."
          );
        } else if (!hasVisibleData && errors.length > 0) {
          setDashboardError(
            errors[0] || "Failed to load dashboard data."
          );
        }
      } catch (err) {
        if (isMounted) {
          setDashboardError(
            err.message || "Failed to load dashboard data."
          );
        }
      } finally {
        if (isMounted) {
          setDashboardLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [
    authLoading,
    location.state,
    selectedAudience,
    selectedPlatform,
    storageKey,
    user,
  ]);

  const latestScan = researchHistory[0] || null;
  const latestHistoryData = getHistoryResponse(latestScan);
  const activeResearchData = isGroqDashboardData(apiData)
    ? apiData
    : isGroqDashboardData(latestHistoryData)
      ? latestHistoryData
      : null;

  const topicsToShow = getList(activeResearchData?.trendingTopics);
  const dashboardTopicsToShow = topicsToShow.slice(0, 4);
  const hooksToShow = getList(activeResearchData?.viralHooks);
  const titlesToShow = getList(activeResearchData?.titleSuggestions);
  const topicMetricLabel =
    activeResearchData?.source === "groq" ? "AI fit" : "Growth";

  const activeNiche = niche || latestScan?.niche || "your niche";

  const competitorsToShow = buildDashboardCompetitorsFromResearch(
    activeResearchData,
    activeNiche
  );

  const baseDashboardStats = buildDashboardStats({
    activeData: activeResearchData,
    history: researchHistory,
    savedIdeasCount,
  });

  const dashboardStats = {
    ...baseDashboardStats,
    topicsCount:
      baseDashboardStats.topicsCount || liveTrendTopics.length,
    competitorsCount: competitorsToShow.length,
  };

  const hasResearchData = Boolean(
    topicsToShow.length ||
    hooksToShow.length ||
    titlesToShow.length
  );

  const activeSource =
    activeResearchData?.meta?.isCached
      ? "Groq AI ideas cached for today"
      : activeResearchData?.source === "groq"
        ? "Groq AI generated"
        : "No scan yet";

  useEffect(() => {
    // Dashboard competitor table will use competitors from current research data only.
    // This avoids YouTube Search API quota errors.
    // Sidebar Competitor Analysis remains untouched.
    setYoutubeCompetitors([]);
    setCompetitorsLoading(false);
    setCompetitorsError("");
  }, [activeResearchData]);

  const latestScanDate = formatDate(
    latestScan?.created_at || latestScan?.createdAt || activeResearchData?.meta?.generatedAt
  );

  const pageTitle = "Discover your next viral video";

  const headlineWords = DASHBOARD_HEADLINE_WORDS;

  const handleFindIdeas = async () => {
    if (!requireAuth()) {
      return;
    }

    if (!niche.trim()) {
      setError("Please enter a niche first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getDailyNicheIdeas({
        niche,
        platform: selectedPlatform,
        audience: selectedAudience,
        limit: 20,
        forceRefresh: true,
      });

      setApiData(data);

      const createdAt = new Date().toISOString();

      const newScan = {
        id: `current-${createdAt}`,
        niche,
        platform: selectedPlatform,
        audience: selectedAudience,
        response_json: data,
        created_at: createdAt,
      };

      const cachePayload = {
        niche,
        platform: selectedPlatform,
        audience: selectedAudience,
        data,
        createdAt,
      };

      setResearchHistory((current) => [newScan, ...current]);

      localStorage.setItem(storageKey, JSON.stringify(cachePayload));
      localStorage.setItem(CURRENT_RESEARCH_KEY, JSON.stringify(cachePayload));
    } catch (err) {
      if (redirectToUpgrade(navigate, err)) {
        return;
      }

      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleNewScan = () => {
    if (!requireAuth()) {
      return;
    }

    localStorage.removeItem(storageKey);
    localStorage.removeItem(CURRENT_RESEARCH_KEY);

    setNiche("");
    setSelectedPlatform("YouTube");
    setSelectedAudience("New creators");
    setApiData(null);
    setError("");
    setSavingText("");
    setContentPackLoading("");
    setYoutubeCompetitors([]);
    setCompetitorsError("");
  };

  useEffect(() => {
    if (!location.state?.forceNewScan) {
      return;
    }

    localStorage.removeItem(storageKey);
    localStorage.removeItem(CURRENT_RESEARCH_KEY);

    setNiche("");
    setSelectedPlatform("YouTube");
    setSelectedAudience("New creators");
    setApiData(null);
    setError("");
    setSavingText("");
    setContentPackLoading("");
    setYoutubeCompetitors([]);
    setCompetitorsError("");

    navigate("/dashboard", {
      replace: true,
      state: {},
    });
  }, [location.state?.forceNewScan, navigate, storageKey]);

  const handleSaveIdea = async ({ type, content, platform, niche }) => {
    if (!requireAuth()) {
      return;
    }

    try {
      setSavingText(content);

      await saveIdea({
        type,
        content,
        platform,
        niche,
      });

      setSavedIdeasCount((current) => current + 1);
      alert("Idea saved successfully");
    } catch (err) {
      alert(err.message || "Failed to save idea");
    } finally {
      setSavingText("");
    }
  };

  const handleGenerateContentPack = async (item) => {
    if (!requireAuth()) {
      return;
    }

    const topicText = getTextValue(item?.topic, "Untitled topic");
    const growthText = getTextValue(item?.growth, "0%");
    const competitionText = getTextValue(item?.competition, "Medium");
    const insightText = getTextValue(
      item?.insight,
      "This topic was generated from your latest research scan."
    );

    setContentPackLoading(topicText);
    setError("");

    try {
      const pack = await createContentPack({
        topic: topicText,
        growth: growthText,
        competition: competitionText,
        insight: insightText,
        niche: niche || getTextValue(item?.niche, activeNiche),
        platform: selectedPlatform,
        audience: selectedAudience,
        variantSeed: Date.now(),
        generationMode: "fresh",
      });

      navigate("/content-pack", {
        state: {
          contentPack: pack,
        },
      });
    } catch (err) {
      setError(err.message || "Failed to create content pack.");
    } finally {
      setContentPackLoading("");
    }
  };

  const handleShareTopic = async (item) => {
    const topicText = getTextValue(item?.topic || item?.title, "Untitled topic");
    const text =
      item.shareText ||
      `Video Idea: ${topicText}\nNiche: ${activeNiche}\nGrowth: ${getTextValue(
        item?.growth,
        "+0%"
      )}\nDifficulty: ${getTextValue(item?.difficulty, "Medium Effort")}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: topicText,
          text,
        });
        return;
      }

      await navigator.clipboard.writeText(text);
      alert("Topic copied for sharing");
    } catch {
      // Native share cancel should not show an error.
    }
  };

  const handleExportReport = () => {
    if (!activeResearchData) {
      setError("Run a scan first to export a dynamic report.");
      return;
    }

    const report = {
      niche: activeNiche,
      platform: selectedPlatform,
      audience: selectedAudience,
      stats: dashboardStats,
      latestScan: latestScan
        ? {
          id: latestScan.id,
          niche: latestScan.niche,
          platform: latestScan.platform,
          audience: latestScan.audience,
          created_at: latestScan.created_at || latestScan.createdAt,
        }
        : null,
      research: activeResearchData,
      youtubeCompetitors: competitorsToShow,
      exportedAt: new Date().toISOString(),
    };

    const slug =
      createSlugWords(activeNiche).join("-").toLowerCase() || "research-report";

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${slug}-research-report.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout
      eyebrow="Research Dashboard"
      title={pageTitle}
      onNewScan={handleNewScan}
    >
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-50 overflow-visible rounded-[1.5rem] border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/30 backdrop-blur-xl sm:rounded-[2rem]"
      >
        <div className="relative p-5 sm:p-8 lg:p-10">
          {/* <div className="absolute right-8 top-8 hidden rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-200 xl:block">
            {dashboardLoading ? "Syncing dashboard..." : activeSource}
          </div> */}

          <div className="max-w-3xl">
            <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-zinc-300 sm:px-4 sm:text-sm">
              <Flame className="h-4 w-4 shrink-0 text-orange-300" />
              <span className="truncate">
                {user
                  ? hasResearchData
                    ? `${selectedPlatform} research • Latest scan ${latestScanDate}`
                    : "Set your niche once and get fresh topics every visit"
                  : "Login to generate and save dynamic research"}
              </span>
            </div>

            <h1 className="h-[1.2em] max-w-full overflow-hidden whitespace-nowrap text-2xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              <TypewriterText words={headlineWords} />
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:mt-5 sm:text-lg">
              {hasResearchData
                ? "Your dashboard now works like a personal content radar. It remembers your niche and shows fresh topic ideas instead of static sample content."
                : "Enter your niche and get daily fresh topics, hooks, titles, competitor signals, and content ideas for your channel."}
            </p>
          </div>

          <div className="relative z-[999] mt-7 grid w-full gap-3 rounded-3xl border border-white/10 bg-black/25 p-3 sm:mt-8 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.4fr)_minmax(160px,0.8fr)_minmax(160px,0.8fr)_auto]">
            <label className="flex h-14 min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 md:col-span-2 xl:col-span-1">
              <Search className="h-5 w-5 shrink-0 text-zinc-500" />

              <input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleFindIdeas();
                  }
                }}
                placeholder="Enter niche, e.g. Fitness"
                className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              />
            </label>

            <PrettySelect
              label="Platform"
              value={selectedPlatform}
              onChange={setSelectedPlatform}
              options={["YouTube", "YouTube Shorts"]}
            />

            <PrettySelect
              label="Audience"
              value={selectedAudience}
              onChange={setSelectedAudience}
              options={["New creators", "Startup founders", "Students", "Marketers"]}
            />

            <Button
              type="button"
              onClick={handleFindIdeas}
              disabled={loading}
              className="h-14 w-full rounded-2xl bg-white px-5 text-sm font-semibold text-black hover:bg-zinc-200 md:col-span-2 xl:col-span-1 xl:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finding Ideas...
                </>
              ) : (
                "Refresh Ideas"
              )}
            </Button>
          </div>

          {(error || dashboardError) && (
            <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error || dashboardError}
            </p>
          )}
        </div>
      </motion.section>

      {dashboardLoading && !hasResearchData && user && (
        <div className="mt-5 flex min-h-[180px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
            Loading your Daily Niche Radar...
          </div>
        </div>
      )}

      {!dashboardLoading && !authLoading && !user && (
        <section className="mt-5">
          <EmptyPanel
            title="Login to see your dynamic dashboard"
            description="After login, your dashboard will remember your niche and show real research history, saved ideas, hooks, titles, and competitor data."
            buttonLabel="Login / Sign up"
          // onButtonClick={() => setAuthModalOpen(true)}
          />
        </section>
      )}

      {user && (
        <>
          <section className="relative z-0 mt-5 grid gap-4 sm:mt-6 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Compass}
              label="Topics Found"
              value={dashboardStats.topicsCount}
              caption={`${dashboardStats.scanCount} research scan${dashboardStats.scanCount === 1 ? "" : "s"
                } synced`}
            />

            <StatCard
              icon={TrendingUp}
              label="Avg Trend Growth"
              value={dashboardStats.averageGrowth}
              caption="Calculated from your dynamic trend results"
            />

            <StatCard
              icon={Clipboard}
              label="Hooks Generated"
              value={dashboardStats.hooksCount}
              caption="Total hooks from your research history"
            />

            <StatCard
              icon={BarChart3}
              label="Saved Ideas"
              value={dashboardStats.savedIdeasCount}
              caption={`${dashboardStats.competitorsCount} competitors tracked`}
            />


          </section>

          {!dashboardLoading &&
            !hasResearchData &&
            !liveTrendTopics.length && (
              <section className="mt-8">
                <EmptyPanel
                  title="Set your niche to start"
                  description="Enter a niche like Fitness, Finance, Gaming, AI Tools, or Motivation and click Refresh Ideas. Your dashboard will show 4 fresh ideas here and more on the Trends page."
                />
              </section>
            )}
          {!dashboardLoading &&
            !hasResearchData &&
            liveTrendTopics.length > 0 && (
              <section className="mt-8">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-orange-300" />

                      <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                        Trending Now
                      </h2>
                    </div>

                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      Live YouTube topics are shown here until you run your first niche scan.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => navigate("/trends")}
                    className="h-9 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-medium text-zinc-200 hover:bg-white/[0.08] sm:w-auto"
                  >
                    Explore All Trends
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {liveTrendTopics.map((item, index) => {
                    const topicText = getTextValue(item?.topic, "Untitled trend");

                    return (
                      <motion.div
                        key={item.id || `${topicText}-${index}`}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                      >
                        <Card className="group h-full border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-cyan-950/30">
                          <CardContent className="flex h-full flex-col p-5">
                            <div className="mb-5 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-200">
                                {getTextValue(item?.growth, "Trending now")}
                              </span>

                              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                                {getTextValue(item?.competition, "Medium")} competition
                              </span>

                              <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs text-violet-200">
                                {getTextValue(item?.difficulty, "Video")}
                              </span>
                            </div>

                            <h3 className="text-base font-semibold leading-7 text-white sm:text-lg">
                              {topicText}
                            </h3>

                            <p className="mt-3 flex-1 text-sm leading-6 text-zinc-500">
                              {getTextValue(
                                item?.insight,
                                "Live YouTube trend signal."
                              )}
                            </p>

                            <Button
                              type="button"
                              onClick={() => handleGenerateContentPack(item)}
                              disabled={contentPackLoading === topicText}
                              className="mt-6 h-11 w-full rounded-full border border-cyan-300/20 bg-cyan-300/10 px-5 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
                            >
                              {contentPackLoading === topicText ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4" />
                                  Create Pack
                                </>
                              )}
                            </Button>

                            <Button
                              type="button"
                              onClick={() =>
                                handleSaveIdea({
                                  type: "Trend",
                                  content: topicText,
                                  platform: item?.platform || selectedPlatform,
                                  niche: item?.niche || "Live YouTube trends",
                                })
                              }
                              disabled={savingText === topicText}
                              className="mt-3 h-10 w-full rounded-full border border-white/10 bg-white/[0.04] px-5 text-xs font-semibold text-zinc-200 hover:bg-white/[0.08]"
                            >
                              {savingText === topicText ? "Saving..." : "Save Trend"}
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )}

          {hasResearchData && (
            <>
              <section className="mt-8">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                      Today&apos;s Fresh Topics
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      Fresh Groq AI-generated ideas for your niche. These are
                      creative recommendations, not live Apify trend metrics.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams({
                        niche: activeNiche,
                        platform: selectedPlatform,
                        audience: selectedAudience,
                      });

                      navigate(`/fresh-topics?${params.toString()}`, {
                        state: {
                          niche: activeNiche,
                          platform: selectedPlatform,
                          audience: selectedAudience,
                          researchData: activeResearchData,
                        },
                      });
                    }}
                    className="h-9 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-medium text-zinc-200 hover:bg-white/[0.08] sm:w-auto"
                  >
                    View All
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {dashboardTopicsToShow.map((item, index) => {
                    const topicText = getTextValue(item?.topic, "Untitled topic");
                    const growthText = getTextValue(item?.growth, "0%");
                    const competitionText = getTextValue(
                      item?.competition,
                      "Medium"
                    );
                    const difficultyText = getTextValue(
                      item?.difficulty,
                      "Medium Effort"
                    );
                    const insightText = getTextValue(
                      item?.insight,
                      "This topic was generated from your latest research scan."
                    );

                    return (
                      <motion.div
                        key={`${topicText}-${index}`}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                        className="min-w-0"
                      >
                        <Card className="group h-full border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-cyan-950/30">
                          <CardContent className="flex h-full flex-col p-5">
                            <div className="mb-5 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-200">
                                {topicMetricLabel} {growthText}
                              </span>

                              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                                {competitionText}
                              </span>

                              <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs text-violet-200">
                                {difficultyText}
                              </span>
                            </div>

                            <h3 className="text-base font-semibold leading-7 text-white sm:text-lg">
                              {topicText}
                            </h3>

                            <p className="mt-3 flex-1 text-sm leading-6 text-zinc-500">
                              {insightText}
                            </p>

                            <Button
                              type="button"
                              onClick={() => handleGenerateContentPack(item)}
                              disabled={contentPackLoading === topicText}
                              className="mt-6 h-12 w-full !rounded-full border border-cyan-300/20 bg-gradient-to-r from-cyan-300/15 to-violet-400/15 px-5 text-sm font-semibold text-cyan-100 shadow-inner shadow-white/5 hover:from-cyan-300/25 hover:to-violet-400/25"
                              style={{ borderRadius: "9999px" }}
                            >
                              {contentPackLoading === topicText ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4" />
                              )}
                              {contentPackLoading === topicText
                                ? "Creating..."
                                : "Create Now"}
                            </Button>

                            <Button
                              type="button"
                              onClick={() =>
                                handleSaveIdea({
                                  type: "Topic",
                                  content: topicText,
                                  platform: selectedPlatform,
                                  niche: niche || getTextValue(item?.niche, activeNiche),
                                })
                              }
                              disabled={savingText === topicText}
                              className="mt-3 h-11 w-full rounded-full border border-white/10 bg-white/[0.04] px-5 text-xs font-semibold text-zinc-200 hover:bg-white/[0.08]"
                            >
                              {savingText === topicText
                                ? "Saving..."
                                : "Save Topic"}
                            </Button>

                            <Button
                              type="button"
                              onClick={() => handleShareTopic(item)}
                              className="mt-3 h-11 w-full rounded-full border border-white/10 bg-white/[0.04] px-5 text-xs font-semibold text-zinc-200 hover:bg-white/[0.08]"
                            >
                              <Share2 className="h-4 w-4" />
                              Share Topic
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </section>

              <div className="mt-8 grid gap-6 xl:grid-cols-2">
                <section className="min-w-0">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                      Viral Hooks
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      Use these as openings for intros, Shorts, and thumbnails.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {hooksToShow.map((hook, index) => {
                      const hookText = getTextValue(hook, "");

                      if (!hookText) return null;

                      return (
                        <Card
                          key={`${hookText}-${index}`}
                          className="border-white/10 bg-white/[0.04]"
                        >
                          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 gap-3">
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-xs font-semibold text-violet-200">
                                {index + 1}
                              </div>

                              <p className="min-w-0 text-sm leading-6 text-zinc-200">
                                {hookText}
                              </p>
                            </div>

                            <div className="flex shrink-0 gap-2">
                              <CopyButton text={hookText} />

                              <Button
                                type="button"
                                onClick={() =>
                                  handleSaveIdea({
                                    type: "Hook",
                                    content: hookText,
                                    platform: selectedPlatform,
                                    niche: activeNiche,
                                  })
                                }
                                disabled={savingText === hookText}
                                className="h-8 shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs text-zinc-200 hover:bg-white/[0.1]"
                              >
                                {savingText === hookText ? "Saving" : "Save"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>

                <section className="min-w-0">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                      AI Title Suggestions
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      Clickable titles optimized for curiosity and search intent.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {titlesToShow.map((title, index) => {
                      const titleText = getTextValue(title, "");

                      if (!titleText) return null;

                      return (
                        <Card
                          key={`${titleText}-${index}`}
                          className="border-white/10 bg-white/[0.04] transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.06]"
                        >
                          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <button
                              type="button"
                              className="min-w-0 text-left text-sm font-medium leading-6 text-zinc-100 hover:text-cyan-200"
                            >
                              {titleText}
                            </button>

                            <div className="flex shrink-0 gap-2">
                              <CopyButton text={titleText} />

                              <Button
                                type="button"
                                onClick={() =>
                                  handleSaveIdea({
                                    type: "Title",
                                    content: titleText,
                                    platform: selectedPlatform,
                                    niche: activeNiche,
                                  })
                                }
                                disabled={savingText === titleText}
                                className="h-8 shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs text-zinc-200 hover:bg-white/[0.1]"
                              >
                                {savingText === titleText ? "Saving" : "Save"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              </div>

              <section className="mt-8">
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                      Competitor Analysis
                    </h2>


                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      Competitor signals from your latest research scan for {activeNiche}.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={handleExportReport}
                    disabled={!activeResearchData}
                    className="h-9 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-medium text-zinc-200 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    <FileDown className="h-4 w-4" />
                    Export Report
                  </Button>
                </div>

                {competitorsLoading && (
                  <Card className="border-white/10 bg-white/[0.04]">
                    <CardContent className="flex min-h-[132px] items-center justify-center gap-3 p-6 text-sm text-zinc-300">
                      <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
                      Loading public YouTube channels...
                    </CardContent>
                  </Card>
                )}

                {!competitorsLoading && competitorsError && (
                  <Card className="border-rose-300/20 bg-rose-300/[0.06]">
                    <CardContent className="p-5 text-sm leading-6 text-rose-100">
                      {competitorsError}
                    </CardContent>
                  </Card>
                )}

                {!competitorsLoading && !competitorsError && !competitorsToShow.length && (
                  <Card className="border-white/10 bg-white/[0.04]">
                    <CardContent className="p-6 text-sm text-zinc-400">
                      Run a fresh scan to generate topic-based competitor signals for this niche.
                    </CardContent>
                  </Card>
                )}

                {!competitorsLoading && competitorsToShow.length > 0 && (
                  <Card className="overflow-hidden border-white/10 bg-white/[0.04]">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                          <thead className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.16em] text-zinc-500">
                            <tr>
                              <th className="px-5 py-4 font-medium">Top Channel</th>
                              <th className="px-5 py-4 font-medium">Score</th>
                              <th className="px-5 py-4 font-medium">Views</th>
                              <th className="px-5 py-4 font-medium">Growth</th>
                              <th className="px-5 py-4 font-medium">Open</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-white/10">
                            {competitorsToShow.map((item, index) => {
                              const channelName =
                                getTextValue(
                                  item?.channelTitle ||
                                  item?.channelName ||
                                  item?.name ||
                                  item?.channel,
                                  ""
                                ).trim() || "Unknown Channel";
                              const channelUrl = getTextValue(
                                item.channelUrl || item.sourceUrl || item.url,
                                ""
                              );
                              const initials = channelName.slice(0, 2).toUpperCase();

                              return (
                                <tr
                                  key={item.channelId || `${channelName}-${index}`}
                                  className="transition hover:bg-white/[0.035]"
                                >
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                      {item.channelThumbnail ? (
                                        <img
                                          src={item.channelThumbnail}
                                          alt={channelName}
                                          className="h-9 w-9 shrink-0 rounded-2xl border border-white/10 object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-900 text-xs font-semibold text-white">
                                          {initials}
                                        </div>
                                      )}

                                      <div className="min-w-0">
                                        <p className="truncate font-medium text-white">{channelName}</p>
                                        <p className="mt-1 truncate text-xs text-zinc-500">
                                          {item?.channelHandle || "YouTube Data API"}
                                        </p>                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-5 py-4 text-zinc-200">
                                    {getTextValue(item.score || item.subscribers, "—")}
                                  </td>

                                  <td className="px-5 py-4 text-zinc-200">
                                    {getTextValue(item.views || item.channelViews || item.avg_views, "—")}
                                  </td>

                                  <td className="px-5 py-4 text-cyan-300">
                                    {getTextValue(item.growth || item.videoCount, "—")}
                                  </td>

                                  <td className="px-5 py-4">
                                    <Button
                                      type="button"
                                      disabled={!channelUrl}
                                      onClick={() =>
                                        window.open(channelUrl, "_blank", "noopener,noreferrer")
                                      }
                                      className="h-8 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs text-zinc-200 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Open Channel
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </section>
            </>
          )}
        </>
      )}
      <ContentCalendarWidget
        userId={user?.uid}
        defaultTopic={activeNiche}
        variant="dashboard-floating"
      />
    </DashboardLayout>
  );
}
