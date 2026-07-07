const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const MEDIA_EXPORT_ROOT = path.resolve(
  process.cwd(),
  process.env.MEDIA_EXPORT_STORAGE_DIR || "storage/media_exports"
);

const INCOMING_DIR = path.join(MEDIA_EXPORT_ROOT, "incoming");

// Never let configuration raise a request upload above 250 MB. Larger source
// files belong in a dedicated asynchronous pipeline, not an API process.
const MAX_UPLOAD_SIZE_MB = Math.max(
  10,
  Math.min(250, Number(process.env.MEDIA_EXPORT_MAX_FILE_SIZE_MB || 200))
);

const ALLOWED_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".mkv",
  ".webm",
  ".avi",
  ".m4v",
]);

const ALLOWED_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
  "video/webm",
  "video/x-msvideo",
  "video/x-m4v",
]);

function ensureIncomingDirectory() {
  fs.mkdirSync(INCOMING_DIR, { recursive: true });
}

function getFileExtension(file) {
  return path.extname(String(file?.originalname || "")).toLowerCase();
}

function getUserTempPrefix(userId) {
  const safeUserId = String(userId || "anonymous").trim();

  const fingerprint = crypto
    .createHash("sha256")
    .update(safeUserId)
    .digest("hex")
    .slice(0, 24);

  return `u-${fingerprint}-`;
}

function isAllowedOriginalVideo(file) {
  const extension = getFileExtension(file);
  const mimeType = String(file?.mimetype || "").toLowerCase();

  return ALLOWED_EXTENSIONS.has(extension) && ALLOWED_MIME_TYPES.has(mimeType);
}

ensureIncomingDirectory();

const storage = multer.diskStorage({
  destination(req, file, callback) {
    ensureIncomingDirectory();
    callback(null, INCOMING_DIR);
  },

  filename(req, file, callback) {
    const extension = getFileExtension(file) || ".mp4";
    const ownerPrefix = getUserTempPrefix(req.user?.uid);

    callback(
      null,
      `${ownerPrefix}${Date.now()}-${crypto.randomUUID()}${extension}`
    );
  },
});

const ownedMediaUpload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter(req, file, callback) {
    if (!isAllowedOriginalVideo(file)) {
      return callback(
        new Error(
          "Only MP4, MOV, MKV, WEBM, AVI, or M4V video files with a valid video MIME type are allowed."
        )
      );
    }

    return callback(null, true);
  },
});

module.exports = {
  ownedMediaUpload,
  MEDIA_EXPORT_ROOT,
  INCOMING_DIR,
  MAX_UPLOAD_SIZE_MB,
  getUserTempPrefix,
};
