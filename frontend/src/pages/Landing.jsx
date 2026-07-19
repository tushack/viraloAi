import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  CircleCheckBig,
  Clock3,
  Compass,
  Gauge,
  Menu,
  Play,
  Rocket,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  WandSparkles,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const navigation = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#workflow" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

const PRO_PLAN_PRICE = "$9";
const PRO_PLAN_PERIOD = "30 days";

function Reveal({ children, className = "", delay = 0, y = 28 }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{
        duration: 0.65,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const workflowSteps = [
  {
    number: "01",
    title: "Discover",
    description:
      "Enter your niche and audience to uncover fresh topics, hooks, titles and live YouTube opportunities.",
    icon: Compass,
  },
  {
    number: "02",
    title: "Validate",
    description:
      "Score your title, thumbnail concept, curiosity, niche relevance and positioning before publishing.",
    icon: Gauge,
  },
  {
    number: "03",
    title: "Create",
    description:
      "Turn a promising topic into a ready-to-record content pack with script, metadata and an AI thumbnail.",
    icon: WandSparkles,
  },
  {
    number: "04",
    title: "Plan",
    description:
      "Save your best ideas and move them through scripting, recording, editing, scheduling and publishing.",
    icon: CalendarDays,
  },
];

const featureCards = [
  {
    eyebrow: "Trend discovery",
    title: "Find content opportunities before they get crowded.",
    description:
      "Filter YouTube and Shorts ideas by region, time range, format and momentum. See useful signals like views, competition, recency and source videos in one place.",
    icon: TrendingUp,
    bullets: [
      "Trending-now and rising-fast signals",
      "Low-competition topic discovery",
      "Save, share or create a full content pack",
    ],
    tone: "cyan",
  },
  {
    eyebrow: "Pre-publish intelligence",
    title: "Know what to improve before you hit Publish.",
    description:
      "Viralo AI reviews your video packaging and gives practical, content-specific feedback instead of generic growth advice.",
    icon: Gauge,
    bullets: [
      "Title and thumbnail strength scoring",
      "Curiosity, audience-fit and competition analysis",
      "Better titles, hooks and thumbnail directions",
    ],
    tone: "violet",
  },
  {
    eyebrow: "Competitor intelligence",
    title: "Understand what is working for other creators.",
    description:
      "Analyze any public YouTube channel using available channel and video data—without manually studying every upload.",
    icon: Users,
    bullets: [
      "Recent average views and upload pace",
      "Top and recent video performance",
      "Public channel momentum and opportunity signals",
    ],
    tone: "blue",
  },
];

const creatorTools = [
  {
    title: "Ready-to-record content packs",
    description:
      "Generate a title, hook, intro script, talking points, CTA, description, tags, hashtags and pinned comment.",
    icon: Rocket,
  },
  {
    title: "AI thumbnail generation",
    description:
      "Create, refine, save and download thumbnail visuals designed around your topic and content angle.",
    icon: Sparkles,
  },
  {
    title: "Content calendar",
    description:
      "Organize ideas across scripting, recording, editing, scheduled and posted stages with reminders.",
    icon: CalendarDays,
  },
  {
    title: "YouTube-ready workflow",
    description:
      "Prepare your title, description, tags, hashtags and thumbnail from one connected creator workspace.",
    icon: Play,
  },
];

const faqs = [
  {
    question: "Does Viralo AI guarantee viral views?",
    answer:
      "No. Viralo AI provides research signals and content-packaging guidance. It helps you make stronger decisions, but no tool can guarantee exact views or virality.",
  },
  {
    question: "Who is Viralo AI built for?",
    answer:
      "It is designed for YouTube-first creators, Shorts creators, marketers, founders, students building personal brands and small creator teams.",
  },
  {
    question: "What data does competitor analysis use?",
    answer:
      "Competitor analysis uses publicly available YouTube channel and video information. Private analytics and hidden data are not accessed.",
  },
  {
    question: "Can I try Viralo AI for free?",
    answer:
      "Yes. The free plan includes starter limits for dashboard research, trend searches, competitor analysis, research history and creator utilities.",
  },
];

function BrandLogo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-200/70 bg-slate-950 shadow-lg shadow-cyan-200/40">
        <video
          src="/logo.mp4"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[138%] w-[138%] -translate-x-1/2 -translate-y-1/2 object-cover"
          autoPlay
          muted
          loop
          playsInline
          controls={false}
          disablePictureInPicture
          aria-label="Viralo AI"
        />
      </div>

      {!compact && (
        <div>
          <p className="text-base font-bold tracking-tight text-slate-950">
            Viralo AI
          </p>
          <p className="text-[11px] font-medium text-slate-500">
            Creator Intelligence
          </p>
        </div>
      )}
    </div>
  );
}

function ProductPreview() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="relative mx-auto w-full max-w-[720px]"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 36, scale: 0.97 }}
      animate={
        shouldReduceMotion
          ? undefined
          : {
            opacity: 1,
            y: [0, -8, 0],
            scale: 1,
          }
      }
      transition={
        shouldReduceMotion
          ? undefined
          : {
            opacity: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
            scale: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
            y: { duration: 5.5, repeat: Infinity, ease: "easeInOut" },
          }
      }
    >
      <div className="absolute -left-10 top-12 h-40 w-40 rounded-full bg-cyan-300/30 blur-3xl" />
      <div className="absolute -right-8 bottom-10 h-44 w-44 rounded-full bg-violet-400/25 blur-3xl" />

      <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 p-2 shadow-[0_35px_90px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/10 sm:p-3">
        <div className="overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#070910]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-medium text-zinc-400">
              Viralo AI Workspace
            </div>
          </div>

          <div className="grid min-h-[470px] grid-cols-[58px_1fr] sm:grid-cols-[170px_1fr]">
            <aside className="border-r border-white/10 bg-white/[0.02] p-3 sm:p-4">
              <div className="mb-7 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300/10">
                  <Sparkles className="h-4 w-4 text-cyan-200" />
                </div>
                <span className="hidden text-sm font-semibold text-white sm:block">
                  Viralo AI
                </span>
              </div>

              <div className="space-y-2">
                {[
                  [BarChart3, "Dashboard", true],
                  [TrendingUp, "Trends"],
                  [Gauge, "Viral Check"],
                  [Users, "Competitors"],
                  [Bookmark, "Saved Ideas"],
                ].map(([Icon, label, active]) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2 rounded-xl p-2.5 text-xs ${active
                        ? "bg-white/[0.08] text-white"
                        : "text-zinc-500"
                      }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:block">{label}</span>
                  </div>
                ))}
              </div>
            </aside>

            <main className="min-w-0 p-4 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
                    Research dashboard
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white sm:text-2xl">
                    Discover your next viral video
                  </h3>
                </div>
                <div className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] text-zinc-400 sm:block">
                  Fresh signals
                </div>
              </div>

              <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/25 p-2 xl:grid-cols-[minmax(0,1fr)_100px_112px]">
                <div className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3">
                  <Search className="h-4 w-4 text-zinc-500" />
                  <span className="truncate text-xs text-zinc-300">
                    AI tools for student creators
                  </span>
                </div>
                <div className="hidden h-11 items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs text-zinc-300 xl:flex">
                  YouTube
                </div>
                <button
                  type="button"
                  tabIndex={-1}
                  className="h-11 w-full whitespace-nowrap rounded-xl bg-cyan-300 px-4 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-200"
                >
                  Find ideas
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["Fresh topics", "18", TrendingUp],
                  ["Viral hooks", "12", Sparkles],
                  ["Competitors", "4", Users],
                ].map(([label, value, Icon]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                  >
                    <Icon className="h-4 w-4 text-cyan-200" />
                    <p className="mt-3 text-lg font-semibold text-white">
                      {value}
                    </p>
                    <p className="text-[10px] text-zinc-500">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {[
                  {
                    title: "5 AI tools every student creator should know",
                    meta: "Rising fast · Low competition",
                    score: "88",
                  },
                  {
                    title: "I tested free AI video tools for seven days",
                    meta: "Fresh this week · Medium competition",
                    score: "81",
                  },
                  {
                    title: "Build a creator workflow without expensive tools",
                    meta: "Trending now · Strong audience fit",
                    score: "76",
                  },
                ].map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={shouldReduceMotion ? false : { opacity: 0, x: 18 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + index * 0.12, duration: 0.45 }}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-100 sm:text-sm">
                        {item.title}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-zinc-500">
                        {item.meta}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-xs font-bold text-cyan-200">
                      {item.score}
                    </div>
                  </motion.div>
                ))}
              </div>
            </main>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-6 left-4 hidden items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-4 py-3 shadow-xl shadow-slate-900/10 backdrop-blur-xl sm:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <CircleCheckBig className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold text-slate-900">Ready-to-record</p>
          <p className="text-[10px] text-slate-500">
            Script, metadata and thumbnail
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function FeatureVisual({ tone }) {
  const gradient = {
    cyan: "from-cyan-100 via-white to-blue-100",
    violet: "from-violet-100 via-white to-fuchsia-100",
    blue: "from-blue-100 via-white to-indigo-100",
  }[tone];

  return (
    <div
      className={`relative min-h-[320px] overflow-hidden rounded-[2rem] border border-white bg-gradient-to-br ${gradient} p-5 shadow-xl shadow-slate-900/5 sm:p-7`}
    >
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/80 blur-3xl" />
      <div className="relative h-full rounded-[1.5rem] border border-slate-900/10 bg-slate-950 p-4 shadow-2xl shadow-slate-900/20">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-300" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Live creator insight
            </span>
          </div>
          <Clock3 className="h-4 w-4 text-zinc-600" />
        </div>

        <div className="mt-4 space-y-3">
          {[92, 82, 73].map((score, index) => (
            <div
              key={score}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="h-2.5 rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${score}%` }}
                      viewport={{ once: true, amount: 0.7 }}
                      transition={{ duration: 0.9, delay: index * 0.12 }}
                    />
                  </div>
                  <div className="mt-3 h-2 w-2/3 rounded-full bg-white/10" />
                </div>
                <span className="text-sm font-bold text-cyan-200">
                  {score}
                </span>
              </div>
              {index === 0 && (
                <div className="mt-4 flex gap-2">
                  <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[9px] font-semibold text-cyan-200">
                    Strong opportunity
                  </span>
                  <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[9px] text-zinc-400">
                    Low competition
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-5 py-5 text-left"
        aria-expanded={open}
      >
        <span className="text-base font-bold text-slate-900 sm:text-lg">
          {item.question}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""
            }`}
        />
      </button>
      {open && (
        <p className="max-w-3xl pb-5 text-sm leading-7 text-slate-600 sm:text-base">
          {item.answer}
        </p>
      )}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { user, authLoading, authModalOpen, setAuthModalOpen } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [postAuthPath, setPostAuthPath] = useState("");
  const [openFaq, setOpenFaq] = useState(0);

  const primaryLabel = useMemo(
    () => (user ? "Open Dashboard" : "Start Creating Free"),
    [user]
  );

  useEffect(() => {
    if (postAuthPath && user) {
      const destination = postAuthPath;
      setPostAuthPath("");
      navigate(destination);
    }
  }, [navigate, postAuthPath, user]);

  useEffect(() => {
    if (postAuthPath && !authLoading && !authModalOpen && !user) {
      setPostAuthPath("");
    }
  }, [authLoading, authModalOpen, postAuthPath, user]);

  const handleOpenWorkspace = () => {
    setMobileMenuOpen(false);

    if (user) {
      navigate("/dashboard");
      return;
    }

    setPostAuthPath("/dashboard");
    setAuthModalOpen(true);
  };

  const handleSignIn = () => {
    setMobileMenuOpen(false);

    if (user) {
      navigate("/dashboard");
      return;
    }

    setPostAuthPath("/dashboard");
    setAuthModalOpen(true);
  };

  const handleViewPro = () => {
    if (user) {
      navigate("/payment");
      return;
    }

    setPostAuthPath("/payment");
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen scroll-smooth overflow-x-hidden bg-[#f7fbff] text-slate-950 selection:bg-cyan-200 selection:text-slate-950">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" aria-label="Viralo AI home">
            <BrandLogo />
          </a>

          <nav className="hidden items-center gap-8 lg:flex">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button
              type="button"
              onClick={handleSignIn}
              className="h-10 rounded-full px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              {user ? "Dashboard" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={handleOpenWorkspace}
              disabled={authLoading}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
            >
              {primaryLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-5 shadow-xl lg:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-2">
              {navigation.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800"
                >
                  {user ? "Dashboard" : "Sign in"}
                </button>
                <button
                  type="button"
                  onClick={handleOpenWorkspace}
                  className="h-11 rounded-xl bg-slate-950 text-sm font-bold text-white"
                >
                  {user ? "Open App" : "Start Free"}
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="top">
        <section className="relative overflow-hidden pb-20 pt-32 sm:pb-28 sm:pt-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(103,232,249,0.34),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(196,181,253,0.32),transparent_30%),linear-gradient(180deg,#f8fdff_0%,#f3f8ff_55%,#ffffff_100%)]" />
          <motion.div
            className="absolute left-1/2 top-24 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-200/30 blur-3xl"
            animate={{ scale: [1, 1.16, 1], opacity: [0.45, 0.75, 0.45] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/75 px-4 py-2 text-xs font-bold text-cyan-950 shadow-sm backdrop-blur-xl">
                <Sparkles className="h-4 w-4 text-cyan-600" />
                AI Creator Intelligence Platform
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.04] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
                Find, validate and build your next winning video.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Viralo AI helps YouTube-first creators discover fresh content
                opportunities, analyze competitor channels, improve titles and
                thumbnails, and generate complete ready-to-record content packs
                from one workspace.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleOpenWorkspace}
                  disabled={authLoading}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-slate-950 px-7 text-sm font-bold text-white shadow-[0_18px_45px_rgba(15,23,42,0.2)] transition hover:-translate-y-1 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
                >
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#workflow"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-7 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-1 hover:border-cyan-200 hover:bg-white"
                >
                  <Play className="h-4 w-4 fill-current" />
                  See how it works
                </a>
              </div>

              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-slate-500 sm:text-sm">
                {["No credit card required", "Free creator plan", "Built for YouTube & Shorts"].map(
                  (item) => (
                    <span key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600" />
                      {item}
                    </span>
                  )
                )}
              </div>
            </Reveal>

            <ProductPreview />
          </div>
        </section>

        <section id="product" className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
                One connected creator workflow
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-5xl">
                Stop guessing what to post next.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
                Replace scattered research, generic AI prompts and disconnected
                creator tools with a clear path from content opportunity to
                publish-ready execution.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {[
                {
                  title: "Research takes too long",
                  description:
                    "Manually checking trends and competitor channels can consume hours before you even start creating.",
                  icon: Search,
                },
                {
                  title: "Ideas feel generic",
                  description:
                    "Most AI generators give broad suggestions without connecting them to audience, competition or platform context.",
                  icon: Target,
                },
                {
                  title: "Execution gets stuck",
                  description:
                    "A saved idea still needs a title, hook, script, thumbnail, metadata and a publishing plan.",
                  icon: Rocket,
                },
              ].map(({ title, description, icon: Icon }) => (
                <article
                  key={title}
                  className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:border-cyan-200 hover:bg-cyan-50/40 hover:shadow-xl hover:shadow-cyan-950/5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-cyan-700 shadow-sm ring-1 ring-slate-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-slate-950">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="workflow"
          className="relative overflow-hidden border-y border-slate-200 bg-[#f7fbff] py-20 sm:py-28"
        >
          <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-cyan-200/35 blur-3xl" />
          <div className="absolute -right-36 bottom-0 h-80 w-80 rounded-full bg-violet-200/35 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
                How Viralo AI works
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-5xl">
                From “What should I post?” to ready-to-publish.
              </h2>
            </div>

            <div className="mt-14 grid gap-4 lg:grid-cols-4">
              {workflowSteps.map(({ number, title, description, icon: Icon }) => (
                <article
                  key={number}
                  className="group rounded-[1.75rem] border border-white bg-white/85 p-6 shadow-lg shadow-slate-900/[0.04] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black tracking-[0.18em] text-slate-400">
                      {number}
                    </span>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800 transition group-hover:bg-slate-950 group-hover:text-cyan-200">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="mt-8 text-xl font-bold text-slate-950">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
                Creator intelligence that leads to action
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-5xl">
                Research less. Create with more clarity.
              </h2>
            </div>

            <div className="mt-16 space-y-20 sm:space-y-28">
              {featureCards.map((feature, index) => {
                const Icon = feature.icon;
                const reverse = index % 2 === 1;

                return (
                  <div
                    key={feature.title}
                    className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
                  >
                    <div className={reverse ? "lg:order-2" : ""}>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-cyan-200 shadow-lg shadow-slate-900/15">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-cyan-700">
                        {feature.eyebrow}
                      </p>
                      <h3 className="mt-4 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">
                        {feature.title}
                      </h3>
                      <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
                        {feature.description}
                      </p>
                      <div className="mt-7 space-y-3">
                        {feature.bullets.map((bullet) => (
                          <div key={bullet} className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                            <p className="text-sm font-semibold leading-6 text-slate-700">
                              {bullet}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={reverse ? "lg:order-1" : ""}>
                      <FeatureVisual tone={feature.tone} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-950 py-20 text-white sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                  Everything after the idea
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] sm:text-5xl">
                  Turn research into content you can actually publish.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-8 text-zinc-400">
                  Viralo AI connects discovery with execution, so your best ideas
                  do not disappear inside notes, bookmarks or unfinished drafts.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {creatorTools.map(({ title, description, icon: Icon }) => (
                  <article
                    key={title}
                    className="rounded-[1.6rem] border border-white/10 bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.07]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-white">
                      {title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-zinc-400">
                      {description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[2.25rem] border border-cyan-100 bg-[radial-gradient(circle_at_top_left,rgba(165,243,252,0.62),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(221,214,254,0.72),transparent_38%),linear-gradient(135deg,#f8fdff,#f8f7ff)] p-6 sm:p-10 lg:p-14">
              <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-800">
                    Built for modern creators
                  </p>
                  <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-5xl">
                    One workspace for creators who want better decisions—not more noise.
                  </h2>
                  <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                    Useful for YouTube creators, Shorts creators, marketers,
                    startup founders, students building personal brands and
                    small content teams.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenWorkspace}
                    className="mt-8 inline-flex h-13 items-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-bold text-white shadow-xl shadow-slate-900/15 transition hover:-translate-y-1 hover:bg-slate-800"
                  >
                    {primaryLabel}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["YouTube creators", Play],
                    ["Shorts creators", Play],
                    ["Marketers", Target],
                    ["Personal brands", Sparkles],
                    ["Startup founders", Rocket],
                    ["Students", Users],
                  ].map(([label, Icon]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/90 bg-white/75 p-4 shadow-sm backdrop-blur-xl"
                    >
                      <Icon className="h-5 w-5 text-cyan-700" />
                      <p className="mt-4 text-sm font-bold text-slate-900">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-y border-slate-200 bg-[#f7fbff] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
                Start free, upgrade when you need more
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-5xl">
                Try the full creator workflow before going Pro.
              </h2>
            </div>

            <div className="mx-auto mt-14 grid max-w-5xl gap-5 lg:grid-cols-2">
              <article className="flex flex-col rounded-[2rem] border border-slate-200 bg-white p-7 shadow-lg shadow-slate-900/[0.04] transition duration-300 hover:-translate-y-2 hover:border-cyan-200 hover:shadow-2xl hover:shadow-cyan-950/[0.08] sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.15em] text-slate-500">
                      Free
                    </p>
                    <h3 className="mt-3 text-4xl font-black text-slate-950">$0</h3>
                    <p className="mt-2 text-sm text-slate-500">Starter access</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-7 space-y-3">
                  {[
                    "5 dashboard searches",
                    "5 trend searches",
                    "5 competitor analyses",
                    "3 YouTube media exports",
                    "Latest 3 research-history items",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-slate-700">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleOpenWorkspace}
                  className="mt-8 h-13 rounded-full bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Start Creating Free
                </button>
              </article>

              <article className="relative flex flex-col overflow-hidden rounded-[2rem] border border-slate-900 bg-slate-950 p-7 text-white shadow-2xl shadow-slate-900/20 transition duration-300 hover:-translate-y-2 hover:shadow-[0_30px_80px_rgba(8,145,178,0.22)] sm:p-8">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400" />
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-300/15 blur-3xl" />
                <div className="absolute right-6 top-6 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
                  Best value
                </div>

                <div className="relative flex items-start justify-between gap-4 pt-10 sm:pt-0">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.15em] text-cyan-300">
                      Pro
                    </p>
                    <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
                      <h3 className="text-5xl font-black tracking-[-0.04em] text-white sm:text-6xl">
                        {PRO_PLAN_PRICE}
                      </h3>
                      <span className="pb-1.5 text-sm font-semibold text-zinc-400">
                        / {PRO_PLAN_PERIOD}
                      </span>
                    </div>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-400">
                      Base USD price. Your final supported currency and applicable tax are shown before checkout.
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
                    <Rocket className="h-5 w-5" />
                  </div>
                </div>

                <div className="relative mt-7 space-y-3">
                  {[
                    "Unlimited creator research",
                    "Unlimited trend searches",
                    "Unlimited competitor analyses",
                    "Unlimited YouTube media exports",
                    "Complete research history",
                    "All current creator tools",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-cyan-300" />
                      <span className="text-sm font-semibold text-zinc-200">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleViewPro}
                  className="relative mt-8 h-13 rounded-full bg-cyan-300 px-6 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
                >
                  View Pro Plan
                </button>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
                Frequently asked
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-5xl">
                Clear answers before you start.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                Viralo AI is designed to support stronger creator decisions—not
                promise outcomes that no platform can guarantee.
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 px-6 sm:px-8">
              {faqs.map((item, index) => (
                <FaqItem
                  key={item.question}
                  item={item}
                  open={openFaq === index}
                  onToggle={() =>
                    setOpenFaq((current) => (current === index ? -1 : index))
                  }
                />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-slate-950 px-6 py-14 text-center text-white shadow-[0_35px_90px_rgba(15,23,42,0.24)] sm:px-10 sm:py-20">
            <div className="absolute left-0 top-0 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />

            <div className="relative mx-auto max-w-3xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
                Your next video starts with a better idea.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-zinc-400">
                Discover the opportunity, validate the packaging and build the
                complete content workflow inside Viralo AI.
              </p>
              <button
                type="button"
                onClick={handleOpenWorkspace}
                className="mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-cyan-300 px-7 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-1 hover:bg-cyan-200"
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500 sm:text-sm">
            <a href="/about" className="hover:text-slate-950">
              About
            </a>
            <a href="/privacy" className="hover:text-slate-950">
              Privacy
            </a>
            <a href="/terms" className="hover:text-slate-950">
              Terms
            </a>
            <a href="/contact" className="hover:text-slate-950">
              Contact
            </a>
          </div>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Viralo AI. Smarter creator decisions, powered by AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
