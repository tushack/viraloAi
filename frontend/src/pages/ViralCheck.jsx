import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Copy,
  Eye,
  Gauge,
  Globe2,
  Lightbulb,
  Loader2,
  Megaphone,
  PenLine,
  Rocket,
  Sparkles,
  Target,
  Video,
  WandSparkles,
} from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { analyzeViralPotential } from "../lib/api";

const PLATFORM_OPTIONS = [
  "YouTube",
  "YouTube Shorts",
  "Instagram Reels",
  "TikTok",
  "LinkedIn",
];

const CONTENT_TYPE_OPTIONS = [
  "Long-form video",
  "Short-form video",
  "Tutorial",
  "Explainer",
  "Story / experience",
  "Product / tool review",
];

const TIMEZONE_OPTIONS = [
  "IST (Asia/Kolkata)",
  "UTC",
  "PST (America/Los_Angeles)",
  "EST (America/New_York)",
  "GMT (Europe/London)",
];

const INITIAL_FORM = {
  platform: "YouTube",
  contentType: "Long-form video",
  niche: "",
  audience: "",
  topic: "",
  title: "",
  thumbnailDescription: "",
  description: "",
  openingHook: "",
  timezone: "IST (Asia/Kolkata)",
  averageViews: "",
};

const STEP1_REQUIRED = ["niche", "audience", "topic", "title"];

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("en-IN").format(Math.round(number));
}

function getScoreTone(score) {
  if (score >= 80) {
    return {
      text: "text-emerald-200",
      badge: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    };
  }

  if (score >= 65) {
    return {
      text: "text-cyan-200",
      badge: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    };
  }

  if (score >= 45) {
    return {
      text: "text-amber-200",
      badge: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    };
  }

  return {
    text: "text-red-200",
    badge: "border-red-300/25 bg-red-300/10 text-red-100",
  };
}

function ScoreRing({ score = 0 }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));

  return (
    <div
      className="relative grid h-44 w-44 place-items-center rounded-full p-[10px] shadow-[0_22px_70px_rgba(6,182,212,0.22)]"
      style={{
        background: `conic-gradient(#67e8f9 ${safeScore * 3.6
          }deg, rgba(255,255,255,0.10) 0deg)`,
      }}
    >
      <div className="grid h-full w-full place-items-center rounded-full border border-white/10 bg-[#081019] shadow-inner shadow-black/40">
        <div className="text-center">
          <p className="text-5xl font-semibold tracking-tight text-white">
            {safeScore}
          </p>

          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            out of 100
          </p>
        </div>
      </div>
    </div>
  );
}

function CopyTitleButton({ text }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-xs font-medium text-zinc-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-100"
    >
      <Copy className="h-3.5 w-3.5" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function DimensionCard({ label, item, icon: Icon }) {
  const score = Math.max(0, Math.min(100, Number(item?.score) || 0));

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-cyan-200">
            <Icon className="h-4 w-4" />
          </span>

          <p className="truncate text-sm font-semibold text-white">
            {label}
          </p>
        </div>

        <span className="text-sm font-semibold text-cyan-200">
          {score}/100
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400"
          style={{ width: `${score}%` }}
        />
      </div>

      <p className="mt-3 text-xs leading-5 text-zinc-500">
        {item?.reason || "No detailed reason was returned."}
      </p>
    </div>
  );
}

function ImprovementCard({ title, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-200">
          <Icon className="h-4 w-4" />
        </span>

        <p className="text-sm font-semibold text-white">{title}</p>
      </div>

      <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
    </div>
  );
}

function StepIndicator({ step }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${step >= 1
            ? "bg-cyan-300 text-black"
            : "border border-white/20 text-zinc-500"
          }`}
      >
        1
      </div>

      <div
        className={`h-px flex-1 transition ${step >= 2 ? "bg-cyan-300/50" : "bg-white/10"
          }`}
      />

      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${step >= 2
            ? "bg-cyan-300 text-black"
            : "border border-white/20 text-zinc-500"
          }`}
      >
        2
      </div>
    </div>
  );
}

function PremiumSelect({
  label,
  value,
  onChange,
  options,
  icon: Icon,
  optional = false,
}) {
  const [open, setOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
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
      ref={selectRef}
      className={`relative min-w-0 ${open ? "z-50" : "z-0"}`}
    >
      <p className="mb-2 flex h-4 min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
        <span className="truncate">{label}</span>

        {optional && (
          <span className="normal-case font-normal tracking-normal text-zinc-600">
            (optional)
          </span>
        )}
      </p>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-12 w-full min-w-0 items-center gap-3 rounded-2xl border px-3.5 text-left transition-all duration-200 ${open
            ? "border-cyan-300/50 bg-cyan-300/[0.09] shadow-[0_12px_28px_rgba(6,182,212,0.13)]"
            : "border-white/10 bg-white/[0.04] hover:border-cyan-300/25 hover:bg-white/[0.065]"
          }`}
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-200">
          <Icon className="h-4 w-4" />
        </span>

        <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
          {value}
        </span>

        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-zinc-400 transition ${open ? "rotate-180 text-cyan-200" : ""
            }`}
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#0b101a]/95 p-1.5 shadow-[0_22px_50px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
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
                className={`flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${isSelected
                    ? "bg-cyan-300/15 text-cyan-100"
                    : "text-zinc-300 hover:bg-white/[0.07] hover:text-white"
                  }`}
              >
                <span className="min-w-0 flex-1 truncate">{option}</span>

                {isSelected && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-black">
                    <Check className="h-3 w-3" />
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

const inputClass =
  "h-12 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-zinc-600 transition focus:border-cyan-300/45 focus:bg-cyan-300/[0.035]";

const textareaClass =
  "w-full resize-y rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-600 transition focus:border-cyan-300/45 focus:bg-cyan-300/[0.035]";

const labelClass =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500";

export default function ViralCheck() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [step, setStep] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scoreTone = getScoreTone(result?.viralScore || 0);

  const dimensionItems = useMemo(
    () => [
      {
        label: "Title Strength",
        item: result?.dimensions?.titleStrength,
        icon: PenLine,
      },
      {
        label: "Thumbnail Power",
        item: result?.dimensions?.thumbnailPower,
        icon: Sparkles,
      },
      {
        label: "Curiosity Factor",
        item: result?.dimensions?.curiosityFactor,
        icon: Lightbulb,
      },
      {
        label: "Niche Relevance",
        item: result?.dimensions?.nicheRelevance,
        icon: Target,
      },
      {
        label: "Competition Opportunity",
        item: result?.dimensions?.competition,
        icon: BarChart3,
      },
    ],
    [result]
  );

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleStep1Next = () => {
    const missing = STEP1_REQUIRED.find((field) => !form[field]?.trim());

    if (missing) {
      const labels = {
        niche: "Niche",
        audience: "Target audience",
        topic: "Topic",
        title: "Video title",
      };

      setError(`${labels[missing]} is required.`);
      return;
    }

    setError("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAnalyze = async (event) => {
    event.preventDefault();

    if (!form.thumbnailDescription?.trim()) {
      setError("Thumbnail description is required.");
      return;
    }

    if (!form.description?.trim()) {
      setError("Content description is required.");
      return;
    }

    setError("");

    try {
      setLoading(true);

      const data = await analyzeViralPotential({
        ...form,
        averageViews: form.averageViews ? Number(form.averageViews) : null,
      });

      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Failed to analyze viral potential.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      eyebrow="Pre-publish intelligence"
      title="Viral Check"
      onNewScan={() =>
        navigate("/dashboard", {
          state: {
            forceNewScan: true,
            resetAt: Date.now(),
          },
        })
      }
    >
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.12] via-white/[0.045] to-violet-500/[0.10] p-5 shadow-2xl shadow-cyan-950/20 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
            <Gauge className="h-4 w-4" />
            Before you publish
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Check your video&apos;s viral potential.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
            Add your title, thumbnail description and content idea. Viralo AI
            reviews the packaging and tells you what to improve before you
            publish.
          </p>
        </div>
      </section>

      <div
        className={`mt-6 ${result
            ? "block"
            : "grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(380px,1.05fr)]"
          }`}
      >
        {!result && (
          <Card className="overflow-visible border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                  <WandSparkles className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Add your video details
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    {step === 1
                      ? "Step 1 of 2 — Basic info about your video."
                      : "Step 2 of 2 — Packaging details for AI analysis."}
                  </p>
                </div>
              </div>

              <StepIndicator step={step} />

              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PremiumSelect
                      label="Platform"
                      value={form.platform}
                      onChange={(value) => updateField("platform", value)}
                      options={PLATFORM_OPTIONS}
                      icon={Globe2}
                    />

                    <PremiumSelect
                      label="Content type"
                      value={form.contentType}
                      onChange={(value) => updateField("contentType", value)}
                      options={CONTENT_TYPE_OPTIONS}
                      icon={Video}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block min-w-0">
                      <span className={labelClass}>
                        Niche <span className="text-red-400">*</span>
                      </span>

                      <input
                        value={form.niche}
                        onChange={(event) =>
                          updateField("niche", event.target.value)
                        }
                        placeholder="e.g. AI tools, Finance, Gaming"
                        className={inputClass}
                      />
                    </label>

                    <label className="block min-w-0">
                      <span className={labelClass}>
                        Target audience <span className="text-red-400">*</span>
                      </span>

                      <input
                        value={form.audience}
                        onChange={(event) =>
                          updateField("audience", event.target.value)
                        }
                        placeholder="e.g. New creators, Students"
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className={labelClass}>
                      Video topic <span className="text-red-400">*</span>
                    </span>

                    <input
                      value={form.topic}
                      onChange={(event) =>
                        updateField("topic", event.target.value)
                      }
                      placeholder="e.g. Best free AI tools for student creators"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>
                      Video title <span className="text-red-400">*</span>
                    </span>

                    <input
                      value={form.title}
                      onChange={(event) =>
                        updateField("title", event.target.value)
                      }
                      placeholder="e.g. 5 AI Tools Every Student Creator Needs"
                      className={inputClass}
                    />
                  </label>

                  {error && (
                    <div className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                      {error}
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleStep1Next}
                    className="h-13 w-full rounded-2xl bg-cyan-300 px-5 py-3.5 text-sm font-semibold text-black shadow-[0_14px_32px_rgba(6,182,212,0.22)] transition hover:-translate-y-0.5 hover:bg-cyan-200"
                  >
                    Next — Add packaging details
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {step === 2 && (
                <form onSubmit={handleAnalyze} className="space-y-4">
                  <label className="block">
                    <span className={labelClass}>
                      Thumbnail description <span className="text-red-400">*</span>
                    </span>

                    <textarea
                      value={form.thumbnailDescription}
                      onChange={(event) =>
                        updateField("thumbnailDescription", event.target.value)
                      }
                      placeholder="Describe thumbnail text, face/expression, background, colours and main visual."
                      className={`${textareaClass} min-h-24`}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>
                      Content description / short script{" "}
                      <span className="text-red-400">*</span>
                    </span>

                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        updateField("description", event.target.value)
                      }
                      placeholder="In short, explain what the viewer will learn, see or get from this video."
                      className={`${textareaClass} min-h-28`}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>
                      Opening hook{" "}
                      <span className="normal-case font-normal text-zinc-600">
                        (optional)
                      </span>
                    </span>

                    <textarea
                      value={form.openingHook}
                      onChange={(event) =>
                        updateField("openingHook", event.target.value)
                      }
                      placeholder="e.g. I tested 27 free AI tools so you do not waste a week."
                      className={`${textareaClass} min-h-20`}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <PremiumSelect
                      label="Audience timezone"
                      value={form.timezone}
                      onChange={(value) => updateField("timezone", value)}
                      options={TIMEZONE_OPTIONS}
                      icon={Clock3}
                    />

                    <label className="block min-w-0">
                      <span className="mb-2 flex h-4 min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                        <span className="truncate">Usual average views</span>

                        <span className="normal-case font-normal tracking-normal text-zinc-600">
                          (optional)
                        </span>
                      </span>

                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-violet-200">
                          <Eye className="h-4 w-4" />
                        </span>

                        <input
                          type="number"
                          min="0"
                          value={form.averageViews}
                          onChange={(event) =>
                            updateField("averageViews", event.target.value)
                          }
                          placeholder="e.g. 5000"
                          className="h-12 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 transition focus:border-violet-300/45 focus:bg-violet-300/[0.05]"
                        />
                      </div>
                    </label>
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setError("");
                      }}
                      className="h-13 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-zinc-300 hover:bg-white/[0.08]"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-13 flex-1 rounded-2xl bg-cyan-300 px-5 py-3.5 text-sm font-semibold text-black shadow-[0_14px_32px_rgba(6,182,212,0.22)] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Checking viral potential...
                        </>
                      ) : (
                        <>
                          <Rocket className="h-4 w-4" />
                          Analyze Viral Potential
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        <div className={result ? "min-w-0 w-full" : "min-w-0"}>          {!result ? (
          <Card className="flex min-h-[520px] border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20">
            <CardContent className="flex w-full flex-col items-center justify-center p-8 text-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 shadow-[0_16px_45px_rgba(6,182,212,0.16)]">
                <span className="absolute inset-0 rounded-[1.75rem] bg-cyan-300/15 blur-xl" />
                <Gauge className="relative h-9 w-9" />
              </div>

              <h2 className="mt-6 text-2xl font-semibold text-white">
                Your Viral Check will appear here
              </h2>

              <p className="mt-3 max-w-md text-sm leading-7 text-zinc-500">
                Get a score, five packaging dimensions, better title options,
                thumbnail advice, and a clear improvement plan.
              </p>

              <div className="mt-6 space-y-2 text-left">
                {[
                  "Score 0–100 with confidence level",
                  "5 packaging dimensions",
                  "3 stronger title options",
                  "Thumbnail improvement tips",
                  "Posting window guidance",
                  "View planning range from your usual views",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-xs text-zinc-500"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-cyan-400/60" />
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="relative overflow-hidden border-cyan-300/20 bg-gradient-to-br from-cyan-300/[0.16] via-[#0a111b] to-violet-500/[0.14] shadow-2xl shadow-cyan-950/25">
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />

              <CardContent className="relative flex flex-col items-center gap-6 p-6 text-center sm:flex-row sm:text-left">
                <ScoreRing score={result.viralScore} />

                <div className="min-w-0 flex-1">
                  <div
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${scoreTone.badge}`}
                  >
                    {result.level}
                  </div>

                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    Viral Potential Score
                  </h2>

                  <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-300">
                    {result.summary}
                  </p>

                  <p className="mt-4 text-xs leading-5 text-zinc-500">
                    Confidence:{" "}
                    <span className="text-zinc-300">{result.confidence}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.04]">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="h-5 w-5 text-cyan-200" />
                  <h2 className="text-lg font-semibold text-white">
                    Score breakdown
                  </h2>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {dimensionItems.map((dimension) => (
                    <DimensionCard
                      key={dimension.label}
                      {...dimension}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-white/10 bg-white/[0.04]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    <h2 className="text-lg font-semibold text-white">
                      Why it can work
                    </h2>
                  </div>

                  <div className="mt-4 space-y-3">
                    {result.strengths.map((item, index) => (
                      <div
                        key={`${item}-${index}`}
                        className="flex gap-3 text-sm leading-6 text-zinc-300"
                      >
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        {item}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/[0.04]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5">
                    <CircleAlert className="h-5 w-5 text-amber-300" />
                    <h2 className="text-lg font-semibold text-white">
                      What may reduce clicks
                    </h2>
                  </div>

                  <div className="mt-4 space-y-3">
                    {result.risks.map((item, index) => (
                      <div
                        key={`${item}-${index}`}
                        className="flex gap-3 text-sm leading-6 text-zinc-300"
                      >
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                        {item}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-white/10 bg-white/[0.04]">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2.5">
                  <WandSparkles className="h-5 w-5 text-cyan-200" />
                  <h2 className="text-lg font-semibold text-white">
                    Make it better before you post
                  </h2>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <ImprovementCard
                    title="Topic angle"
                    description={result.improvements.topic}
                    icon={Target}
                  />

                  <ImprovementCard
                    title="Title"
                    description={result.improvements.title}
                    icon={PenLine}
                  />

                  <ImprovementCard
                    title="Thumbnail"
                    description={result.improvements.thumbnail}
                    icon={Sparkles}
                  />

                  <ImprovementCard
                    title="Description / script"
                    description={result.improvements.description}
                    icon={Megaphone}
                  />

                  <ImprovementCard
                    title="Opening hook"
                    description={result.improvements.openingHook}
                    icon={Rocket}
                  />
                </div>

                {result.rewrittenDescription && (
                  <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
                      Better content direction
                    </p>

                    <p className="mt-2 text-sm leading-7 text-zinc-200">
                      {result.rewrittenDescription}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-white/10 bg-white/[0.04]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5">
                    <PenLine className="h-5 w-5 text-violet-200" />
                    <h2 className="text-lg font-semibold text-white">
                      3 stronger title options
                    </h2>
                  </div>

                  <div className="mt-4 space-y-3">
                    {result.betterTitles.map((title, index) => (
                      <div
                        key={`${title}-${index}`}
                        className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-xs font-semibold text-violet-200">
                          {index + 1}
                        </span>

                        <p className="min-w-0 flex-1 text-sm leading-6 text-zinc-200">
                          {title}
                        </p>

                        <CopyTitleButton text={title} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/[0.04]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="h-5 w-5 text-cyan-200" />
                    <h2 className="text-lg font-semibold text-white">
                      Thumbnail improvement tips
                    </h2>
                  </div>

                  <div className="mt-4 space-y-3">
                    {result.thumbnailTips.map((tip, index) => (
                      <div
                        key={`${tip}-${index}`}
                        className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-zinc-300"
                      >
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                        {tip}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-white/10 bg-white/[0.04]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5">
                    <Clock3 className="h-5 w-5 text-cyan-200" />

                    <h2 className="text-lg font-semibold text-white">
                      {result.postingWindow.label}
                    </h2>
                  </div>

                  <p className="mt-4 text-2xl font-semibold text-white">
                    {result.postingWindow.window}
                  </p>

                  <p className="mt-1 text-sm text-cyan-200">
                    {result.postingWindow.timezone}
                  </p>

                  <p className="mt-3 text-xs leading-5 text-zinc-500">
                    {result.postingWindow.note}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/[0.04]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className="h-5 w-5 text-violet-200" />
                    <h2 className="text-lg font-semibold text-white">
                      Estimated views
                    </h2>
                  </div>

                  {result.viewPlanningRange.available ? (
                    <>
                      <p className="mt-4 text-2xl font-semibold text-white">
                        {formatNumber(
                          result.viewPlanningRange.lowerEstimate
                        )}{" "}
                        –{" "}
                        {formatNumber(
                          result.viewPlanningRange.upperEstimate
                        )}
                      </p>

                      <p className="mt-1 text-sm text-violet-200">
                        Based on your usual{" "}
                        {formatNumber(
                          result.viewPlanningRange.basedOnAverageViews
                        )}{" "}
                        views
                      </p>

                      <p className="mt-3 text-xs leading-5 text-zinc-500">
                        {result.viewPlanningRange.note}
                      </p>
                    </>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-zinc-500">
                      {result.viewPlanningRange.message}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-5 text-zinc-500">
              {result.disclaimer}
            </p>

            <Button
              type="button"
              onClick={() => {
                setResult(null);
                setStep(1);
                setForm(INITIAL_FORM);
                setError("");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-zinc-300 hover:bg-white/[0.08]"
            >
              Check another video
            </Button>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}