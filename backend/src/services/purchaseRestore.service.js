const supabase = require("../config/supabase");
const {
  getPlanAccessForUser,
} = require("./planAccess.service");

function createHttpError(
  message,
  statusCode = 400,
  code = ""
) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getRemainingSeconds(currentPeriodEnd) {
  if (!currentPeriodEnd) {
    return null;
  }

  const expiresAt = new Date(currentPeriodEnd).getTime();

  if (!Number.isFinite(expiresAt)) {
    return null;
  }

  return Math.max(
    0,
    Math.floor((expiresAt - Date.now()) / 1000)
  );
}

/*
  This function must only be called after Firebase Admin has verified:
  1. the ID token,
  2. email_verified === true.

  The Supabase RPC is transactional and preserves the original subscription
  started_at/current_period_end. It only changes ownership from the deleted
  Firebase UID to the new Firebase UID.
*/
async function restoreActivePurchaseForVerifiedUser({
  userId,
  email,
  emailVerified,
}) {
  const cleanUserId = String(userId || "").trim();
  const cleanEmail = normalizeEmail(email);

  if (!cleanUserId) {
    throw createHttpError(
      "Authenticated user is required.",
      401,
      "AUTH_REQUIRED"
    );
  }

  if (!emailVerified || !cleanEmail) {
    throw createHttpError(
      "Verify your email before restoring a purchase.",
      403,
      "VERIFIED_EMAIL_REQUIRED"
    );
  }

  const currentAccess = await getPlanAccessForUser({
    userId: cleanUserId,
    email: cleanEmail,
  });

  if (currentAccess.isPaid) {
    return {
      restored: false,
      alreadyActive: true,
      reason: "current_account_already_active",
      access: {
        plan: currentAccess.plan,
        isPaid: currentAccess.isPaid,
        isAdmin: currentAccess.isAdmin,
        status:
          currentAccess.subscription?.status ||
          (currentAccess.isAdmin ? "active" : "inactive"),
        startedAt:
          currentAccess.subscription?.started_at || null,
        currentPeriodEnd:
          currentAccess.subscription?.current_period_end ||
          null,
        remainingSeconds: getRemainingSeconds(
          currentAccess.subscription?.current_period_end
        ),
      },
    };
  }

  const { data, error } = await supabase.rpc(
    "restore_active_subscription_by_verified_email",
    {
      p_new_user_id: cleanUserId,
      p_verified_email: cleanEmail,
    }
  );

  if (error) {
    const message = String(error.message || "");

    if (
      message.includes(
        "restore_active_subscription_by_verified_email"
      ) ||
      String(error.code || "") === "PGRST202"
    ) {
      throw createHttpError(
        "Purchase restore database migration is not installed.",
        500,
        "PURCHASE_RESTORE_NOT_CONFIGURED"
      );
    }

    throw createHttpError(
      message || "Could not restore active purchase.",
      500,
      "PURCHASE_RESTORE_FAILED"
    );
  }

  const updatedAccess = await getPlanAccessForUser({
    userId: cleanUserId,
    email: cleanEmail,
  });

  const restored = data?.restored === true;

  return {
    restored,
    alreadyActive: data?.alreadyActive === true,
    reason:
      data?.reason ||
      (restored ? "active_purchase_restored" : "no_active_purchase"),
    message: restored
      ? "Your existing Pro access was restored with its original expiry date."
      : updatedAccess.isPaid
        ? "Your Pro access is active."
        : "No active Pro purchase was found for this verified email.",
    access: {
      plan: updatedAccess.plan,
      isPaid: updatedAccess.isPaid,
      isAdmin: updatedAccess.isAdmin,
      status:
        updatedAccess.subscription?.status ||
        (updatedAccess.isAdmin ? "active" : "inactive"),
      startedAt:
        updatedAccess.subscription?.started_at || null,
      currentPeriodEnd:
        updatedAccess.subscription?.current_period_end ||
        null,
      remainingSeconds: getRemainingSeconds(
        updatedAccess.subscription?.current_period_end
      ),
    },
  };
}

module.exports = {
  restoreActivePurchaseForVerifiedUser,
};
