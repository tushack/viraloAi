const crypto = require("crypto");

const {
  createYoutubeAuthUrl,
  handleYoutubeCallback,
  getYoutubeConnection,
  disconnectYoutubeConnection,
  applyYoutubeReadyKit,
} = require("../services/youtube.service");

const YOUTUBE_OAUTH_COOKIE_NAME = "viralo_youtube_oauth";
const YOUTUBE_OAUTH_COOKIE_TTL_MS = 10 * 60 * 1000;

function getFrontendSettingsUrl(status, message = "") {
  const frontendUrl = String(process.env.FRONTEND_URL || "http://localhost:5173").trim();
  const url = new URL("/settings", frontendUrl);

  url.searchParams.set("youtube", status);

  if (message) {
    url.searchParams.set("youtubeMessage", String(message).slice(0, 300));
  }

  return url.toString();
}

function getStatusCode(error, fallback = 500) {
  const statusCode = Number(error?.statusCode || error?.code || fallback);
  return Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599
    ? statusCode
    : fallback;
}

function getOauthCookieOptions() {
  const requestedSameSite = String(
    process.env.YOUTUBE_OAUTH_COOKIE_SAME_SITE || "lax"
  )
    .trim()
    .toLowerCase();
  const sameSite = ["lax", "strict", "none"].includes(requestedSameSite)
    ? requestedSameSite
    : "lax";
  const explicitlySecure = String(process.env.YOUTUBE_OAUTH_COOKIE_SECURE || "")
    .trim()
    .toLowerCase();
  const secure =
    sameSite === "none" ||
    explicitlySecure === "true" ||
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/api/youtube",
    maxAge: YOUTUBE_OAUTH_COOKIE_TTL_MS,
  };
}

function parseCookies(req) {
  const header = String(req.headers.cookie || "");
  const parsed = {};

  header.split(";").forEach((part) => {
    const separator = part.indexOf("=");
    if (separator <= 0) return;

    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();

    try {
      parsed[key] = decodeURIComponent(value);
    } catch {
      parsed[key] = value;
    }
  });

  return parsed;
}

function createBrowserBinding() {
  return crypto.randomBytes(32).toString("base64url");
}

function clearOauthCookie(res) {
  const options = getOauthCookieOptions();
  res.clearCookie(YOUTUBE_OAUTH_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
}

async function getAuthUrl(req, res) {
  try {
    const browserBinding = createBrowserBinding();
    const url = await createYoutubeAuthUrl({
      userId: req.user.uid,
      email: req.user.email,
      browserBinding,
    });

    res.cookie(YOUTUBE_OAUTH_COOKIE_NAME, browserBinding, getOauthCookieOptions());
    return res.json({ url });
  } catch (error) {
    console.error("YouTube auth URL error:", error);

    return res.status(getStatusCode(error)).json({
      message: error.message || "Failed to start YouTube connection.",
    });
  }
}

async function youtubeCallback(req, res) {
  try {
    const { code, state, error, error_description: errorDescription } = req.query;

    if (error) {
      return res.redirect(
        getFrontendSettingsUrl(
          "cancelled",
          errorDescription || "YouTube permission was not granted."
        )
      );
    }

    if (!code || !state) {
      return res.redirect(
        getFrontendSettingsUrl("failed", "Missing Google OAuth response.")
      );
    }

    const browserBinding = parseCookies(req)[YOUTUBE_OAUTH_COOKIE_NAME] || "";
    await handleYoutubeCallback({ code, state, browserBinding });

    return res.redirect(getFrontendSettingsUrl("connected"));
  } catch (error) {
    console.error("YouTube callback error:", error);

    return res.redirect(
      getFrontendSettingsUrl(
        "failed",
        error.message || "Could not connect YouTube."
      )
    );
  } finally {
    clearOauthCookie(res);
  }
}

async function getConnection(req, res) {
  try {
    const connection = await getYoutubeConnection(req.user.uid);

    return res.json({
      connected: Boolean(connection?.channelId),
      connection,
    });
  } catch (error) {
    console.error("YouTube connection error:", error);

    return res.status(getStatusCode(error)).json({
      message: error.message || "Failed to fetch YouTube connection.",
    });
  }
}

async function disconnectConnection(req, res) {
  try {
    const result = await disconnectYoutubeConnection(req.user.uid);

    return res.json({
      message: "YouTube channel disconnected.",
      ...result,
    });
  } catch (error) {
    console.error("YouTube disconnect error:", error);

    return res.status(getStatusCode(error)).json({
      message: error.message || "Failed to disconnect YouTube.",
    });
  }
}

async function applyKit(req, res) {
  try {
    const result = await applyYoutubeReadyKit({
      userId: req.user.uid,
      videoUrl: req.body?.videoUrl,
      title: req.body?.title,
      description: req.body?.description,
      tags: req.body?.tags,
      thumbnailUrl: req.body?.thumbnailUrl,
    });

    return res.json({
      message: "YouTube Ready Kit applied successfully.",
      result,
    });
  } catch (error) {
    console.error("Apply YouTube Ready Kit error:", error);

    return res.status(getStatusCode(error)).json({
      message: error.message || "Failed to apply YouTube Ready Kit.",
    });
  }
}

module.exports = {
  getAuthUrl,
  youtubeCallback,
  getConnection,
  disconnectConnection,
  applyKit,
};
