import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Clock,
  Loader2,
  LockKeyhole,
  Search,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { getResearchHistory } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const CURRENT_RESEARCH_KEY = "viralMindCurrentResearch";

function formatDate(dateValue) {
  if (!dateValue) return "Unknown date";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function LockedHistorySection({ lockedCount, onUpgrade }) {
  if (!lockedCount) return null;

  const displayCount = Math.min(lockedCount, 3);

  return (
    <section className="relative mt-5 overflow-hidden rounded-3xl border border-cyan-300/20 bg-white/[0.035] p-4 sm:p-5">
      <div className="pointer-events-none select-none space-y-3 blur-[6px] opacity-45">
        {Array.from({ length: displayCount }, (_, index) => (
          <div
            key={`locked-history-${index}`}
            className="flex min-h-[88px] items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-4"
          >
            <div className="h-11 w-11 shrink-0 rounded-2xl bg-cyan-300/15" />

            <div className="min-w-0 flex-1">
              <div className="h-4 w-2/5 rounded bg-white/20" />
              <div className="mt-3 h-3 w-3/5 rounded bg-white/10" />
            </div>

            <div className="hidden gap-3 sm:grid sm:grid-cols-3">
              <div className="h-12 w-16 rounded-2xl bg-white/10" />
              <div className="h-12 w-16 rounded-2xl bg-white/10" />
              <div className="h-12 w-16 rounded-2xl bg-white/10" />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#080b13]/55 px-5 text-center backdrop-blur-[1px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
          <LockKeyhole className="h-5 w-5 text-cyan-200" />
        </div>

        <h3 className="mt-3 text-lg font-semibold text-white">
          {lockedCount} older history item
          {lockedCount === 1 ? "" : "s"} locked
        </h3>

        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-300">
          Free users can access their latest 3 dashboard searches. Upgrade now
          to unlock your complete research history.
        </p>

        <Button
          type="button"
          onClick={onUpgrade}
          className="mt-4 h-10 rounded-full bg-cyan-300 px-5 text-sm font-semibold text-black hover:bg-cyan-200"
        >
          <Sparkles className="h-4 w-4" />
          Upgrade Now
        </Button>
      </div>
    </section>
  );
}

export default function History() {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [historyMeta, setHistoryMeta] = useState({
    lockedCount: 0,
    plan: "free",
    historyUnlocked: false,
    totalCount: 0,
    visibleCount: 0,
  });

  const { user, authLoading, setAuthModalOpen } = useAuth();

  useEffect(() => {
    let active = true;

    async function fetchHistory() {
      try {
        setLoading(true);
        setError("");

        const response = await getResearchHistory();

        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.items)
            ? response.items
            : Array.isArray(response?.data)
              ? response.data
              : [];

        if (!active) return;

        setHistory(list);

        setHistoryMeta({
          lockedCount: Number(response?.meta?.lockedCount || 0),
          plan: response?.meta?.plan || "free",
          historyUnlocked: Boolean(response?.meta?.historyUnlocked),
          totalCount: Number(response?.meta?.totalCount || list.length),
          visibleCount: Number(response?.meta?.visibleCount || list.length),
        });
      } catch (requestError) {
        if (!active) return;

        setError(
          requestError.message || "Failed to load research history."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (authLoading) {
      return () => {
        active = false;
      };
    }

    if (!user) {
      setLoading(false);
      setHistory([]);
      setHistoryMeta({
        lockedCount: 0,
        plan: "free",
        historyUnlocked: false,
        totalCount: 0,
        visibleCount: 0,
      });

      return () => {
        active = false;
      };
    }

    fetchHistory();

    return () => {
      active = false;
    };
  }, [user?.uid, authLoading]);

  const handleOpenHistory = (item) => {
    if (!item) return;

    const scan = {
      niche: item.niche,
      platform: item.platform,
      audience: item.audience,
      data: item.response_json,
      createdAt: item.created_at,
    };

    localStorage.setItem(
      CURRENT_RESEARCH_KEY,
      JSON.stringify(scan)
    );

    navigate("/dashboard", {
      state: {
        historyScan: scan,
      },
    });
  };

  const filteredHistory = history.filter((item) => {
    const searchText = [
      item?.niche || "",
      item?.platform || "",
      item?.audience || "",
    ]
      .join(" ")
      .toLowerCase();

    return searchText.includes(query.trim().toLowerCase());
  });

  const showNoResults =
    !loading &&
    !authLoading &&
    user &&
    !error &&
    history.length > 0 &&
    filteredHistory.length === 0;

  const showNoHistory =
    !loading &&
    !authLoading &&
    user &&
    !error &&
    history.length === 0 &&
    historyMeta.lockedCount === 0;

  return (
    <DashboardLayout eyebrow="History" title="Your research history">
      <section className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
          Research History
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          View your previous dashboard searches. Open any available search to
          load its topics, hooks, titles, and research details again.
        </p>

        {!loading && user && !error && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-400">
              {historyMeta.totalCount} total search
              {historyMeta.totalCount === 1 ? "" : "es"}
            </span>

            {historyMeta.historyUnlocked && (
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                Full history unlocked
              </span>
            )}

            {!historyMeta.historyUnlocked &&
              historyMeta.lockedCount > 0 && (
                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                  Latest 3 available on Free plan
                </span>
              )}
          </div>
        )}
      </section>

      <Card className="mb-6 border-white/10 bg-white/[0.04]">
        <CardContent className="flex h-14 items-center gap-3 px-4">
          <Search className="h-5 w-5 shrink-0 text-zinc-500" />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search available history..."
            className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </CardContent>
      </Card>

      {(loading || authLoading) && (
        <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
            Loading history...
          </div>
        </div>
      )}

      {!loading && !authLoading && !user && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <h3 className="text-lg font-semibold text-white">
            Login required
          </h3>

          <p className="mt-2 text-sm text-zinc-500">
            Please login to view your research history.
          </p>

          <Button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="mt-5 rounded-full bg-cyan-300 px-6 text-sm font-semibold text-black hover:bg-cyan-200"
          >
            Login
          </Button>
        </div>
      )}

      {!loading && !authLoading && user && error && (
        <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-200">
          {error}
        </div>
      )}

      {showNoHistory && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <Clock className="mx-auto h-7 w-7 text-zinc-500" />

          <h3 className="mt-3 text-lg font-semibold text-white">
            No history found
          </h3>

          <p className="mt-2 text-sm text-zinc-500">
            Search from the dashboard first, then your research history will
            appear here.
          </p>

          <Button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-5 rounded-full bg-cyan-300 px-5 text-sm font-semibold text-black hover:bg-cyan-200"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {showNoResults && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <Search className="mx-auto h-7 w-7 text-zinc-500" />

          <h3 className="mt-3 text-lg font-semibold text-white">
            No matching history found
          </h3>

          <p className="mt-2 text-sm text-zinc-500">
            Try another niche, platform, or audience keyword.
          </p>
        </div>
      )}

      {!loading &&
        !authLoading &&
        user &&
        !error &&
        filteredHistory.length > 0 && (
          <section className="space-y-3">
            {filteredHistory.map((item) => {
              const topicsCount =
                item?.response_json?.trendingTopics?.length || 0;

              const hooksCount =
                item?.response_json?.viralHooks?.length || 0;

              const titlesCount =
                item?.response_json?.titleSuggestions?.length || 0;

              return (
                <article
                  key={item.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.07]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/10">
                        <Clock className="h-5 w-5 text-cyan-300" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-white">
                          {item.niche || "Untitled research"}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-500">
                          {item.platform || "YouTube"} •{" "}
                          {item.audience || "New creators"} •{" "}
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 text-xs sm:grid-cols-3 lg:w-[360px]">
                      <MiniStat label="Topics" value={topicsCount} />
                      <MiniStat label="Hooks" value={hooksCount} />
                      <MiniStat label="Titles" value={titlesCount} />
                    </div>

                    <Button
                      type="button"
                      onClick={() => handleOpenHistory(item)}
                      className="h-10 shrink-0 rounded-full bg-white px-4 text-xs font-semibold text-black hover:bg-zinc-200"
                    >
                      Open
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </section>
        )}

      {!loading &&
        !authLoading &&
        user &&
        !error &&
        historyMeta.lockedCount > 0 && (
          <LockedHistorySection
            lockedCount={historyMeta.lockedCount}
            onUpgrade={() => navigate("/payment")}
          />
        )}
    </DashboardLayout>
  );
}