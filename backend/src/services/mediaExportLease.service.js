const supabase = require("../config/supabase");

function createHttpError(message, statusCode = 500, code = "") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(Math.floor(parsed), maximum));
}

function getLeaseConfig() {
  return {
    globalLimit: boundedInteger(process.env.MEDIA_EXPORT_GLOBAL_CONCURRENCY, 2, 1, 8),
    perUserLimit: boundedInteger(process.env.MEDIA_EXPORT_PER_USER_CONCURRENCY, 1, 1, 2),
    leaseSeconds: boundedInteger(process.env.MEDIA_EXPORT_LEASE_SECONDS, 1_200, 300, 3_600),
  };
}

async function claimMediaExportLease({ userId }) {
  if (!userId) {
    throw createHttpError("Authenticated user is required.", 401);
  }

  const config = getLeaseConfig();
  const { data, error } = await supabase.rpc("claim_media_export_job", {
    p_user_id: userId,
    p_max_global: config.globalLimit,
    p_max_per_user: config.perUserLimit,
    p_lease_seconds: config.leaseSeconds,
  });

  if (error) {
    const text = String(error.message || "");

    if (text.includes("MEDIA_EXPORT_USER_LIMIT")) {
      throw createHttpError(
        "You already have a media export in progress. Wait for it to finish before starting another one.",
        429,
        "MEDIA_EXPORT_USER_BUSY"
      );
    }

    if (text.includes("MEDIA_EXPORT_GLOBAL_LIMIT")) {
      throw createHttpError(
        "Media exports are busy right now. Please try again in a few minutes.",
        429,
        "MEDIA_EXPORT_BUSY"
      );
    }

    throw createHttpError(
      text || "Could not reserve media export capacity.",
      500,
      "MEDIA_EXPORT_LEASE_ERROR"
    );
  }

  if (!data) {
    throw createHttpError(
      "Could not reserve media export capacity.",
      500,
      "MEDIA_EXPORT_LEASE_ERROR"
    );
  }

  return { id: String(data) };
}

async function releaseMediaExportLease(jobId, status = "completed") {
  if (!jobId) return;

  const nextStatus = status === "failed" ? "failed" : "completed";
  const { error } = await supabase
    .from("media_export_jobs")
    .update({
      status: nextStatus,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("status", "running");

  if (error) {
    console.error("Could not release media export capacity:", error.message || error);
  }
}

module.exports = {
  claimMediaExportLease,
  releaseMediaExportLease,
};
