const crypto = require("crypto");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;

const admin = require("../config/firebaseAdmin");
const supabase = require("../config/supabase");
const {
  assertAccountDeletionAllowed,
  deactivateAdminAccountForDeletedUser,
} = require("./adminRbac.service");

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const OTP_SEND_USER_LIMIT = 3;
const OTP_SEND_IP_LIMIT = 10;
const OTP_VERIFY_USER_LIMIT = 10;
const OTP_VERIFY_IP_LIMIT = 30;
const OTP_SEND_WINDOW_SECONDS = 60 * 60;
const OTP_VERIFY_WINDOW_SECONDS = 15 * 60;

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getOtpPepper() {
  const pepper = String(
    process.env.ACCOUNT_DELETION_OTP_PEPPER || ""
  ).trim();

  if (pepper.length < 32) {
    throw createHttpError(
      "Account deletion OTP security is not configured. Set ACCOUNT_DELETION_OTP_PEPPER on the backend.",
      500
    );
  }

  return pepper;
}

function makeOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashRateKey(value) {
  return crypto
    .createHmac("sha256", getOtpPepper())
    .update(String(value || ""))
    .digest("hex");
}

function createOtpHash(otp) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(
    `${String(otp)}:${getOtpPepper()}`,
    salt,
    64
  );

  return [
    "scrypt",
    "v1",
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

function verifyOtpHash(otp, storedHash) {
  const [algorithm, version, saltValue, digestValue] = String(
    storedHash || ""
  ).split("$");

  if (
    algorithm !== "scrypt" ||
    version !== "v1" ||
    !saltValue ||
    !digestValue
  ) {
    return false;
  }

  try {
    const salt = Buffer.from(saltValue, "base64url");
    const expected = Buffer.from(digestValue, "base64url");
    const actual = crypto.scryptSync(
      `${String(otp)}:${getOtpPepper()}`,
      salt,
      expected.length
    );

    return (
      expected.length === actual.length &&
      crypto.timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}

function normalizeIpAddress(ipAddress) {
  const value = String(ipAddress || "").trim();
  return value || "unknown";
}

function formatWait(seconds) {
  if (seconds <= 60) {
    return `${Math.max(1, seconds)} second${seconds === 1 ? "" : "s"}`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

async function consumeOtpRateLimit({
  scope,
  scopeKey,
  limit,
  windowSeconds,
  message,
}) {
  const { data, error } = await supabase.rpc(
    "consume_account_deletion_otp_rate_limit",
    {
      p_scope: scope,
      p_scope_key: scopeKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    }
  );

  if (error) {
    throw createHttpError(
      error.message || "Could not verify account deletion request limits.",
      500
    );
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result?.allowed) {
    const waitSeconds = Number(result?.retry_after_seconds || 60);

    throw createHttpError(
      `${message} Try again in ${formatWait(waitSeconds)}.`,
      429
    );
  }
}

async function enforceOtpRateLimits({ userId, ipAddress, type }) {
  const isSend = type === "send";
  const userKey = hashRateKey(userId);
  const ipKey = hashRateKey(normalizeIpAddress(ipAddress));

  await consumeOtpRateLimit({
    scope: isSend ? "send_user" : "verify_user",
    scopeKey: userKey,
    limit: isSend ? OTP_SEND_USER_LIMIT : OTP_VERIFY_USER_LIMIT,
    windowSeconds: isSend
      ? OTP_SEND_WINDOW_SECONDS
      : OTP_VERIFY_WINDOW_SECONDS,
    message: isSend
      ? "Too many verification-code requests for this account."
      : "Too many verification-code attempts for this account.",
  });

  await consumeOtpRateLimit({
    scope: isSend ? "send_ip" : "verify_ip",
    scopeKey: ipKey,
    limit: isSend ? OTP_SEND_IP_LIMIT : OTP_VERIFY_IP_LIMIT,
    windowSeconds: isSend
      ? OTP_SEND_WINDOW_SECONDS
      : OTP_VERIFY_WINDOW_SECONDS,
    message: isSend
      ? "Too many verification-code requests from this network."
      : "Too many verification-code attempts from this network.",
  });
}

async function getOtpRecord(userId) {
  const { data, error } = await supabase
    .from("account_deletion_otps")
    .select("user_id, otp_hash, expires_at, attempts, last_sent_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw createHttpError(
      error.message || "Could not verify the account deletion code.",
      500
    );
  }

  return data || null;
}

async function assertOtpResendCooldown(userId) {
  const record = await getOtpRecord(userId);

  if (!record?.last_sent_at) {
    return;
  }

  const retryAfterSeconds = Math.max(
    0,
    OTP_RESEND_COOLDOWN_SECONDS -
      Math.floor((Date.now() - new Date(record.last_sent_at).getTime()) / 1000)
  );

  if (retryAfterSeconds > 0) {
    throw createHttpError(
      `Please wait ${formatWait(retryAfterSeconds)} before requesting another verification code.`,
      429
    );
  }
}

async function saveOtpRecord({ userId, email, otpHash, expiresAt, ipAddress }) {
  const { error } = await supabase
    .from("account_deletion_otps")
    .upsert(
      {
        user_id: userId,
        email: String(email || "").trim().toLowerCase(),
        otp_hash: otpHash,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        last_sent_at: new Date().toISOString(),
        request_ip_hash: hashRateKey(normalizeIpAddress(ipAddress)),
        verified_at: null,
      },
      {
        onConflict: "user_id",
      }
    );

  if (error) {
    throw createHttpError(
      error.message || "Could not save the verification code.",
      500
    );
  }
}

async function deleteOtpRecord(userId) {
  const { error } = await supabase
    .from("account_deletion_otps")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw createHttpError(
      error.message || "Could not remove the verification code.",
      500
    );
  }
}

async function deleteOtpRateLimitsForUser(userId) {
  const userScopeKey = hashRateKey(userId);

  const { error } = await supabase
    .from("account_deletion_otp_rate_limits")
    .delete()
    .in("scope", ["send_user", "verify_user"])
    .eq("scope_key", userScopeKey);

  if (error) {
    throw createHttpError(
      error.message || "Could not clear account-deletion security records.",
      500
    );
  }
}

function getTransporter() {
  const smtpHost = String(process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = String(process.env.SMTP_USER || "").trim();
  const smtpPass = String(process.env.SMTP_PASS || "").trim();

  if (!smtpHost || !smtpUser || !smtpPass || !Number.isInteger(smtpPort)) {
    throw createHttpError(
      "SMTP configuration is incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.",
      500
    );
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

function cleanTargets(targets = []) {
  return [...new Set(targets)].filter((target) => VALID_TARGETS.includes(target));
}

function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value || null));
}

async function getFirestoreDocsByUser(collectionName, userId) {
  const db = admin.firestore();

  const snapshot = await db
    .collection(collectionName)
    .where("userId", "==", userId)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...toPlainJson(doc.data()),
  }));
}

async function deleteFirestoreDocsByUser(collectionName, userId) {
  const db = admin.firestore();

  const snapshot = await db
    .collection(collectionName)
    .where("userId", "==", userId)
    .get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  return snapshot.size;
}

async function archiveTargetData({
  userId,
  email,
  requestType,
  target,
  data,
}) {
  const { data: archive, error } = await supabase
    .from("data_deletion_archives")
    .insert({
      user_id: userId,
      email,
      request_type: requestType,
      target,
      archive_json: data || {},
      status: "scheduled",
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Could not archive user data.");
  }

  return archive;
}

async function getRowsForUser(tableName, userId, columns = "*") {
  const { data, error } = await supabase
    .from(tableName)
    .select(columns)
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `Could not load ${tableName} for account deletion: ${error.message}`
    );
  }

  return data || [];
}

async function deleteRowsForUser(tableName, userId) {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `Could not delete ${tableName} for account deletion: ${error.message}`
    );
  }
}

async function anonymizeActivityLogsForUser(userId) {
  const { error } = await supabase
    .from("activity_logs")
    .update({
      user_id: null,
      user_email: null,
      entity_id: null,
      ip_address: null,
      user_agent: null,
      metadata: {
        accountDeleted: true,
        anonymizedAt: new Date().toISOString(),
      },
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `Could not anonymize user activity logs: ${error.message}`
    );
  }
}

function sanitizeMediaExportsForArchive(mediaExports = []) {
  return mediaExports.map((item) => ({
    id: item.id,
    youtube_url: item.youtube_url || null,
    youtube_video_id: item.youtube_video_id || null,
    youtube_title: item.youtube_title || null,
    original_name: item.original_name || null,
    output_name: item.output_name || null,
    output_type: item.output_type || null,
    output_quality: item.output_quality || null,
    output_mime_type: item.output_mime_type || null,
    output_bytes: item.output_bytes || 0,
    status: item.status || null,
    created_at: item.created_at || null,
    expires_at: item.expires_at || null,
  }));
}

function sanitizeYoutubeConnectionForArchive(connection) {
  if (!connection) return null;

  return {
    email: connection.email || null,
    channel_id: connection.channel_id || null,
    channel_title: connection.channel_title || null,
    channel_thumbnail: connection.channel_thumbnail || null,
    created_at: connection.created_at || null,
    updated_at: connection.updated_at || null,
    tokenArchived: false,
  };
}

async function deleteCloudinaryAssets(publicIds = []) {
  const uniquePublicIds = [...new Set(publicIds.filter(Boolean))];

  for (const publicId of uniquePublicIds) {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
      });
    } catch (error) {
      throw new Error(
        `Could not delete Cloudinary asset ${publicId}: ${error.message}`
      );
    }
  }
}

async function markArchiveFailed(archiveId, error) {
  if (!archiveId) return;

  await supabase
    .from("data_deletion_archives")
    .update({
      status: "failed",
      error_message: String(error?.message || "Account deletion failed").slice(
        0,
        1000
      ),
    })
    .eq("id", archiveId);
}

async function requestRecordsDeletion({ userId, email, targets }) {
  const selectedTargets = cleanTargets(targets);

  if (!selectedTargets.length) {
    throw new Error("Please select at least one record type.");
  }

  const result = {
    savedIdeas: 0,
    researchHistory: 0,
    savedThumbnails: 0,
  };

  if (selectedTargets.includes("savedIdeas")) {
    const { data: savedIdeas, error } = await supabase
      .from("saved_ideas")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }

    await archiveTargetData({
      userId,
      email,
      requestType: "records",
      target: "savedIdeas",
      data: {
        records: savedIdeas || [],
        deletedFromActiveWorkspaceAt: new Date().toISOString(),
        scheduledPermanentPurgeAfterDays: 30,
      },
    });

    await supabase.from("saved_ideas").delete().eq("user_id", userId);

    result.savedIdeas = savedIdeas?.length || 0;
  }

  if (selectedTargets.includes("researchHistory")) {
    const { data: history, error } = await supabase
      .from("research_queries")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }

    await archiveTargetData({
      userId,
      email,
      requestType: "records",
      target: "researchHistory",
      data: {
        records: history || [],
        deletedFromActiveWorkspaceAt: new Date().toISOString(),
        scheduledPermanentPurgeAfterDays: 30,
      },
    });

    await supabase.from("research_queries").delete().eq("user_id", userId);

    result.researchHistory = history?.length || 0;
  }

  if (selectedTargets.includes("savedThumbnails")) {
    const thumbnails = await getFirestoreDocsByUser(
      "content_pack_thumbnails",
      userId
    );

    await archiveTargetData({
      userId,
      email,
      requestType: "records",
      target: "savedThumbnails",
      data: {
        records: thumbnails,
        cloudinaryPublicIds: thumbnails
          .map((item) => item.publicId)
          .filter(Boolean),
        deletedFromActiveWorkspaceAt: new Date().toISOString(),
        scheduledPermanentPurgeAfterDays: 30,
      },
    });

    await deleteFirestoreDocsByUser("content_pack_thumbnails", userId);

    result.savedThumbnails = thumbnails.length;
  }

  return {
    message:
      "Selected records removed from your active workspace. Permanent deletion is scheduled after 30 days.",
    selectedTargets,
    deletedFromActiveWorkspace: result,
    scheduledPermanentPurgeAfterDays: 30,
  };
}

async function sendDeleteAccountOtp({ userId, email, ipAddress }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!userId || !normalizedEmail) {
    throw createHttpError("Email not found.", 400);
  }

  // Do not issue an OTP to the only active owner account.
  await assertAccountDeletionAllowed(userId);

  await assertOtpResendCooldown(userId);
  await enforceOtpRateLimits({
    userId,
    ipAddress,
    type: "send",
  });

  const otp = makeOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await saveOtpRecord({
    userId,
    email: normalizedEmail,
    otpHash: createOtpHash(otp),
    expiresAt,
    ipAddress,
  });

  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: normalizedEmail,
      subject: "Your account deletion verification code",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
          <h2>Account Deletion Verification</h2>
          <p>Your 6-digit verification code is:</p>
          <div style="font-size:30px;font-weight:700;letter-spacing:8px;margin:20px 0;">
            ${otp}
          </div>
          <p>This code expires in 10 minutes.</p>
          <p>For your security, you can request a new code after 60 seconds.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    // A code must never remain valid when its email delivery failed.
    await deleteOtpRecord(userId).catch(() => undefined);

    console.error("Account deletion OTP email failed:", error.message);

    throw createHttpError(
      "Could not send the verification code. Please try again later.",
      502
    );
  }

  return {
    message:
      "6-digit verification code sent to your email. It expires in 10 minutes.",
    email: normalizedEmail,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    resendAvailableInSeconds: OTP_RESEND_COOLDOWN_SECONDS,
  };
}

async function confirmDeleteAccount({ userId, email, code, ipAddress }) {
  const normalizedCode = String(code || "").trim();

  if (!/^\d{6}$/.test(normalizedCode)) {
    throw createHttpError("Valid 6-digit verification code is required.", 400);
  }

  await enforceOtpRateLimits({
    userId,
    ipAddress,
    type: "verify",
  });

  const otpData = await getOtpRecord(userId);

  if (!otpData) {
    throw createHttpError(
      "Please request a verification code before deleting your account.",
      400
    );
  }

  if (new Date(otpData.expires_at).getTime() <= Date.now()) {
    await deleteOtpRecord(userId);
    throw createHttpError(
      "Verification code expired. Please request a new code.",
      410
    );
  }

  const currentAttempts = Number(otpData.attempts || 0);

  if (currentAttempts >= OTP_MAX_ATTEMPTS) {
    throw createHttpError(
      "Too many wrong attempts. Please request a new verification code.",
      429
    );
  }

  if (!verifyOtpHash(normalizedCode, otpData.otp_hash)) {
    const nextAttempts = currentAttempts + 1;

    const { error } = await supabase
      .from("account_deletion_otps")
      .update({ attempts: nextAttempts })
      .eq("user_id", userId)
      .eq("attempts", currentAttempts);

    if (error) {
      throw createHttpError(
        error.message || "Could not record verification failure.",
        500
      );
    }

    const remainingAttempts = Math.max(OTP_MAX_ATTEMPTS - nextAttempts, 0);

    if (remainingAttempts === 0) {
      throw createHttpError(
        "Too many wrong attempts. Please request a new verification code.",
        429
      );
    }

    throw createHttpError(
      `Invalid verification code. ${remainingAttempts} attempt${
        remainingAttempts === 1 ? "" : "s"
      } remaining.`,
      400
    );
  }

  // Re-check owner protection immediately before irreversible deletion.
  await assertAccountDeletionAllowed(userId);

  // A valid OTP is one-time use. Remove it before deleting account data.
  await deleteOtpRecord(userId);

  let archiveId = "";

  try {
    const db = admin.firestore();

    const [
      savedIdeas,
      researchHistory,
      calendarEvents,
      mediaExports,
      trendSearches,
      activityLogs,
      adminNotes,
      youtubeConnections,
      thumbnails,
    ] = await Promise.all([
      getRowsForUser("saved_ideas", userId),
      getRowsForUser("research_queries", userId),
      getRowsForUser("content_calendar_events", userId),
      getRowsForUser("media_exports", userId),
      getRowsForUser("user_trend_searches", userId),
      getRowsForUser("activity_logs", userId),
      getRowsForUser("admin_user_notes", userId),
      getRowsForUser(
        "youtube_connections",
        userId,
        "email, channel_id, channel_title, channel_thumbnail, created_at, updated_at"
      ),
      getFirestoreDocsByUser("content_pack_thumbnails", userId),
    ]);

    const appUserRef = db.collection("app_users").doc(userId);
    const appUserDoc = await appUserRef.get();

    const profile = appUserDoc.exists
      ? toPlainJson(appUserDoc.data())
      : null;

    const cloudinaryPublicIds = [
      ...thumbnails.map((item) => item.publicId).filter(Boolean),
      profile?.photoPublicId,
    ].filter(Boolean);

    const archive = await archiveTargetData({
      userId,
      email,
      requestType: "account",
      target: "fullAccount",
      data: {
        profile,
        savedIdeas,
        researchHistory,
        calendarEvents,
        mediaExports: sanitizeMediaExportsForArchive(mediaExports),
        trendSearches,
        activityLogs,
        adminNotes,
        youtubeConnection: sanitizeYoutubeConnectionForArchive(
          youtubeConnections[0]
        ),
        savedThumbnails: thumbnails,
        accountClosedAt: new Date().toISOString(),
        activeWorkspaceDeletedAt: new Date().toISOString(),
        cloudinaryAssetsDeletedImmediately: true,
        scheduledPermanentPurgeAfterDays: 30,
        note:
          "Archive retained for 30 days. OAuth tokens and local media file paths were intentionally not archived.",
      },
    });

    archiveId = archive.id;

    // Revoke Google access token and remove youtube_connections row.
    await disconnectYoutubeConnection(userId);

    // Delete MP3/MP4 physical files first, then delete media_exports rows.
    await deleteAllMediaExportsForUser({ userId });

    // Removes user-owned temporary files created after the new temp-file prefix is deployed.
    await removeTemporaryMediaForUser({ userId });

    // Remove active Supabase user data.
    await deleteRowsForUser("content_calendar_events", userId);
    await deleteRowsForUser("user_trend_searches", userId);
    await deleteRowsForUser("admin_user_notes", userId);
    await deleteRowsForUser("saved_ideas", userId);
    await deleteRowsForUser("research_queries", userId);

    // OTP hashes are never archived. Remove them with the active account data.
    await deleteRowsForUser("account_deletion_otps", userId);
    await deleteOtpRateLimitsForUser(userId);

    // Preserve only non-identifying product analytics.
    await anonymizeActivityLogsForUser(userId);

    // Delete public thumbnail/profile image assets immediately.
    await deleteCloudinaryAssets(cloudinaryPublicIds);

    // Delete Firestore user data.
    await deleteFirestoreDocsByUser("content_pack_thumbnails", userId);

    if (appUserDoc.exists) {
      await appUserRef.delete();
    }

    // Remove legacy deleted-profile record if an older version created one.
    await db.collection("app_users_deleted").doc(userId).delete();

    // Deactivate RBAC access first, so a removed Firebase user cannot retain
    // an active admin role record.
    await deactivateAdminAccountForDeletedUser(userId);

    // Firebase account is always deleted last.
    await admin.auth().deleteUser(userId);

    return {
      message:
        "Account and all active personal data were deleted successfully. A protected deletion archive will be permanently purged after 30 days.",
      accountDeleted: true,
      scheduledPermanentPurgeAfterDays: 30,
    };
  } catch (error) {
    await markArchiveFailed(archiveId, error);
    throw error;
  }
}

async function purgeDueDeletionArchives() {
  const now = new Date().toISOString();

  const { data: dueItems, error } = await supabase
    .from("data_deletion_archives")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_purge_at", now)
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  let purged = 0;

  for (const item of dueItems || []) {
    try {
      const publicIds = item.archive_json?.cloudinaryPublicIds || [];

      for (const publicId of publicIds) {
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }

      await supabase
        .from("data_deletion_archives")
        .update({
          status: "purged",
          purged_at: new Date().toISOString(),
          archive_json: {
            purged: true,
            purgedAt: new Date().toISOString(),
            originalTarget: item.target,
          },
        })
        .eq("id", item.id);

      purged += 1;
    } catch (error) {
      await supabase
        .from("data_deletion_archives")
        .update({
          status: "failed",
          error_message: error.message,
        })
        .eq("id", item.id);
    }
  }

  return {
    purged,
  };
}

module.exports = {
  requestRecordsDeletion,
  sendDeleteAccountOtp,
  confirmDeleteAccount,
  purgeDueDeletionArchives,
};