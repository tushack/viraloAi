const {
  createResearchResult,
  analyzeCompetitorChannelResult,
  createContentPackResult,
  generateThumbnailResult,
} = require("../services/research.service");

const {
  getResearchHistoryService,
} = require("../services/researchHistory.service");

const {
  getDailyNicheIdeasService,
} = require("../services/dailyIdeas.service");

const {
  getTopYouTubeChannelsForNiche,
} = require("../services/youtubeTopChannels.service");

const { logActivitySafe } = require("../services/activityLog.service");

const {
  FEATURES,
  getPlanAccessForUser,
  runWithFeatureQuota,
} = require("../services/planAccess.service");

function withUsageMeta(result, usage) {
  const safeResult =
    result && typeof result === "object" && !Array.isArray(result)
      ? result
      : {};

  return {
    ...safeResult,
    meta: {
      ...(safeResult.meta || {}),
      usage: usage || null,
    },
  };
}

function sendError(res, error, fallbackMessage) {
  const statusCode = Number(error?.statusCode) || 500;

  return res.status(statusCode).json({
    message: error?.message || fallbackMessage,
    ...(error?.code ? { code: error.code } : {}),
    ...(error?.upgrade ? { upgrade: error.upgrade } : {}),
  });
}

/*
  Dashboard explicit search:
  Free user: 5 lifetime
  Paid user: unlimited
  Admin user: unlimited
*/
async function generateResearch(req, res) {
  try {
    const { niche, platform, audience } = req.body || {};

    if (!String(niche || "").trim() || !platform || !audience) {
      return res.status(400).json({
        message: "Niche, platform, and audience are required.",
      });
    }

    const execution = await runWithFeatureQuota({
      userId: req.user.uid,
      email: req.user.email,
      feature: FEATURES.DASHBOARD_SEARCH,
      req,
      operation: () =>
        createResearchResult({
          niche: String(niche).trim(),
          platform,
          audience,
          userId: req.user.uid,
          maxTopics: 20,
        }),
    });

    const result = execution.result;

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "research.generated",
      module: "research",
      entityId: result?.id || "",
      metadata: {
        niche: String(niche).trim(),
        platform,
        audience,
        topicCount: Array.isArray(result?.trendingTopics)
          ? result.trendingTopics.length
          : 0,
        usage: execution.usage || null,
      },
      req,
    });

    return res.status(200).json(withUsageMeta(result, execution.usage));
  } catch (error) {
    console.error("Research error:", error);

    await logActivitySafe({
      userId: req.user?.uid,
      userEmail: req.user?.email,
      eventType: "research.generate_failed",
      module: "research",
      status: "failed",
      metadata: {
        message: error.message,
        code: error.code || "",
      },
      req,
    });

    return sendError(
      res,
      error,
      "Something went wrong while generating research."
    );
  }
}

/*
  Dashboard initial load with empty niche:
  Does not consume quota.

  User-entered niche or manual force-refresh:
  Free user: 5 lifetime
  Paid/admin: unlimited
*/
async function getDailyNicheIdeas(req, res) {
  try {
    const { niche, platform, audience, limit, forceRefresh } = req.query || {};

    const cleanNiche = String(niche || "").trim();
    const shouldConsumeQuota =
      Boolean(cleanNiche) || String(forceRefresh || "").toLowerCase() === "true";

    const loadIdeas = () =>
      getDailyNicheIdeasService({
        userId: req.user.uid,
        niche: cleanNiche,
        platform: platform || "YouTube",
        audience: audience || "New creators",
        limit: Number(limit) || 20,
        forceRefresh: String(forceRefresh || "").toLowerCase() === "true",
      });

    const execution = shouldConsumeQuota
      ? await runWithFeatureQuota({
        userId: req.user.uid,
        email: req.user.email,
        feature: FEATURES.DASHBOARD_SEARCH,
        req,
        operation: loadIdeas,
      })
      : {
        result: await loadIdeas(),
        usage: null,
      };

    const result = execution.result;

    if (result?.source !== "empty") {
      await logActivitySafe({
        userId: req.user.uid,
        userEmail: req.user.email,
        eventType: result?.meta?.isCached
          ? "ai.daily_ideas_viewed"
          : "ai.daily_ideas_generated",
        module: "ai",
        entityId: result?.meta?.latestQueryId || "",
        metadata: {
          niche: result?.niche || cleanNiche,
          platform: result?.platform || platform || "YouTube",
          audience: result?.audience || audience || "New creators",
          source: result?.source || "",
          isCached: Boolean(result?.meta?.isCached),
          topicCount: Array.isArray(result?.trendingTopics)
            ? result.trendingTopics.length
            : 0,
          hookCount: Array.isArray(result?.viralHooks)
            ? result.viralHooks.length
            : 0,
          titleCount: Array.isArray(result?.titleSuggestions)
            ? result.titleSuggestions.length
            : 0,
          usage: execution.usage || null,
        },
        req,
      });
    }

    return res.status(200).json(withUsageMeta(result, execution.usage));
  } catch (error) {
    console.error("Daily niche ideas error:", error);

    await logActivitySafe({
      userId: req.user?.uid,
      userEmail: req.user?.email,
      eventType: "ai.daily_ideas_failed",
      module: "ai",
      status: "failed",
      metadata: {
        message: error.message,
        code: error.code || "",
      },
      req,
    });

    return sendError(
      res,
      error,
      "Failed to fetch dashboard ideas."
    );
  }
}

/*
  Dashboard YouTube channel suggestion cards.
  This is not the competitor-analysis tool and does not consume quota.
*/
async function getTopYouTubeChannels(req, res) {
  try {
    const { niche, limit } = req.query || {};

    if (!String(niche || "").trim()) {
      return res.status(400).json({
        message: "Niche is required to find YouTube channels.",
      });
    }

    const result = await getTopYouTubeChannelsForNiche({
      niche: String(niche).trim(),
      limit: Number(limit) || 4,
    });

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "youtube.top_channels_loaded",
      module: "youtube",
      metadata: {
        niche: String(niche).trim(),
        channelCount: Array.isArray(result?.channels)
          ? result.channels.length
          : 0,
      },
      req,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Top YouTube channels error:", error);

    await logActivitySafe({
      userId: req.user?.uid,
      userEmail: req.user?.email,
      eventType: "youtube.top_channels_failed",
      module: "youtube",
      status: "failed",
      metadata: {
        message: error.message,
      },
      req,
    });

    return sendError(
      res,
      error,
      "Failed to fetch YouTube channels."
    );
  }
}

/*
  Free user:
  Latest 3 history items only.

  Paid/admin:
  Full history access.
*/
async function getResearchHistory(req, res) {
  try {
    const [allHistory, access] = await Promise.all([
      getResearchHistoryService(req.user.uid),
      getPlanAccessForUser({
        userId: req.user.uid,
        email: req.user.email,
      }),
    ]);

    const historyUnlocked = Boolean(access.isAdmin || access.isPaid);

    const items = historyUnlocked
      ? allHistory
      : allHistory.slice(0, 3);

    const lockedCount = historyUnlocked
      ? 0
      : Math.max(allHistory.length - items.length, 0);

    return res.status(200).json({
      items,
      meta: {
        plan: access.plan,
        historyUnlocked,
        totalCount: allHistory.length,
        visibleCount: items.length,
        lockedCount,
        upgradePath: "/payment",
      },
    });
  } catch (error) {
    console.error("Research history error:", error);

    return sendError(
      res,
      error,
      "Failed to fetch research history."
    );
  }
}

/*
  Free user: 5 lifetime competitor analyses.
  Paid/admin: unlimited.
*/
async function analyzeCompetitorChannel(req, res) {
  try {
    const { channelUrl } = req.body || {};
    const cleanChannelUrl = String(channelUrl || "").trim();

    if (!cleanChannelUrl) {
      return res.status(400).json({
        message: "Channel URL, channel ID, or @handle is required.",
      });
    }

    const execution = await runWithFeatureQuota({
      userId: req.user.uid,
      email: req.user.email,
      feature: FEATURES.COMPETITOR_ANALYSIS,
      req,
      operation: () =>
        analyzeCompetitorChannelResult({
          channelUrl: cleanChannelUrl,
        }),
    });
    const result = execution.result;

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "competitor.channel_analyzed",
      module: "competitor",
      metadata: {
        channelUrl: cleanChannelUrl,
        channelName: result?.channel || result?.channelTitle || "",
        usage: execution.usage || null,
      },
      req,
    });

    return res.status(200).json(withUsageMeta(result, execution.usage));
  } catch (error) {
    console.error("Analyze competitor channel error:", error);

    await logActivitySafe({
      userId: req.user?.uid,
      userEmail: req.user?.email,
      eventType: "competitor.channel_analysis_failed",
      module: "competitor",
      status: "failed",
      metadata: {
        message: error.message,
        code: error.code || "",
      },
      req,
    });

    return sendError(
      res,
      error,
      "Failed to analyze competitor channel."
    );
  }
}

async function createContentPack(req, res) {
  try {
    const result = await createContentPackResult(req.body || {});

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "content_pack.generated",
      module: "content_pack",
      metadata: {
        topic: req.body?.topic || result?.topic || "",
        niche: req.body?.niche || "",
        platform: req.body?.platform || "",
      },
      req,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Create content pack error:", error);

    await logActivitySafe({
      userId: req.user?.uid,
      userEmail: req.user?.email,
      eventType: "content_pack.generate_failed",
      module: "content_pack",
      status: "failed",
      metadata: {
        message: error.message,
      },
      req,
    });

    return sendError(
      res,
      error,
      "Failed to create content pack."
    );
  }
}

async function generateThumbnail(req, res) {
  try {
    const { pack, prompt, variant } = req.body || {};

    if (!pack || !pack.topic) {
      return res.status(400).json({
        message: "Content pack with topic is required.",
      });
    }

    const result = await generateThumbnailResult({
      pack,
      prompt,
      variant,
    });

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "thumbnail.generated",
      module: "content_pack",
      metadata: {
        topic: pack.topic,
        variant: variant || "",
      },
      req,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Generate thumbnail error:", error);

    await logActivitySafe({
      userId: req.user?.uid,
      userEmail: req.user?.email,
      eventType: "thumbnail.generate_failed",
      module: "content_pack",
      status: "failed",
      metadata: {
        message: error.message,
      },
      req,
    });

    return sendError(
      res,
      error,
      "Failed to generate AI thumbnail."
    );
  }
}

module.exports = {
  generateResearch,
  getDailyNicheIdeas,
  getTopYouTubeChannels,
  getResearchHistory,
  analyzeCompetitorChannel,
  createContentPack,
  generateThumbnail,
};