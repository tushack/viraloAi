const supabase = require("../config/supabase");

const {
  getActiveAdminForFirebaseUser,
} = require("./adminRbac.service");


const {
  reserveAbuseQuotas,
  releaseAbuseQuotas,
} = require("./abuseQuota.service");

const FEATURES = Object.freeze({
  DASHBOARD_SEARCH: "dashboard_search",
  TREND_SEARCH: "trend_search",
  COMPETITOR_ANALYSIS: "competitor_analysis",
  YOUTUBE_DOWNLOAD: "youtube_download",
  MEDIA_EXPORT: "media_export",
});

const FREE_LIMITS = Object.freeze({
  [FEATURES.DASHBOARD_SEARCH]: 5,
  [FEATURES.TREND_SEARCH]: 5,
  [FEATURES.COMPETITOR_ANALYSIS]: 5,
  [FEATURES.YOUTUBE_DOWNLOAD]: 3,
  [FEATURES.MEDIA_EXPORT]: 3,
});

const PAID_LIMITS = Object.freeze({
  [FEATURES.DASHBOARD_SEARCH]: 100,
});

const FEATURE_LABELS = Object.freeze({
  [FEATURES.DASHBOARD_SEARCH]: "dashboard searches",
  [FEATURES.TREND_SEARCH]: "trend searches",
  [FEATURES.COMPETITOR_ANALYSIS]: "competitor analyses",
  [FEATURES.YOUTUBE_DOWNLOAD]: "YouTube downloads",
  [FEATURES.MEDIA_EXPORT]: "media exports",
});

function createHttpError(message, statusCode = 400, code = "", extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  Object.assign(error, extra);
  return error;
}

async function getSubscription(userId) {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw createHttpError(
      error.message || "Could not load subscription details.",
      500
    );
  }

  return data || null;
}

function isActivePaidSubscription(subscription) {
  if (!subscription) return false;

  const plan = String(subscription.plan || "").trim().toLowerCase();
  const status = String(subscription.status || "").trim().toLowerCase();

  if (plan !== "pro" || status !== "active") {
    return false;
  }

  // Keep null valid for a deliberately configured lifetime plan.
  if (!subscription.current_period_end) {
    return true;
  }

  const expiresAt = new Date(subscription.current_period_end).getTime();

  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

async function getPlanAccessForUser({ userId, email }) {
  const adminAccount = await getActiveAdminForFirebaseUser({
    userId,
    email,
  });

  if (adminAccount) {
    return {
      plan: "admin",
      isAdmin: true,
      isPaid: true,
      subscription: null,
    };
  }

  const subscription = await getSubscription(userId);

  if (isActivePaidSubscription(subscription)) {
    return {
      plan: "pro",
      isAdmin: false,
      isPaid: true,
      subscription,
    };
  }

  return {
    plan: "free",
    isAdmin: false,
    isPaid: false,
    subscription,
  };
}

function getQuotaConfig(access, feature) {
  if (!FEATURE_LABELS[feature]) {
    throw createHttpError("Unknown feature quota.", 500);
  }

  // Paid users and active RBAC admins have full unlimited access.
  if (access.isAdmin) {
    return {
      unlimited: true,
      limit: null,
      windowKey: null,
      resetAt: null,
    };
  }

  const paidLimit = access.isPaid ? PAID_LIMITS[feature] : null;

  if (paidLimit) {
    return {
      unlimited: false,
      limit: paidLimit,
      windowKey: "lifetime",
      resetAt: null,
      paidLimited: true,
    };
  }

  if (access.isPaid) {
    return {
      unlimited: true,
      limit: null,
      windowKey: null,
      resetAt: null,
    };
  }

  return {
    unlimited: false,
    limit: FREE_LIMITS[feature],
    windowKey: "lifetime",
    resetAt: null,
  };
}

function createUpgradeRequiredError({ feature, quota, usedCount, remaining }) {
  const label = FEATURE_LABELS[feature];

  return createHttpError(
    `You have used all ${quota.limit} free ${label}. Upgrade now to unlock unlimited access.`,
    402,
    "UPGRADE_REQUIRED",
    {
      upgrade: {
        feature,
        label,
        plan: "free",
        limit: quota.limit,
        usedCount,
        remaining,
        unlimitedAfterUpgrade: true,
        upgradePath: "/payment",
      },
    }
  );
}

async function reserveFeatureQuota({ userId, email, feature, req }) {
  const access = await getPlanAccessForUser({ userId, email });
  const quota = getQuotaConfig(access, feature);

  if (quota.unlimited) {
    return {
      access,
      reservation: null,
      usage: {
        feature,
        plan: access.plan,
        unlimited: true,
        limit: null,
        usedCount: null,
        remaining: null,
        antiAbuse: null,
      },
    };
  }

  const { data, error } = await supabase.rpc("consume_plan_quota", {
    p_user_id: userId,
    p_feature: feature,
    p_window_key: quota.windowKey,
    p_limit: quota.limit,
  });

  if (error) {
    throw createHttpError(
      error.message || "Could not verify your usage limit.",
      500
    );
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result?.allowed) {
    throw createUpgradeRequiredError({
      feature,
      quota,
      usedCount: Number(result?.used_count || quota.limit),
      remaining: Number(result?.remaining || 0),
    });
  }

  const reservation = {
    userId,
    feature,
    windowKey: quota.windowKey,
    abuseReservations: [],
  };

  let antiAbuseUsage = null;

  try {
    const antiAbuse = await reserveAbuseQuotas({
      userId,
      email,
      feature,
      req,
      access,
    });

    reservation.abuseReservations = antiAbuse.reservations || [];
    antiAbuseUsage = antiAbuse.usage || null;
  } catch (error) {
    await releaseFeatureQuota(reservation);
    throw error;
  }

  return {
    access,
    reservation,
    usage: {
      feature,
      plan: access.plan,
      unlimited: false,
      limit: quota.limit,
      usedCount: Number(result.used_count || 0),
      remaining: Number(result.remaining || 0),
      antiAbuse: antiAbuseUsage,
    },
  };
}

async function releaseFeatureQuota(reservation) {
  if (!reservation) return;

  await releaseAbuseQuotas(reservation.abuseReservations || []);

  const { error } = await supabase.rpc("release_plan_quota", {
    p_user_id: reservation.userId,
    p_feature: reservation.feature,
    p_window_key: reservation.windowKey,
  });

  if (error) {
    console.error("Could not restore failed quota reservation:", error.message);
  }
}

async function runWithFeatureQuota({ userId, email, feature, operation, req }) {
  const quotaResult = await reserveFeatureQuota({ userId, email, feature, req });

  try {
    const result = await operation();

    return {
      result,
      usage: quotaResult.usage,
    };
  } catch (error) {
    await releaseFeatureQuota(quotaResult.reservation);
    throw error;
  }
}

/*
  Call only after a payment provider has been verified on the backend.
  Do not expose this function through a public frontend-controlled endpoint.
*/
async function activatePaidSubscription({
  userId,
  email = "",
  provider,
  providerCustomerId = "",
  providerPaymentId,
  currentPeriodEnd = null,
}) {
  if (!userId || !provider || !providerPaymentId) {
    throw createHttpError("Verified payment details are incomplete.", 500);
  }

  const { data, error } = await supabase
    .from("user_subscriptions")
    .upsert(
      {
        user_id: userId,
        email: String(email || "").trim().toLowerCase() || null,
        plan: "pro",
        status: "active",
        provider,
        provider_customer_id: providerCustomerId || null,
        provider_payment_id: providerPaymentId,
        started_at: new Date().toISOString(),
        current_period_end: currentPeriodEnd || null,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw createHttpError(
      error.message || "Could not activate paid plan.",
      500
    );
  }

  return data;
}

module.exports = {
  FEATURES,
  getPlanAccessForUser,
  runWithFeatureQuota,
  activatePaidSubscription,
};
