const crypto = require("crypto");
const supabase = require("../config/supabase");

const DEVICE_COOKIE_NAME = "viralo_device_id";
const DEVICE_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 180;

const HIGH_COST_FEATURES = new Set(["youtube_download", "media_export"]);

const FEATURE_RULES = {
  dashboard_search: {
    requireVerifiedEmail: true,
    buckets: [
      { type: "email_lifetime", source: "email", window: "lifetime", limit: 5 },
      { type: "device_lifetime", source: "device", window: "lifetime", limit: 8 },
      { type: "ip_daily", source: "ip", window: "daily", limit: 25 },
    ],
  },

  trend_search: {
    requireVerifiedEmail: true,
    buckets: [
      { type: "email_lifetime", source: "email", window: "lifetime", limit: 5 },
      { type: "device_lifetime", source: "device", window: "lifetime", limit: 8 },
      { type: "ip_daily", source: "ip", window: "daily", limit: 25 },
    ],
  },

  competitor_analysis: {
    requireVerifiedEmail: true,
    buckets: [
      { type: "email_lifetime", source: "email", window: "lifetime", limit: 5 },
      { type: "device_lifetime", source: "device", window: "lifetime", limit: 6 },
      { type: "ip_daily", source: "ip", window: "daily", limit: 20 },
    ],
  },

  youtube_download: {
    requireVerifiedEmail: true,
    requirePhoneForHighCost: true,
    buckets: [
      { type: "email_lifetime", source: "email", window: "lifetime", limit: 3 },
      { type: "device_lifetime", source: "device", window: "lifetime", limit: 3 },
      { type: "ip_daily", source: "ip", window: "daily", limit: 10 },
    ],
  },

  media_export: {
    requireVerifiedEmail: true,
    requirePhoneForHighCost: true,
    buckets: [
      { type: "email_lifetime", source: "email", window: "lifetime", limit: 3 },
      { type: "device_lifetime", source: "device", window: "lifetime", limit: 3 },
      { type: "ip_daily", source: "ip", window: "daily", limit: 10 },
    ],
  },
};

function createHttpError(message, statusCode = 400, code = "", extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function getSecret() {
  const secret = String(process.env.ABUSE_QUOTA_SECRET || "").trim();

  if (secret.length < 32) {
    throw createHttpError(
      "ABUSE_QUOTA_SECRET is not configured.",
      500,
      "ABUSE_QUOTA_CONFIGURATION_ERROR"
    );
  }

  return secret;
}

function hashValue(value) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(String(value || ""))
    .digest("hex");
}

function cleanText(value, maxLength = 500) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function parseCookies(req) {
  const header = String(req?.headers?.cookie || "");
  const parsed = {};

  header.split(";").forEach((item) => {
    const separator = item.indexOf("=");
    if (separator <= 0) return;

    const key = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();

    try {
      parsed[key] = decodeURIComponent(value);
    } catch {
      parsed[key] = value;
    }
  });

  return parsed;
}

function getOrCreateDeviceId(req) {
  const cookies = parseCookies(req);
  const existing = cleanText(cookies[DEVICE_COOKIE_NAME], 200);

  if (/^[a-f0-9]{64}$/i.test(existing)) {
    return existing;
  }

  const nextDeviceId = crypto.randomBytes(32).toString("hex");
  const res = req?.res;

  if (res?.cookie) {
    res.cookie(DEVICE_COOKIE_NAME, nextDeviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DEVICE_COOKIE_MAX_AGE_MS,
    });
  }

  return nextDeviceId;
}

function getClientIp(req) {
  const trustProxyHeaders = ["true", "1", "yes"].includes(
    String(process.env.ABUSE_TRUST_PROXY_HEADERS || "")
      .trim()
      .toLowerCase()
  );

  if (trustProxyHeaders) {
    const cloudflareIp = cleanText(req?.headers?.["cf-connecting-ip"], 120);
    if (cloudflareIp) return cloudflareIp;

    const forwardedFor = cleanText(req?.headers?.["x-forwarded-for"], 300);
    if (forwardedFor) return forwardedFor.split(",")[0].trim();
  }

  return cleanText(req?.ip || req?.socket?.remoteAddress || "unknown", 120);
}

function getWindowKey(windowType) {
  const now = new Date();

  if (windowType === "daily") {
    return now.toISOString().slice(0, 10);
  }

  if (windowType === "monthly") {
    return now.toISOString().slice(0, 7);
  }

  return "lifetime";
}

function shouldRequirePhoneForHighCost() {
  return ["true", "1", "yes"].includes(
    String(process.env.ABUSE_REQUIRE_PHONE_FOR_HIGH_COST || "false")
      .trim()
      .toLowerCase()
  );
}

function getContext(req, { userId, email }) {
  const normalizedEmail = cleanText(email, 320).toLowerCase();
  const ip = getClientIp(req);
  const deviceId = getOrCreateDeviceId(req);

  return {
    userId: cleanText(userId, 220),
    email: normalizedEmail,
    emailVerified: req?.user?.emailVerified === true,
    phoneVerified: req?.user?.phoneVerified === true,
    emailHash: normalizedEmail ? hashValue(`email:${normalizedEmail}`) : "",
    ipHash: hashValue(`ip:${ip}`),
    deviceHash: hashValue(`device:${deviceId}`),
  };
}

function getBucketKey(bucket, context) {
  if (bucket.source === "email") return context.emailHash;
  if (bucket.source === "ip") return context.ipHash;
  if (bucket.source === "device") return context.deviceHash;

  return "";
}

function assertIdentityRequirements({ feature, access, context }) {
  if (access?.isAdmin || access?.isPaid) {
    return;
  }

  const rule = FEATURE_RULES[feature];
  if (!rule) return;

  if (rule.requireVerifiedEmail && !context.emailVerified) {
    throw createHttpError(
      "Please verify your email before using free credits.",
      403,
      "EMAIL_VERIFICATION_REQUIRED"
    );
  }

  if (
    HIGH_COST_FEATURES.has(feature) &&
    rule.requirePhoneForHighCost &&
    shouldRequirePhoneForHighCost() &&
    !context.phoneVerified
  ) {
    throw createHttpError(
      "Please verify your phone number before using this high-cost free feature.",
      403,
      "PHONE_VERIFICATION_REQUIRED"
    );
  }
}

function createQuotaBlockedError({ feature, bucket, result }) {
  return createHttpError(
    "Free quota limit reached for this device or network. Please upgrade or try again later.",
    429,
    "ANTI_ABUSE_QUOTA_REACHED",
    {
      upgrade: {
        feature,
        bucketType: bucket.type,
        limit: bucket.limit,
        usedCount: Number(result?.used_count || bucket.limit),
        remaining: Number(result?.remaining || 0),
        upgradePath: "/payment",
      },
    }
  );
}

async function consumeBucket({ feature, bucket, bucketKey }) {
  const windowKey = getWindowKey(bucket.window);

  const { data, error } = await supabase.rpc("consume_abuse_quota", {
    p_feature: feature,
    p_bucket_type: bucket.type,
    p_bucket_key: bucketKey,
    p_window_key: windowKey,
    p_limit: bucket.limit,
  });

  if (error) {
    throw createHttpError(
      error.message || "Could not verify anti-abuse quota.",
      500,
      "ANTI_ABUSE_QUOTA_ERROR"
    );
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result?.allowed) {
    throw createQuotaBlockedError({ feature, bucket, result });
  }

  return {
    feature,
    bucketType: bucket.type,
    bucketKey,
    windowKey,
    limit: bucket.limit,
    usedCount: Number(result.used_count || 0),
    remaining: Number(result.remaining || 0),
  };
}

async function releaseBucket(reservation) {
  if (!reservation?.feature || !reservation?.bucketType) return;

  const { error } = await supabase.rpc("release_abuse_quota", {
    p_feature: reservation.feature,
    p_bucket_type: reservation.bucketType,
    p_bucket_key: reservation.bucketKey,
    p_window_key: reservation.windowKey,
  });

  if (error) {
    console.error("Could not release anti-abuse quota:", error.message);
  }
}

async function reserveAbuseQuotas({ userId, email, feature, req, access }) {
  const rule = FEATURE_RULES[feature];

  if (!rule || access?.isAdmin || access?.isPaid) {
    return {
      reservations: [],
      usage: null,
    };
  }

  const context = getContext(req, { userId, email });
  assertIdentityRequirements({ feature, access, context });

  const reservations = [];

  try {
    for (const bucket of rule.buckets) {
      const bucketKey = getBucketKey(bucket, context);
      if (!bucketKey) continue;

      const reservation = await consumeBucket({
        feature,
        bucket,
        bucketKey,
      });

      reservations.push(reservation);
    }

    return {
      reservations,
      usage: {
        enabled: true,
        buckets: reservations.map((item) => ({
          type: item.bucketType,
          limit: item.limit,
          usedCount: item.usedCount,
          remaining: item.remaining,
          windowKey: item.windowKey,
        })),
      },
    };
  } catch (error) {
    await releaseAbuseQuotas(reservations);
    throw error;
  }
}

async function releaseAbuseQuotas(reservations = []) {
  for (const reservation of reservations) {
    await releaseBucket(reservation);
  }
}

module.exports = {
  reserveAbuseQuotas,
  releaseAbuseQuotas,
};