const {
  getTrendFeedService,
  searchTrendTopicsService,
} = require("../services/trends.service");

const { logActivitySafe } = require("../services/activityLog.service");

const {
  FEATURES,
  runWithFeatureQuota,
} = require("../services/planAccess.service");

function sendServiceError(res, error, fallbackMessage) {
  return res.status(error?.statusCode || 500).json({
    message: error?.message || fallbackMessage,
    ...(error?.code ? { code: error.code } : {}),
    ...(error?.upgrade ? { upgrade: error.upgrade } : {}),
  });
}

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

/*
  Trend feed is free to view.

  Only manual "Search topics" requests consume quota:
  - Free user: 5 lifetime trend searches
  - Paid user: unlimited
  - Admin user: unlimited
*/
async function getTrendFeed(req, res) {
  try {
    const result = await getTrendFeedService({
      userId: req.user.uid,
      query: req.query || {},
    });

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "trends.feed_loaded",
      module: "trends",
      metadata: {
        platform: req.query?.platform || "",
        region: req.query?.region || "",
        itemCount: Array.isArray(result?.items)
          ? result.items.length
          : Array.isArray(result?.sections)
            ? result.sections.reduce(
              (total, section) => total + (section?.items?.length || 0),
              0
            )
            : 0,
      },
      req,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get trend feed error:", error);

    await logActivitySafe({
      userId: req.user?.uid,
      userEmail: req.user?.email,
      eventType: "trends.feed_failed",
      module: "trends",
      status: "failed",
      metadata: {
        message: error?.message || "",
        code: error?.code || "",
      },
      req,
    });

    return sendServiceError(
      res,
      error,
      "Failed to load live trends."
    );
  }
}

/*
  Free user:
  - 5 lifetime manual trend searches

  Paid user:
  - Unlimited manual trend searches

  Admin:
  - Unlimited manual trend searches
*/
async function searchTrendTopics(req, res) {
  try {
    const execution = await runWithFeatureQuota({
      userId: req.user.uid,
      email: req.user.email,
      feature: FEATURES.TREND_SEARCH,
      req,
      operation: () =>
        searchTrendTopicsService({
          userId: req.user.uid,
          payload: req.body || {},
        }),
    });
    const result = execution.result;

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "trends.searched",
      module: "trends",
      metadata: {
        query: req.body?.query || req.body?.search || "",
        platform: req.body?.platform || "",
        region: req.body?.region || "",
        itemCount: Array.isArray(result?.items)
          ? result.items.length
          : 0,
        usage: execution.usage || null,
      },
      req,
    });

    return res.status(200).json(
      withUsageMeta(result, execution.usage)
    );
  } catch (error) {
    console.error("Search trend topics error:", error);

    await logActivitySafe({
      userId: req.user?.uid,
      userEmail: req.user?.email,
      eventType: "trends.search_failed",
      module: "trends",
      status: "failed",
      metadata: {
        message: error?.message || "",
        code: error?.code || "",
      },
      req,
    });

    return sendServiceError(
      res,
      error,
      "Failed to search live trends."
    );
  }
}

module.exports = {
  getTrendFeed,
  searchTrendTopics,
};