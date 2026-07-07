import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Clipboard, Loader2, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { getDailyNicheIdeas } from "../lib/api";

function getList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function getTextValue(value, fallback = "") {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (value && typeof value === "object") {
    return value.topic || value.title || value.name || fallback;
  }

  return fallback;
}

function CopyTopicButton({ topic }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(topic);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleCopy}
      className="h-9 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs font-medium text-zinc-200 hover:bg-white/[0.1]"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export default function FreshTopics() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state || {};
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const niche = String(routeState.niche || query.get("niche") || "").trim();
  const platform = String(routeState.platform || query.get("platform") || "YouTube").trim();
  const audience = String(routeState.audience || query.get("audience") || "New creators").trim();
  const routeResearchData = routeState.researchData || null;

  const [researchData, setResearchData] = useState(routeResearchData);
  const [loading, setLoading] = useState(!routeResearchData);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTopics() {
      if (routeResearchData?.trendingTopics?.length) {
        setResearchData(routeResearchData);
        setLoading(false);
        return;
      }

      if (!niche) {
        setError("No fresh-topic scan was found. Generate ideas from the dashboard first.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await getDailyNicheIdeas({
          niche,
          platform,
          audience,
          limit: 20,
          forceRefresh: false,
        });

        if (!cancelled) {
          setResearchData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Failed to load fresh topics.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTopics();

    return () => {
      cancelled = true;
    };
  }, [audience, niche, platform, routeResearchData]);

  const topics = getList(researchData?.trendingTopics);
  const displayNiche = niche || researchData?.niche || "your niche";

  return (
    <DashboardLayout
      eyebrow="Fresh Topic Library"
      title="All Fresh Topics"
      onNewScan={() => navigate("/dashboard", { state: { forceNewScan: true } })}
    >
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-cyan-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
                <Sparkles className="h-5 w-5 text-cyan-200" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Today&apos;s Fresh Topics
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                  {topics.length} Groq AI-generated content ideas for {displayNiche}.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-zinc-400">
            <p className="font-medium text-zinc-200">{platform}</p>
            <p className="mt-1">Audience: {audience}</p>
          </div>
        </div>
      </section>

      {loading && (
        <div className="mt-8 flex min-h-[260px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.035]">
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
            Loading all fresh topics...
          </div>
        </div>
      )}

      {!loading && error && (
        <Card className="mt-8 border-rose-300/20 bg-rose-300/[0.06]">
          <CardContent className="p-5 text-sm leading-6 text-rose-100">
            {error}
          </CardContent>
        </Card>
      )}

      {!loading && !error && topics.length > 0 && (
        <section className="mt-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topics.map((item, index) => {
              const topic = getTextValue(item?.topic, "Untitled topic");
              const opportunity = getTextValue(item?.growth || item?.opportunity, "Medium");
              const competition = getTextValue(item?.competition, "Medium");
              const difficulty = getTextValue(item?.difficulty, "Medium Effort");
              const insight = getTextValue(
                item?.insight,
                "A tailored content angle from your latest AI topic scan."
              );

              return (
                <Card
                  key={`${topic}-${index}`}
                  className="flex h-full flex-col border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.06]"
                >
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-200">
                        AI fit {opportunity}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                        {competition} competition
                      </span>
                      <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs text-violet-200">
                        {difficulty}
                      </span>
                    </div>

                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Idea {String(index + 1).padStart(2, "0")}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold leading-7 text-white">{topic}</h2>
                    <p className="mt-3 flex-1 text-sm leading-6 text-zinc-400">{insight}</p>

                    <div className="mt-6 flex justify-end">
                      <CopyTopicButton topic={topic} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {!loading && !error && !topics.length && (
        <Card className="mt-8 border-white/10 bg-white/[0.04]">
          <CardContent className="p-8 text-center text-sm text-zinc-400">
            No topics are available yet. Return to Dashboard and generate ideas first.
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
