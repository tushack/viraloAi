import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  Compass,
  Film,
  Gauge,
  GraduationCap,
  Lightbulb,
  Megaphone,
  Play,
  Rocket,
  Sparkles,
  Target,
  UserRound,
  Users,
  WandSparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const ONBOARDING_STEPS = [
  {
    key: "creator",
    title: "Creator Type",
    subtitle: "What best describes you?",
  },
  {
    key: "niche",
    title: "Your Niche",
    subtitle: "What is your content about?",
  },
  {
    key: "platform",
    title: "Platform Preference",
    subtitle: "Where will you create?",
  },
  {
    key: "goals",
    title: "Creator Goals",
    subtitle: "What do you want to achieve?",
  },
  {
    key: "review",
    title: "Final Details",
    subtitle: "Review and finish",
  },
];

const CREATOR_TYPES = [
  {
    value: "youtube-creator",
    title: "YouTube Creator",
    description: "I create videos for YouTube (long-form content)",
    icon: UserRound,
    tone: "cyan",
  },
  {
    value: "shorts-creator",
    title: "Shorts Creator",
    description: "I create short videos for YouTube Shorts",
    icon: Film,
    tone: "violet",
  },
  {
    value: "business-brand",
    title: "Business / Brand",
    description: "I create content for my business or brand",
    icon: Building2,
    tone: "blue",
  },
  {
    value: "educator",
    title: "Educator",
    description: "I create educational or tutorial content",
    icon: GraduationCap,
    tone: "orange",
  },
  {
    value: "influencer",
    title: "Influencer",
    description: "I create content to grow my personal brand",
    icon: Users,
    tone: "green",
  },
  {
    value: "other",
    title: "Other",
    description: "Something else that fits my creator workflow",
    icon: Sparkles,
    tone: "slate",
  },
];

const NICHE_OPTIONS = [
  "AI & Technology",
  "Education",
  "Business",
  "Finance",
  "Career",
  "Marketing",
  "Gaming",
  "Fitness",
  "Lifestyle",
  "Design",
  "Coding",
  "Productivity",
];

const PLATFORM_OPTIONS = [
  {
    value: "youtube",
    title: "YouTube",
    description: "Long-form videos, tutorials, reviews and explainers",
    icon: Play,
  },
  {
    value: "shorts",
    title: "YouTube Shorts",
    description: "Fast hooks, trends and short-form videos",
    icon: Film,
  },
  {
    value: "both",
    title: "YouTube + Shorts",
    description: "Create long-form videos and repurpose them into Shorts",
    icon: BarChart3,
  },
];

const GOAL_OPTIONS = [
  {
    value: "discover",
    title: "Discover fresh topics",
    description: "Find promising content opportunities before they get crowded",
    icon: Compass,
  },
  {
    value: "validate",
    title: "Validate video ideas",
    description: "Improve titles, hooks and thumbnail concepts",
    icon: Gauge,
  },
  {
    value: "competitors",
    title: "Analyze competitors",
    description: "Understand public channel trends and opportunities",
    icon: Target,
  },
  {
    value: "content-pack",
    title: "Create content packs",
    description: "Generate scripts, metadata, hooks and CTAs",
    icon: WandSparkles,
  },
  {
    value: "thumbnails",
    title: "Generate thumbnails",
    description: "Create and organize thumbnail directions",
    icon: Sparkles,
  },
  {
    value: "planning",
    title: "Plan consistently",
    description: "Move ideas through scripting, recording and publishing",
    icon: Rocket,
  },
];

const iconToneClasses = {
  cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
  violet: "border-violet-300/20 bg-violet-400/10 text-violet-200",
  blue: "border-blue-300/20 bg-blue-400/10 text-blue-200",
  orange: "border-orange-300/20 bg-orange-400/10 text-orange-200",
  green: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
  slate: "border-white/10 bg-white/[0.05] text-zinc-300",
};

function BrandLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-950 shadow-lg shadow-cyan-950/30 sm:h-12 sm:w-12">
        <video
          src="/logo.mp4"
          autoPlay
          muted
          loop
          playsInline
          controls={false}
          disablePictureInPicture
          className="pointer-events-none absolute left-1/2 top-1/2 h-[138%] w-[138%] -translate-x-1/2 -translate-y-1/2 object-cover"
          aria-label="Viralo AI"
        />
      </div>

      <div>
        <p className="text-base font-bold tracking-tight text-white sm:text-lg">
          Viralo AI
        </p>
        <p className="text-[10px] font-medium text-zinc-500 sm:text-[11px]">
          Creator Intelligence
        </p>
      </div>
    </div>
  );
}

function SelectionCard({
  selected,
  title,
  description,
  Icon,
  tone = "cyan",
  onClick,
  compact = false,
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      className={`group relative w-full overflow-hidden rounded-2xl border text-left transition ${
        selected
          ? "border-cyan-300/60 bg-cyan-300/[0.075] shadow-[0_18px_45px_rgba(8,145,178,0.12)]"
          : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.045]"
      } ${compact ? "p-4" : "p-4 sm:p-5"}`}
    >
      {selected ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_38%)]" />
      ) : null}

      <div className="relative flex items-start gap-3 sm:gap-4">
        <span
          className={`flex shrink-0 items-center justify-center rounded-2xl border ${
            compact ? "h-10 w-10" : "h-11 w-11 sm:h-12 sm:w-12"
          } ${iconToneClasses[tone] || iconToneClasses.cyan}`}
        >
          <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white sm:text-base">{title}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500 sm:text-[13px] sm:leading-6">
            {description}
          </p>
        </div>

        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
            selected
              ? "border-cyan-300 bg-cyan-300 text-slate-950"
              : "border-white/15 bg-white/[0.02] text-transparent"
          }`}
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      </div>
    </motion.button>
  );
}

function SummaryCard({ label, value, Icon }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-200">
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold leading-6 text-white">{value}</p>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [creatorType, setCreatorType] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("");
  const [customNiche, setCustomNiche] = useState("");
  const [platform, setPlatform] = useState("");
  const [goals, setGoals] = useState([]);
  const [channelUrl, setChannelUrl] = useState("");
  const [error, setError] = useState("");

  const currentStep = ONBOARDING_STEPS[stepIndex];
  const progress = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  const firstName = useMemo(() => {
    const displayName = String(user?.displayName || "").trim();
    return displayName ? displayName.split(/\s+/)[0] : "Creator";
  }, [user?.displayName]);

  const finalNiche = customNiche.trim() || selectedNiche;

  const creatorTypeLabel =
    CREATOR_TYPES.find((item) => item.value === creatorType)?.title ||
    "Not selected";

  const platformLabel =
    PLATFORM_OPTIONS.find((item) => item.value === platform)?.title ||
    "Not selected";

  const selectedGoalLabels = GOAL_OPTIONS.filter((item) =>
    goals.includes(item.value)
  ).map((item) => item.title);

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050711] px-4 text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-zinc-300">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
          Loading your creator setup...
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const validateCurrentStep = () => {
    if (currentStep.key === "creator" && !creatorType) {
      return "Please select the creator type that best describes you.";
    }

    if (currentStep.key === "niche" && !finalNiche) {
      return "Please choose a niche or enter your own niche.";
    }

    if (currentStep.key === "platform" && !platform) {
      return "Please select your primary publishing platform.";
    }

    if (currentStep.key === "goals" && goals.length === 0) {
      return "Please select at least one creator goal.";
    }

    return "";
  };

  const goToNextStep = () => {
    const validationError = validateCurrentStep();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setDirection(1);
    setStepIndex((current) =>
      Math.min(current + 1, ONBOARDING_STEPS.length - 1)
    );
  };

  const goToPreviousStep = () => {
    setError("");
    setDirection(-1);
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const toggleGoal = (goalValue) => {
    setError("");

    setGoals((current) =>
      current.includes(goalValue)
        ? current.filter((item) => item !== goalValue)
        : [...current, goalValue]
    );
  };

  const completeOnboarding = () => {
    const onboardingProfile = {
      creatorType,
      niche: finalNiche,
      platform,
      goals,
      channelUrl: channelUrl.trim(),
      completedAt: new Date().toISOString(),
    };

    const userKey = user.uid;

    localStorage.setItem(
      `viraloCreatorProfile:${userKey}`,
      JSON.stringify(onboardingProfile)
    );

    localStorage.setItem(`viraloOnboardingCompleted:${userKey}`, "true");

    navigate("/dashboard", {
      replace: true,
      state: {
        onboardingProfile,
      },
    });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050711] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(34,211,238,0.13),transparent_28%),radial-gradient(circle_at_92%_14%,rgba(139,92,246,0.14),transparent_30%),linear-gradient(180deg,#050711_0%,#070a13_100%)]" />

      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:46px_46px]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <header className="flex min-h-16 items-center border-b border-white/10 pb-4">
          <BrandLogo />
        </header>

        <div className="flex flex-1 items-center py-5 sm:py-7">
          <div className="grid w-full gap-5 lg:grid-cols-[285px_minmax(0,1fr)] xl:gap-7">
            <aside className="hidden min-h-[710px] rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/25 backdrop-blur-xl lg:flex lg:flex-col">
              <div>
                <h1 className="text-lg font-semibold text-white">
                  Setup your creator profile
                </h1>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  This helps us personalize your Viralo AI experience.
                </p>
              </div>

              <div className="mt-7 space-y-2">
                {ONBOARDING_STEPS.map((step, index) => {
                  const isActive = index === stepIndex;
                  const isComplete = index < stepIndex;

                  return (
                    <div
                      key={step.key}
                      className={`relative flex items-start gap-3 rounded-2xl border p-3.5 transition ${
                        isActive
                          ? "border-cyan-300/20 bg-cyan-300/[0.065]"
                          : "border-transparent"
                      }`}
                    >
                      <span
                        className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                          isComplete
                            ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                            : isActive
                            ? "border-cyan-300 bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/25"
                            : "border-white/10 bg-white/[0.04] text-zinc-600"
                        }`}
                      >
                        {isComplete ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </span>

                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            isActive ? "text-white" : "text-zinc-500"
                          }`}
                        >
                          {step.title}
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
                          {step.subtitle}
                        </p>
                      </div>

                      {index < ONBOARDING_STEPS.length - 1 ? (
                        <span className="absolute left-[31px] top-[51px] h-5 w-px bg-white/10" />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200">
                    <Sparkles className="h-4 w-4" />
                  </span>

                  <p className="text-xs leading-5 text-zinc-500">
                    <strong className="font-semibold text-cyan-200">
                      Just 2 minutes
                    </strong>{" "}
                    to unlock a personalized creator experience.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-600">Progress</span>
                  <span className="font-semibold text-cyan-200">
                    {Math.round(progress)}%
                  </span>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.35 }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400"
                  />
                </div>
              </div>
            </aside>

            <section className="min-w-0">
              <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl lg:hidden">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                      Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {currentStep.title}
                    </p>
                  </div>

                  <span className="text-xs font-semibold text-zinc-500">
                    {Math.round(progress)}%
                  </span>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.35 }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0d16]/95 shadow-2xl shadow-black/30 backdrop-blur-2xl">
                <div className="border-b border-white/10 px-5 py-5 sm:px-8 sm:py-7">
                  <div className="mx-auto max-w-4xl text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                      Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
                    </p>

                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
                      {currentStep.key === "creator" &&
                        `What best describes you, ${firstName}?`}
                      {currentStep.key === "niche" &&
                        "What do you create content about?"}
                      {currentStep.key === "platform" &&
                        "Where do you publish most often?"}
                      {currentStep.key === "goals" &&
                        "What do you want Viralo AI to help with?"}
                      {currentStep.key === "review" &&
                        "Your creator workspace is ready."}
                    </h2>

                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
                      {currentStep.key === "creator" &&
                        "Choose the option that fits you best. You can update these preferences later."}
                      {currentStep.key === "niche" &&
                        "Your niche will personalize trend discovery, ideas and creator suggestions."}
                      {currentStep.key === "platform" &&
                        "Choose the platform that is most important for your current content workflow."}
                      {currentStep.key === "goals" &&
                        "Select all the outcomes you want your personalized dashboard to support."}
                      {currentStep.key === "review" &&
                        "Review your preferences, add an optional channel link and continue to Dashboard."}
                    </p>
                  </div>
                </div>

                <div className="min-h-[470px] p-4 sm:p-6 lg:p-8">
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={currentStep.key}
                      custom={direction}
                      initial={{
                        opacity: 0,
                        x: direction > 0 ? 36 : -36,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      exit={{
                        opacity: 0,
                        x: direction > 0 ? -36 : 36,
                      }}
                      transition={{
                        duration: 0.28,
                        ease: "easeOut",
                      }}
                    >
                      {currentStep.key === "creator" ? (
                        <div className="mx-auto grid max-w-4xl gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {CREATOR_TYPES.map((item) => (
                            <SelectionCard
                              key={item.value}
                              selected={creatorType === item.value}
                              title={item.title}
                              description={item.description}
                              Icon={item.icon}
                              tone={item.tone}
                              onClick={() => {
                                setCreatorType(item.value);
                                setError("");
                              }}
                            />
                          ))}
                        </div>
                      ) : null}

                      {currentStep.key === "niche" ? (
                        <div className="mx-auto max-w-4xl">
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                            {NICHE_OPTIONS.map((nicheOption) => {
                              const isSelected =
                                selectedNiche === nicheOption &&
                                !customNiche.trim();

                              return (
                                <motion.button
                                  key={nicheOption}
                                  type="button"
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => {
                                    setSelectedNiche(nicheOption);
                                    setCustomNiche("");
                                    setError("");
                                  }}
                                  className={`min-h-12 rounded-xl border px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                                    isSelected
                                      ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100"
                                      : "border-white/10 bg-white/[0.025] text-zinc-400 hover:border-white/20 hover:text-white"
                                  }`}
                                >
                                  {nicheOption}
                                </motion.button>
                              );
                            })}
                          </div>

                          <div className="my-6 flex items-center gap-3">
                            <div className="h-px flex-1 bg-white/10" />
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                              Or enter your own niche
                            </span>
                            <div className="h-px flex-1 bg-white/10" />
                          </div>

                          <label className="block">
                            <span className="mb-2 block text-xs font-semibold text-zinc-400">
                              Custom niche
                            </span>

                            <div className="relative">
                              <Lightbulb className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

                              <input
                                value={customNiche}
                                onChange={(event) => {
                                  setCustomNiche(event.target.value);
                                  setError("");
                                }}
                                maxLength={80}
                                placeholder="Example: AI tools for student creators"
                                className="h-14 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-cyan-300/40"
                              />
                            </div>
                          </label>
                        </div>
                      ) : null}

                      {currentStep.key === "platform" ? (
                        <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-3">
                          {PLATFORM_OPTIONS.map((item) => (
                            <SelectionCard
                              key={item.value}
                              selected={platform === item.value}
                              title={item.title}
                              description={item.description}
                              Icon={item.icon}
                              tone={
                                item.value === "youtube"
                                  ? "cyan"
                                  : item.value === "shorts"
                                  ? "violet"
                                  : "blue"
                              }
                              onClick={() => {
                                setPlatform(item.value);
                                setError("");
                              }}
                            />
                          ))}
                        </div>
                      ) : null}

                      {currentStep.key === "goals" ? (
                        <div className="mx-auto max-w-4xl">
                          <div className="mb-4 flex items-center justify-between gap-4">
                            <p className="text-xs text-zinc-600">
                              Select one or more goals
                            </p>

                            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-zinc-400">
                              {goals.length} selected
                            </span>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            {GOAL_OPTIONS.map((item) => (
                              <SelectionCard
                                key={item.value}
                                selected={goals.includes(item.value)}
                                title={item.title}
                                description={item.description}
                                Icon={item.icon}
                                compact
                                onClick={() => toggleGoal(item.value)}
                              />
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {currentStep.key === "review" ? (
                        <div className="mx-auto grid max-w-4xl gap-5 xl:grid-cols-[1fr_0.86fr]">
                          <div className="space-y-3">
                            <SummaryCard
                              label="Creator profile"
                              value={creatorTypeLabel}
                              Icon={UserRound}
                            />

                            <SummaryCard
                              label="Primary niche"
                              value={finalNiche}
                              Icon={Lightbulb}
                            />

                            <SummaryCard
                              label="Platform"
                              value={platformLabel}
                              Icon={Play}
                            />

                            <SummaryCard
                              label="Creator goals"
                              value={selectedGoalLabels.join(", ")}
                              Icon={Target}
                            />
                          </div>

                          <div className="rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_42%),rgba(255,255,255,0.025)] p-5 sm:p-6">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-200">
                              <Play className="h-5 w-5" />
                            </span>

                            <h3 className="mt-5 text-lg font-semibold text-white">
                              Add your YouTube channel
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-zinc-500">
                              Optional. This can make channel and competitor
                              workflows faster later.
                            </p>

                            <input
                              value={channelUrl}
                              onChange={(event) =>
                                setChannelUrl(event.target.value)
                              }
                              placeholder="https://youtube.com/@yourchannel"
                              className="mt-5 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-cyan-300/40"
                            />

                            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.04] p-4">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />

                              <p className="text-xs leading-5 text-zinc-500">
                                Your choices will personalize Viralo AI and can be
                                updated later from Settings.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </motion.div>
                  </AnimatePresence>

                  {error ? (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mx-auto mt-5 max-w-4xl rounded-2xl border border-red-400/15 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200"
                    >
                      {error}
                    </motion.p>
                  ) : null}
                </div>

                <div className="border-t border-white/10 px-4 py-4 sm:px-6 lg:px-8">
                  <div className="mx-auto flex max-w-4xl flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={goToPreviousStep}
                      disabled={stepIndex === 0}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>

                    <div className="hidden items-center gap-2 text-xs text-zinc-600 md:flex">
                      <CheckCircle2 className="h-4 w-4 text-cyan-300/70" />
                      Your preferences are private and editable later.
                    </div>

                    {currentStep.key === "review" ? (
                      <motion.button
                        type="button"
                        onClick={completeOnboarding}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.985 }}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-500 px-6 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30"
                      >
                        Open my dashboard
                        <ArrowRight className="h-4 w-4" />
                      </motion.button>
                    ) : (
                      <motion.button
                        type="button"
                        onClick={goToNextStep}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.985 }}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-500 px-6 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30"
                      >
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-center text-[11px] leading-5 text-zinc-700">
                Complete all five steps to access your personalized Viralo AI
                dashboard.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
