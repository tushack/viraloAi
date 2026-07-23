import React from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Hash,
  Image,
  Loader2,
  MessageCircle,
  Play,
  PlayCircle,
  Sparkles,
  TrendingUp,
  Wand2,
  Bookmark,
  BookmarkCheck,
  Trash2,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import {
  getSavedThumbnailsByTopic,
  saveGeneratedThumbnail,
} from "../lib/thumbnailStore";
import { applyYoutubeReadyKit, generateAiThumbnail } from "../lib/api";

const SAVED_CONTENT_PACK_LIMIT = 30;

function getSavedContentPackKey(userId) {
  return userId
    ? `viraloSavedContentPacks:${userId}`
    : "viraloSavedContentPacks:guest";
}

function getPackId(rawPack) {
  return [
    rawPack?.contentPackId,
    rawPack?.id,
    rawPack?.generatedAt,
    rawPack?.topic,
    rawPack?.videoTitle,
  ]
    .filter(Boolean)
    .join("|");
}

function loadSavedContentPacks(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSavedContentPacks(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function createSavedPackItem(rawPack) {
  const id = getPackId(rawPack) || `pack-${Date.now()}`;

  return {
    id,
    topic: rawPack?.topic || "Untitled content pack",
    videoTitle:
      rawPack?.videoTitle ||
      rawPack?.title ||
      rawPack?.topic ||
      "Untitled content pack",
    growth: rawPack?.growth || "0%",
    competition: rawPack?.competition || "Medium",
    platform: rawPack?.platform || "YouTube",
    createdAt: rawPack?.generatedAt || new Date().toISOString(),
    pack: rawPack,
  };
}

function formatSavedPackTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recent";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CopyButton({ text }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
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
      type="button"
      onClick={handleCopy}
      className="h-8 shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs text-zinc-200 hover:bg-white/[0.1]"
    >
      <Copy className="h-3.5 w-3.5" />
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function SectionCard({ icon: Icon, title, children, copyText }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/10">
              <Icon className="h-5 w-5 text-cyan-300" />
            </div>

            <h2 className="text-base font-semibold text-white">{title}</h2>
          </div>

          {copyText && <CopyButton text={copyText} />}
        </div>

        <div className="text-sm leading-7 text-zinc-300">{children}</div>
      </CardContent>
    </Card>
  );
}

function createSlugWords(text) {
  return String(text || "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 5);
}

function limitText(text, length) {
  const value = String(text || "");

  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length).trim()}...`;
}

function getCompetitionAngle(competition) {
  const value = String(competition || "").toLowerCase();

  if (value === "low") {
    return {
      title: "Low Competition Opportunity",
      thumbnailHeadline: "LOW COMPETITION",
      posterTitle: "Create This Before Everyone Finds It",
      hookPrefix: "Most creators are still ignoring this topic",
      badgeColorText: "Low Competition",
    };
  }

  if (value === "high") {
    return {
      title: "High Demand Topic",
      thumbnailHeadline: "TRENDING NOW",
      posterTitle: "This Topic Is Already Exploding",
      hookPrefix: "This topic is already getting attention",
      badgeColorText: "High Demand",
    };
  }

  return {
    title: "Fast Growing Topic",
    thumbnailHeadline: "VIRAL IDEA",
    posterTitle: "This Idea Can Grow Fast",
    hookPrefix: "This topic is gaining momentum",
    badgeColorText: "Growing Fast",
  };
}

function buildDynamicPack(rawPack) {
  const topic = rawPack?.topic || "Viral YouTube Topic";
  const growth = rawPack?.growth || "+72%";
  const competition = rawPack?.competition || "Medium";
  const insight =
    rawPack?.insight ||
    "This topic has strong creator demand and can perform well with the right content angle.";

  const niche = rawPack?.niche || "content creators";
  const platform = rawPack?.platform || "YouTube";
  const audience = rawPack?.audience || "New creators";

  const angle = getCompetitionAngle(competition);
  const shortTopic = limitText(topic, 46);
  const thumbnailTopic = limitText(topic, 36);
  const hashtagWords = createSlugWords(topic);

  const videoTitle =
    rawPack?.videoTitle ||
    `I Found a ${angle.title} for ${platform}: "${shortTopic}"`;

  const hook =
    rawPack?.hook ||
    `${angle.hookPrefix}: "${topic}". It is showing ${growth} growth with ${String(
      competition
    ).toLowerCase()} competition, which makes it a strong opportunity for ${audience.toLowerCase()}.`;

  const introScript =
    rawPack?.introScript ||
    `In this video, I am going to break down "${topic}" and explain why it is becoming a strong ${platform} content opportunity. This topic is showing ${growth} growth with ${String(
      competition
    ).toLowerCase()} competition. The key insight is: ${insight} I will also show how ${audience.toLowerCase()} can use this topic, what angle to take, and how to make the first few seconds more engaging.`;

  const talkingPoints =
    rawPack?.talkingPoints?.length > 0
      ? rawPack.talkingPoints
      : [
        `Trend signal: "${topic}" is showing ${growth} growth right now.`,
        `Competition level is ${competition}, so the content angle needs to be clear and specific.`,
        `Audience fit: this topic can work well for ${audience.toLowerCase()}.`,
        `Main insight: ${insight}`,
        `Best execution: use a strong hook, simple explanation, and a practical example for ${platform}.`,
      ];

  const cta =
    rawPack?.cta ||
    `If you want more ${niche} ideas like this, save this video and follow for more ${platform} growth strategies.`;

  const description =
    rawPack?.description ||
    `In this video, we explore "${topic}" and why it is becoming a strong content opportunity for ${audience.toLowerCase()} on ${platform}.\n\nThis topic is showing ${growth} growth with ${String(
      competition
    ).toLowerCase()} competition.\n\nKey insight: ${insight}\n\nYou will learn the best content angle, hook, talking points, and execution strategy to create a better video around this topic.`;

  const tags =
    rawPack?.tags?.length > 0
      ? rawPack.tags
      : [
        topic,
        niche,
        platform,
        audience,
        `${platform} growth`,
        `${niche} ideas`,
        "viral video ideas",
        "content strategy",
        "creator tips",
        "trend analysis",
      ];

  const hashtags =
    rawPack?.hashtags?.length > 0
      ? rawPack.hashtags
      : [
        ...hashtagWords.map((word) => `#${word}`),
        "#YouTubeGrowth",
        "#ContentCreator",
        "#ViralIdeas",
        "#ContentStrategy",
      ];

  const pinnedComment =
    rawPack?.pinnedComment ||
    `Would you create a video on "${topic}"? Comment your angle below.`;

  return {
    ...rawPack,

    topic,
    growth,
    competition,
    insight,
    niche,
    platform,
    audience,

    videoTitle,

    thumbnailHeadline: rawPack?.thumbnailHeadline || angle.thumbnailHeadline,
    thumbnailMainText: rawPack?.thumbnailMainText || thumbnailTopic,
    thumbnailSubText:
      rawPack?.thumbnailSubText ||
      `${growth} growth • ${competition} competition`,
    thumbnailBadge: rawPack?.thumbnailBadge || angle.badgeColorText,

    posterTitle: rawPack?.posterTitle || angle.posterTitle,
    posterSubtitle:
      rawPack?.posterSubtitle ||
      `${shortTopic} is showing ${growth} growth with ${String(
        competition
      ).toLowerCase()} competition for ${audience.toLowerCase()} on ${platform}.`,
    posterMainText: rawPack?.posterMainText || shortTopic,
    posterBadge:
      rawPack?.posterBadge || `${growth} Growth • ${competition} Competition`,

    hook,
    introScript,
    talkingPoints,
    cta,
    description,
    tags,
    hashtags,
    pinnedComment,
  };
}

function ThumbnailPreview({ pack, imageUrl, loading = false }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#111827] via-[#172554] to-[#581c87] shadow-2xl shadow-cyan-950/40">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={pack?.topic || "AI thumbnail"}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.35),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.35),transparent_35%)]" />
      )}

      {!imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 backdrop-blur-md">
            <Sparkles className="h-12 w-12 text-cyan-200" />
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 text-center backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-200" />
          <p className="text-sm font-semibold text-white">
            Generating AI banner image...
          </p>
        </div>
      )}
    </div>
  );
}


function SavedContentPackSidebar({
  sidebarOpen,
  setSidebarOpen,
  savedPacks,
  selectedPackId,
  onSelect,
  onClear,
  onBack,
}) {
  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[82vw] max-w-72 flex-col border-r border-white/10 bg-[#0b0c11]/95 p-4 backdrop-blur-2xl transition-transform duration-300 sm:p-5 lg:w-72 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Saved Packs
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              Content History
            </h2>
          </div>

          <button
            type="button"
            className="rounded-xl p-2 text-zinc-400 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Saved by you
          </p>

          {savedPacks.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/20"
            >
              <Trash2 className="mr-1 inline h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {savedPacks.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/10">
                <FileText className="h-5 w-5 text-cyan-300" />
              </div>

              <p className="text-sm font-semibold text-white">
                No saved packs
              </p>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Click Save Pack on any content pack. Only saved packs will
                appear here.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {savedPacks.map((item) => {
                const isActive = item.id === selectedPackId;

                return (
                  <motion.button
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -28, scale: 0.94 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{
                      opacity: 0,
                      x: -120,
                      scale: 0.82,
                      rotate: -8,
                      transition: { duration: 0.24 },
                    }}
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      setSidebarOpen(false);
                    }}
                    className={`w-full rounded-3xl border p-4 text-left transition ${isActive
                      ? "border-cyan-300/30 bg-cyan-300/10"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                      }`}
                  >
                    <p className="line-clamp-2 text-sm font-semibold leading-6 text-white">
                      {item.videoTitle}
                    </p>

                    <p className="mt-2 line-clamp-1 text-xs text-zinc-500">
                      {item.topic}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-200">
                        {item.growth}
                      </span>

                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-400">
                        {item.platform}
                      </span>
                    </div>

                    <p className="mt-3 text-[11px] text-zinc-600">
                      {formatSavedPackTime(item.createdAt)}
                    </p>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}

function SavePackAnimation({ action }) {
  if (!action) return null;

  const isRemove = action === "remove";

  return (
    <AnimatePresence>
      <motion.div
        key={action}
        initial={
          isRemove
            ? { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }
            : { opacity: 0, scale: 0.9, x: 180, y: 20, rotate: 4 }
        }
        animate={
          isRemove
            ? { opacity: 0, scale: 0.7, x: -180, y: -20, rotate: -12 }
            : { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }
        }
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: isRemove ? 0.42 : 0.36, ease: "easeOut" }}
        className={`fixed left-5 top-24 z-[10000] flex items-center gap-3 rounded-3xl border px-4 py-3 shadow-2xl backdrop-blur-2xl ${isRemove
          ? "border-red-300/20 bg-red-500/10 text-red-100 shadow-red-950/30"
          : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-cyan-950/30"
          }`}
      >
        {isRemove ? (
          <Trash2 className="h-4 w-4" />
        ) : (
          <BookmarkCheck className="h-4 w-4" />
        )}

        <span className="text-sm font-semibold">
          {isRemove ? "Removed from saved" : "Saved to sidebar"}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

export default function ContentPack() {
  const navigate = useNavigate();
  const location = useLocation();

  const incomingPack = location.state?.contentPack;
  const { user } = useAuth();

  const savedPackKey = React.useMemo(
    () => getSavedContentPackKey(user?.uid),
    [user?.uid]
  );

  const [savedPacks, setSavedPacks] = React.useState(() =>
    loadSavedContentPacks(savedPackKey)
  );

  const [selectedRawPack, setSelectedRawPack] = React.useState(
    incomingPack || null
  );

  const [saveAnimation, setSaveAnimation] = React.useState("");

  React.useEffect(() => {
    const items = loadSavedContentPacks(savedPackKey);
    setSavedPacks(items);

    if (!incomingPack && !selectedRawPack && items[0]?.pack) {
      setSelectedRawPack(items[0].pack);
    }
  }, [savedPackKey]);

  React.useEffect(() => {
    if (incomingPack) {
      setSelectedRawPack(incomingPack);
    }
  }, [incomingPack]);

  const rawPack = selectedRawPack || savedPacks[0]?.pack || null;
  const pack = rawPack ? buildDynamicPack(rawPack) : null;
  const activePackId = rawPack ? getPackId(rawPack) : "";
  const isCurrentPackSaved = savedPacks.some((item) => item.id === activePackId);

  const autoThumbnailStartedRef = React.useRef(false);

  const [aiThumbnails, setAiThumbnails] = React.useState([]);
  const [thumbnailLoading, setThumbnailLoading] = React.useState(false);
  const [thumbnailError, setThumbnailError] = React.useState("");
  const [thumbnailPrompt, setThumbnailPrompt] = React.useState("");

  const activeThumbnail = aiThumbnails[0] || null;

  const [savedThumbnails, setSavedThumbnails] = React.useState([]);
  const [savedThumbnailsLoading, setSavedThumbnailsLoading] =
    React.useState(false);
  const [fullscreenImage, setFullscreenImage] = React.useState("");
  const [thumbnailSaveStatus, setThumbnailSaveStatus] = React.useState("");
  const [thumbnailSaveError, setThumbnailSaveError] = React.useState("");
  const [savingThumbnailId, setSavingThumbnailId] = React.useState("");

  const [youtubeVideoUrl, setYoutubeVideoUrl] = React.useState("");
  const [youtubeApplying, setYoutubeApplying] = React.useState(false);
  const [youtubeKitMessage, setYoutubeKitMessage] = React.useState("");
  const [youtubeKitError, setYoutubeKitError] = React.useState("");


  const readyKitTitle = pack?.videoTitle || pack?.title || "";

  const readyKitDescription =
    pack?.description ||
    `${pack?.insight || ""}\n\n${Array.isArray(pack?.hashtags) ? pack.hashtags.join(" ") : ""
    }`;

  const readyKitHashtags = Array.isArray(pack?.hashtags)
    ? pack.hashtags.join(" ")
    : pack?.hashtags || "";

  const readyKitTags = Array.isArray(pack?.tags)
    ? pack.tags
    : Array.isArray(pack?.keywords)
      ? pack.keywords
      : [];

  const readyKitThumbnailUrl =
    activeThumbnail?.imageUrl || savedThumbnails?.[0]?.imageUrl || "";

  const loadSavedThumbnails = React.useCallback(async () => {
    if (!user?.uid || !pack?.topic) {
      setSavedThumbnails([]);
      return;
    }

    try {
      setSavedThumbnailsLoading(true);

      const items = await getSavedThumbnailsByTopic({
        userId: user.uid,
        topic: pack.topic,
      });

      setSavedThumbnails(items);
    } catch (error) {
      console.error("Load saved thumbnails error:", error);
    } finally {
      setSavedThumbnailsLoading(false);
    }
  }, [user?.uid, pack?.topic]);

  React.useEffect(() => {
    loadSavedThumbnails();
  }, [loadSavedThumbnails]);

  React.useEffect(() => {
    autoThumbnailStartedRef.current = false;

    setAiThumbnails([]);
    setThumbnailError("");
    setThumbnailPrompt("");
    setThumbnailSaveStatus("");
    setThumbnailSaveError("");
    setSavingThumbnailId("");
    setFullscreenImage("");
  }, [activePackId]);

  const handleGenerateThumbnail = React.useCallback(
    async ({ auto = false } = {}) => {
      if (!pack || thumbnailLoading) {
        return;
      }

      setThumbnailLoading(true);
      setThumbnailError("");
      setThumbnailSaveStatus("");
      setThumbnailSaveError("");

      try {
        const result = await generateAiThumbnail({
          pack,
          prompt: auto ? "" : thumbnailPrompt,
          variant: aiThumbnails.length + 1,
        });

        const generatedThumbnail = {
          ...result,
          localId: `${Date.now()}-${aiThumbnails.length + 1}`,
          isSaved: false,
        };

        setAiThumbnails((current) =>
          [generatedThumbnail, ...current].slice(0, 6)
        );
      } catch (err) {
        setThumbnailError(err.message || "Could not generate a thumbnail.");
      } finally {
        setThumbnailLoading(false);
      }
    },
    [aiThumbnails.length, pack, thumbnailLoading, thumbnailPrompt]
  );

  const handleSaveThumbnail = React.useCallback(
    async (thumbnail) => {
      if (!user?.uid) {
        setThumbnailSaveError("Please login first to save thumbnail.");
        return;
      }

      if (!pack || !thumbnail?.imageUrl) {
        setThumbnailSaveError("Thumbnail image not found.");
        return;
      }

      if (thumbnail.isSaved) {
        setThumbnailSaveStatus("This thumbnail is already saved.");
        return;
      }

      try {
        const saveId =
          thumbnail.localId || thumbnail.generatedAt || thumbnail.imageUrl;

        setSavingThumbnailId(saveId);
        setThumbnailSaveStatus(
          "Saving selected image to Cloudinary and Firestore..."
        );
        setThumbnailSaveError("");

        const savedItem = await saveGeneratedThumbnail({
          userId: user.uid,
          topic: pack.topic,
          imageDataUrl: thumbnail.imageUrl,
          prompt: thumbnailPrompt || "",
          model: thumbnail.model || "",
          videoTitle: pack.videoTitle || "",
        });

        setSavedThumbnails((current) => [savedItem, ...current]);

        setAiThumbnails((current) =>
          current.map((item) =>
            item.imageUrl === thumbnail.imageUrl
              ? {
                ...item,
                isSaved: true,
                savedId: savedItem.id,
              }
              : item
          )
        );

        setThumbnailSaveStatus("Selected thumbnail saved successfully.");
      } catch (saveError) {
        console.error("Save thumbnail error:", saveError);

        setThumbnailSaveStatus("");
        setThumbnailSaveError(
          saveError.message || "Thumbnail Cloudinary/Firestore me save nahi hua."
        );
      } finally {
        setSavingThumbnailId("");
      }
    },
    [pack, thumbnailPrompt, user?.uid]
  );

  const handleApplyYoutubeKit = async () => {
    if (!youtubeVideoUrl.trim()) {
      setYoutubeKitError("Please paste your uploaded YouTube video URL.");
      return;
    }

    try {
      setYoutubeApplying(true);
      setYoutubeKitMessage("");
      setYoutubeKitError("");

      const finalDescription = `${readyKitDescription}\n\n${readyKitHashtags}`;

      const result = await applyYoutubeReadyKit({
        videoUrl: youtubeVideoUrl,
        title: readyKitTitle,
        description: finalDescription,
        tags: readyKitTags,
        thumbnailUrl: readyKitThumbnailUrl,
      });

      setYoutubeKitMessage("YouTube video metadata updated successfully.");

      if (result?.result?.studioUrl) {
        window.open(result.result.studioUrl, "_blank");
      }
    } catch (error) {
      setYoutubeKitError(error.message || "Failed to apply YouTube Ready Kit.");
    } finally {
      setYoutubeApplying(false);
    }
  };

  React.useEffect(() => {
    if (!pack || autoThumbnailStartedRef.current) {
      return;
    }

    autoThumbnailStartedRef.current = true;
    handleGenerateThumbnail({ auto: true });
  }, [handleGenerateThumbnail, pack]);


  const handleToggleSavePack = () => {
    if (!rawPack) return;

    const currentId = getPackId(rawPack);

    if (isCurrentPackSaved) {
      const next = savedPacks.filter((item) => item.id !== currentId);

      setSaveAnimation("remove");
      setSavedPacks(next);
      persistSavedContentPacks(savedPackKey, next);

      setTimeout(() => {
        setSaveAnimation("");
      }, 500);

      return;
    }

    const savedItem = createSavedPackItem(rawPack);
    const next = [
      savedItem,
      ...savedPacks.filter((item) => item.id !== savedItem.id),
    ].slice(0, SAVED_CONTENT_PACK_LIMIT);

    setSaveAnimation("save");
    setSavedPacks(next);
    persistSavedContentPacks(savedPackKey, next);

    setTimeout(() => {
      setSaveAnimation("");
    }, 900);
  };

  const handleSelectSavedPack = (item) => {
    if (!item?.pack) return;

    setSelectedRawPack(item.pack);

    navigate("/content-pack", {
      replace: true,
      state: {
        contentPack: item.pack,
      },
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleClearSavedPacks = async () => {
    const confirmed = window.appConfirm
      ? await window.appConfirm({
        type: "delete",
        title: "Clear saved packs?",
        message: "This will remove all saved content packs from this device.",
        confirmText: "Yes, Clear",
        cancelText: "Cancel",
      })
      : window.confirm("Clear saved content packs?");

    if (!confirmed) return;

    setSaveAnimation("remove");
    setSavedPacks([]);
    persistSavedContentPacks(savedPackKey, []);

    setTimeout(() => {
      setSaveAnimation("");
    }, 500);
  };

  const handleDownloadThumbnail = () => {
    const imageUrl = readyKitThumbnailUrl || activeThumbnail?.imageUrl;

    if (!imageUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `${String(pack.topic || "ai-thumbnail")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-thumbnail.${activeThumbnail?.outputFormat || "jpeg"
      }`;

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!pack) {
    return (
      <DashboardLayout
        eyebrow="Content Pack"
        title="No content pack found"
        customSidebar={({ sidebarOpen, setSidebarOpen }) => (
          <SavedContentPackSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            savedPacks={savedPacks}
            selectedPackId={activePackId}
            onSelect={handleSelectSavedPack}
            onClear={handleClearSavedPacks}
            onBack={() => navigate("/dashboard")}

          />
        )}
      >        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-xl border-white/10 bg-white/[0.04]">
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300/10">
                <FileText className="h-7 w-7 text-cyan-300" />
              </div>

              <h1 className="text-2xl font-semibold text-white">
                Content pack not available
              </h1>

              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Please go back to the dashboard and click Create Now on any
                trending topic.
              </p>

              <Button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="mt-6 rounded-full bg-cyan-300 px-6 text-sm font-semibold text-black hover:bg-cyan-200"
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      eyebrow="Content Pack"
      title="Ready-to-record content"
      customSidebar={({ sidebarOpen, setSidebarOpen }) => (
        <SavedContentPackSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          savedPacks={savedPacks}
          selectedPackId={activePackId}
          onSelect={handleSelectSavedPack}
          onClear={handleClearSavedPacks}
          onBack={() => navigate("/dashboard")}

        />
      )}
    >

      <SavePackAnimation action={saveAnimation} />
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          onClick={handleToggleSavePack}
          disabled={!rawPack}
          className={`h-10 w-fit rounded-full px-4 text-sm font-semibold ${isCurrentPackSaved
            ? "border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20"
            : "border border-white/10 bg-white/[0.05] text-zinc-200 hover:bg-white/[0.1]"
            }`}
        >
          {isCurrentPackSaved ? (
            <BookmarkCheck className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}

          {isCurrentPackSaved ? "Saved" : "Save Pack"}
        </Button>

      </div>

      <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-200">
              <Sparkles className="h-4 w-4" />
              Dynamic Premium Content Pack
            </div>

            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              {pack.videoTitle}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
              This page is generated from the selected topic data: growth,
              competition, insight, niche, platform and audience.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-zinc-500">Growth</p>
                <p className="mt-1 text-lg font-semibold text-cyan-200">
                  {pack.growth}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-zinc-500">Competition</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {pack.competition}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-zinc-500">Platform</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {pack.platform}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={handleDownloadThumbnail}
                disabled={!readyKitThumbnailUrl}
                className="rounded-full bg-cyan-300 px-5 text-sm font-semibold text-black hover:bg-cyan-200"
              >
                <Download className="h-4 w-4" />
                Download AI Thumbnail
              </Button>

              <CopyButton text={pack.videoTitle} />
            </div>
          </div>

          <ThumbnailPreview
            pack={pack}
            imageUrl={activeThumbnail?.imageUrl}
            loading={thumbnailLoading && !activeThumbnail}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-5">
          <SectionCard
            icon={PlayCircle}
            title="Video Title"
            copyText={pack.videoTitle}
          >
            <p className="text-lg font-semibold text-white">
              {pack.videoTitle}
            </p>
          </SectionCard>

          <SectionCard icon={Image} title="AI Thumbnail Picture">
            <div className="space-y-4">
              <ThumbnailPreview
                pack={pack}
                imageUrl={activeThumbnail?.imageUrl}
                loading={thumbnailLoading}
              />

              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Optional custom thumbnail direction
                </label>

                <textarea
                  value={thumbnailPrompt}
                  onChange={(event) => setThumbnailPrompt(event.target.value)}
                  placeholder="Example: neon blue dashboard background, shocked creator face, abstract analytics, no text, clean empty space..."
                  className="mt-3 min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/40"
                />

                {thumbnailError && (
                  <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs leading-6 text-red-200">
                    {thumbnailError}
                  </p>
                )}

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    onClick={() => handleGenerateThumbnail()}
                    disabled={thumbnailLoading}
                    className="h-11 rounded-full bg-cyan-300 px-5 text-sm font-semibold text-black hover:bg-cyan-200 sm:w-fit"
                  >
                    {thumbnailLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    {thumbnailLoading ? "Creating..." : "Create AI Thumbnail"}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleSaveThumbnail(activeThumbnail)}
                    disabled={
                      !activeThumbnail?.imageUrl ||
                      activeThumbnail?.isSaved ||
                      savingThumbnailId ===
                      (activeThumbnail?.localId ||
                        activeThumbnail?.generatedAt ||
                        activeThumbnail?.imageUrl)
                    }
                    className="h-11 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-5 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/20 sm:w-fit"
                  >
                    {savingThumbnailId ===
                      (activeThumbnail?.localId ||
                        activeThumbnail?.generatedAt ||
                        activeThumbnail?.imageUrl) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {activeThumbnail?.isSaved ? "Saved" : "Save Thumbnail"}
                  </Button>

                  <Button
                    type="button"
                    onClick={handleDownloadThumbnail}
                    disabled={!readyKitThumbnailUrl}
                    className="h-11 rounded-full border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-zinc-200 hover:bg-white/[0.1] sm:w-fit"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>

              {thumbnailSaveStatus && (
                <p className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xs leading-6 text-emerald-200">
                  {thumbnailSaveStatus}
                </p>
              )}

              {thumbnailSaveError && (
                <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs leading-6 text-red-200">
                  {thumbnailSaveError}
                </p>
              )}

              {aiThumbnails.length > 1 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {aiThumbnails.map((thumbnail, index) => {
                    const itemSaveId =
                      thumbnail.localId ||
                      thumbnail.generatedAt ||
                      thumbnail.imageUrl;

                    return (
                      <div
                        key={`${itemSaveId}-${index}`}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-left transition hover:border-cyan-300/30"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setAiThumbnails((current) => [
                              thumbnail,
                              ...current.filter((item) => item !== thumbnail),
                            ])
                          }
                          className="block w-full overflow-hidden rounded-xl"
                        >
                          <img
                            src={thumbnail.imageUrl}
                            alt={`AI thumbnail variant ${index + 1}`}
                            className="aspect-video w-full rounded-xl object-cover"
                          />
                        </button>

                        <div className="mt-2 flex items-center justify-between gap-2 px-1">
                          <p className="text-xs text-zinc-500">
                            Variant {index + 1}
                          </p>

                          <button
                            type="button"
                            onClick={() => handleSaveThumbnail(thumbnail)}
                            disabled={
                              thumbnail.isSaved ||
                              savingThumbnailId === itemSaveId
                            }
                            className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingThumbnailId === itemSaveId
                              ? "Saving..."
                              : thumbnail.isSaved
                                ? "Saved"
                                : "Save"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard icon={TrendingUp} title="Dynamic Insight">
            <p>{pack.insight}</p>
          </SectionCard>

          <SectionCard icon={FileText} title="Hook" copyText={pack.hook}>
            <p>{pack.hook}</p>
          </SectionCard>

          <SectionCard
            icon={FileText}
            title="Intro Script"
            copyText={pack.introScript}
          >
            <p>{pack.introScript}</p>
          </SectionCard>

          <SectionCard
            icon={CheckCircle2}
            title="5 Talking Points"
            copyText={pack.talkingPoints.join("\n")}
          >
            <div className="space-y-3">
              {pack.talkingPoints.map((point, index) => (
                <div
                  key={`${point}-${index}`}
                  className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-xs font-semibold text-cyan-200">
                    {index + 1}
                  </div>

                  <p>{point}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard icon={MessageCircle} title="CTA" copyText={pack.cta}>
            <p>{pack.cta}</p>
          </SectionCard>

          <SectionCard
            icon={FileText}
            title="Description"
            copyText={pack.description}
          >
            <p className="whitespace-pre-line">{pack.description}</p>
          </SectionCard>

          <SectionCard icon={Hash} title="Tags" copyText={pack.tags.join(", ")}>
            <div className="flex flex-wrap gap-2">
              {pack.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            icon={Hash}
            title="Hashtags"
            copyText={pack.hashtags.join(" ")}
          >
            <div className="flex flex-wrap gap-2">
              {pack.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            icon={MessageCircle}
            title="Pinned Comment"
            copyText={pack.pinnedComment}
          >
            <p>{pack.pinnedComment}</p>
          </SectionCard>
        </div>

        <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <SectionCard icon={Image} title="Poster Picture">
            <div className="space-y-4">
              {savedThumbnailsLoading ? (
                <div className="flex min-h-[240px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04]">
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
                    Loading saved images...
                  </div>
                </div>
              ) : savedThumbnails.length === 0 ? (
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-center">
                  <h3 className="text-base font-semibold text-white">
                    No saved images found
                  </h3>

                  <p className="mt-2 text-sm text-zinc-500">
                    Save a thumbnail and it will show here.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-3">
                    {savedThumbnails.slice(0, 5).map((item, index) => (
                      <button
                        key={item.id || index}
                        type="button"
                        onClick={() => setFullscreenImage(item.imageUrl)}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-left transition hover:border-cyan-300/30"
                      >
                        <img
                          src={item.imageUrl}
                          alt={`Saved thumbnail ${index + 1}`}
                          className="aspect-video w-full rounded-xl object-cover"
                        />

                        <div className="mt-2 flex items-center justify-between gap-2 px-1">
                          <p className="text-xs text-zinc-500">
                            {index === 0
                              ? "Latest saved image"
                              : `Saved image ${index + 1}`}
                          </p>

                          <p className="text-xs text-cyan-300">Open</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {savedThumbnails.length > 5 && (
                    <Button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/saved-thumbnails?topic=${encodeURIComponent(
                            pack.topic
                          )}`
                        )
                      }
                      className="h-11 w-full rounded-full bg-cyan-300 px-5 text-sm font-semibold text-black hover:bg-cyan-200"
                    >
                      View All Saved Images ({savedThumbnails.length})
                    </Button>
                  )}

                  <p className="text-xs text-zinc-500">
                    Click any saved image to open full screen.
                  </p>
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard icon={Play} title="YouTube Ready Kit">
            <div className="space-y-4">
              <p className="text-sm leading-6 text-zinc-500">
                First upload your video manually on YouTube Studio. Then paste
                the uploaded video URL here. ViralMind will apply the generated
                title, description, tags, and thumbnail automatically.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={() =>
                    window.open("https://studio.youtube.com", "_blank")
                  }
                  className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-zinc-200"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open YouTube Studio
                </Button>

                <Button
                  type="button"
                  onClick={handleDownloadThumbnail}
                  disabled={!readyKitThumbnailUrl}
                  className="h-11 rounded-full border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-zinc-200 hover:bg-white/[0.1]"
                >
                  <Download className="h-4 w-4" />
                  Download Thumbnail
                </Button>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Generated Title
                </p>

                <p className="mt-2 text-sm font-semibold leading-6 text-white">
                  {readyKitTitle || "No title generated"}
                </p>

                <div className="mt-3">
                  <CopyButton text={readyKitTitle} />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Generated Description
                </p>

                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-300">
                  {readyKitDescription || "No description generated"}
                </p>

                <div className="mt-3">
                  <CopyButton
                    text={`${readyKitDescription}\n\n${readyKitHashtags}`}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Tags
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {readyKitTags.length > 0 ? (
                    readyKitTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">No tags generated</p>
                  )}
                </div>
              </div>

              <label className="block">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Uploaded YouTube Video URL
                </p>

                <input
                  value={youtubeVideoUrl}
                  onChange={(event) => setYoutubeVideoUrl(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/40"
                />
              </label>

              <Button
                type="button"
                onClick={handleApplyYoutubeKit}
                disabled={youtubeApplying}
                className="h-11 w-full rounded-full bg-cyan-300 px-5 text-sm font-semibold text-black hover:bg-cyan-200"
              >
                {youtubeApplying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {youtubeApplying
                  ? "Applying..."
                  : "Apply Metadata to Uploaded Video"}
              </Button>

              {youtubeKitMessage && (
                <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                  {youtubeKitMessage}
                </p>
              )}

              {youtubeKitError && (
                <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {youtubeKitError}
                </p>
              )}
            </div>
          </SectionCard>

          <Card className="border-cyan-300/15 bg-cyan-300/[0.04]">
            <CardContent className="p-5">
              <h3 className="text-base font-semibold text-cyan-100">
                Creator Tip
              </h3>

              <p className="mt-2 text-sm leading-7 text-cyan-100/80">
                Use the hook in the first 3 seconds, thumbnail as the main
                visual, and pinned comment to improve engagement.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setFullscreenImage("")}
        >
          <button
            type="button"
            onClick={() => setFullscreenImage("")}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="max-h-[92vh] max-w-[96vw] overflow-hidden rounded-3xl border border-white/10 bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fullscreenImage}
              alt="Full screen thumbnail preview"
              className="max-h-[92vh] max-w-[96vw] object-contain"
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}