const {
  requestRecordsDeletion,
  sendDeleteAccountOtp,
  confirmDeleteAccount,
  purgeDueDeletionArchives,
} = require("../services/dataPrivacy.service");

const { logActivitySafe } = require("../services/activityLog.service");

function getErrorStatus(error, fallbackStatus = 500) {
  const status = Number(error?.statusCode || error?.status || fallbackStatus);

  if (Number.isInteger(status) && status >= 400 && status <= 599) {
    return status;
  }

  return fallbackStatus;
}

function getRequestIp(req) {
  // req.ip uses Express proxy settings and avoids trusting a spoofable header directly.
  return String(req?.ip || req?.socket?.remoteAddress || "unknown").trim();
}

async function deleteSelectedRecords(req, res) {
  try {
    const { targets } = req.body || {};

    const result = await requestRecordsDeletion({
      userId: req.user.uid,
      email: req.user.email,
      targets,
    });

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "privacy.records_deletion_requested",
      module: "privacy",
      metadata: {
        targets: Array.isArray(targets) ? targets : [],
      },
      req,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Delete selected records error:", error);

    return res.status(getErrorStatus(error)).json({
      message: error.message || "Failed to delete selected records.",
    });
  }
}

async function requestDeleteAccountOtp(req, res) {
  try {
    const result = await sendDeleteAccountOtp({
      userId: req.user.uid,
      email: req.user.email,
      ipAddress: getRequestIp(req),
    });

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "privacy.account_deletion_otp_requested",
      module: "privacy",
      req,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Request delete account OTP error:", error);

    return res.status(getErrorStatus(error)).json({
      message: error.message || "Failed to send verification code.",
    });
  }
}

async function deleteAccount(req, res) {
  try {
    const code = String(req.body?.code || "").trim();

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        message: "Valid 6-digit code is required.",
      });
    }

    const result = await confirmDeleteAccount({
      userId: req.user.uid,
      email: req.user.email,
      code,
      ipAddress: getRequestIp(req),
    });

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "privacy.account_deletion_requested",
      module: "privacy",
      req,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Delete account error:", error);

    return res.status(getErrorStatus(error)).json({
      message: error.message || "Failed to delete account.",
    });
  }
}

async function purgeDueArchives(req, res) {
  try {
    const cronSecret = req.headers["x-cron-secret"];

    if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({
        message: "Unauthorized cron request.",
      });
    }

    const result = await purgeDueDeletionArchives();

    return res.status(200).json(result);
  } catch (error) {
    console.error("Purge due archives error:", error);

    return res.status(getErrorStatus(error)).json({
      message: error.message || "Failed to purge due archives.",
    });
  }
}

module.exports = {
  deleteSelectedRecords,
  requestDeleteAccountOtp,
  deleteAccount,
  purgeDueArchives,
};
