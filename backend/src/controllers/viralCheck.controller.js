const {
  analyzeViralPotential,
} = require("../services/viralCheck.service");

const {
  logActivitySafe,
} = require("../services/activityLog.service");

const {
  FEATURES,
  runWithFeatureQuota,
} = require("../services/planAccess.service");

function withUsageMeta(result, usage) {
  const safeResult =
    result &&
    typeof result === "object" &&
    !Array.isArray(result)
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
  Viral Check access:

  Free user:
  5 successful Viral Checks for lifetime.

  Active Pro user:
  Unlimited Viral Checks during active subscription.

  Active Admin:
  Unlimited Viral Checks.

  If AI analysis fails, the reserved quota is automatically restored
  by runWithFeatureQuota().
*/
async function analyzeViralCheck(req, res) {
  try {
    const execution = await runWithFeatureQuota({
      userId: req.user.uid,
      email: req.user.email,
      feature: FEATURES.VIRAL_CHECK,
      req,

      operation: () =>
        analyzeViralPotential(req.body || {}),
    });

    const result = execution.result;

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "viral_check.analyzed",
      module: "viral_check",

      metadata: {
        title: req.body?.title || "",
        platform: req.body?.platform || "",
        score:
          result?.score ||
          result?.viralScore ||
          null,
        usage: execution.usage || null,
      },

      req,
    });

    return res
      .status(200)
      .json(
        withUsageMeta(
          result,
          execution.usage
        )
      );
  } catch (error) {
    console.error(
      "Viral check error:",
      error.message
    );

    await logActivitySafe({
      userId: req.user?.uid,
      userEmail: req.user?.email,
      eventType: "viral_check.failed",
      module: "viral_check",
      status: "failed",

      metadata: {
        message: error.message,
        code: error.code || "",
      },

      req,
    });

    const statusCode =
      Number(error.statusCode) || 500;

    return res
      .status(statusCode)
      .json({
        message:
          error.message ||
          "Failed to analyze viral potential.",

        ...(error.code
          ? {
              code: error.code,
            }
          : {}),

        ...(error.upgrade
          ? {
              upgrade: error.upgrade,
            }
          : {}),
      });
  }
}

module.exports = {
  analyzeViralCheck,
};