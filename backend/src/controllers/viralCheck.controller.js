const {
  analyzeViralPotential,
} = require("../services/viralCheck.service");

const { logActivitySafe } = require("../services/activityLog.service");

async function analyzeViralCheck(req, res) {
  try {
    const result = await analyzeViralPotential(req.body || {});

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "viral_check.analyzed",
      module: "viral_check",
      metadata: {
        title: req.body?.title || "",
        platform: req.body?.platform || "",
        score: result?.score || result?.viralScore || null,
      },
      req,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Viral check error:", error.message);

    await logActivitySafe({
      userId: req.user?.uid,
      userEmail: req.user?.email,
      eventType: "viral_check.failed",
      module: "viral_check",
      status: "failed",
      metadata: { message: error.message },
      req,
    });

    return res.status(Number(error.statusCode) || 500).json({
      message: error.message || "Failed to analyze viral potential.",
    });
  }
}

module.exports = {
  analyzeViralCheck,
};
