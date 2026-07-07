const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const { google } = require("googleapis");
const {
  runFfmpegProcess,
  runYtDlpProcess,
  inspectMediaFile,
} = require("./mediaProcess.service");
const {
  uploadMediaExportToCloudinary,
  getPrivateDownloadUrl,
  deleteDurableMediaExport,
} = require("./mediaDurableStorage.service");

const supabase = require("../config/supabase");
const {
  MEDIA_EXPORT_ROOT,
  INCOMING_DIR,
  MAX_UPLOAD_SIZE_MB,
  getUserTempPrefix,
} = require("../middlewares/mediaUpload.middleware");

const OUTPUT_DIR = path.join(MEDIA_EXPORT_ROOT, "output");
const RECENT_EXPORT_LIMIT = 20;

const RETENTION_DAYS = Math.max(
  1,
  Number(process.env.MEDIA_EXPORT_RETENTION_DAYS || 7)
);

const ALLOWED_OUTPUT_TYPES = new Set(["video", "audio"]);
const ALLOWED_AUDIO_BITRATES = new Set([128, 192, 320]);
const ALLOWED_VIDEO_QUALITIES = new Set([
  "original",
  "1080p",
  "720p",
  "480p",
  "360p",
]);

function ensureOutputDirectory() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function cleanString(value, maxLength = 500) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function toBoolean(value) {
  return value === true || String(value || "").toLowerCase() === "true";
}

function createHttpError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isFileInsideDirectory(filePath, directoryPath) {
  const relativePath = path.relative(
    path.resolve(directoryPath),
    path.resolve(filePath)
  );

  return (
    relativePath &&
    !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath)
  );
}

async function safelyDeleteFile(filePath) {
  if (!filePath) return;

  try {
    await fsp.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Could not delete media export file:", error.message);
    }
  }
}

function getFfmpegCommand() {
  return cleanString(process.env.FFMPEG_PATH || "ffmpeg", 1000);
}

function getFfprobeCommand() {
  return cleanString(process.env.FFPROBE_PATH || "ffprobe", 1000);
}

function getYoutubeDataApiKey() {
  return cleanString(
    process.env.YOUTUBE_DATA_API_KEY ||
    process.env.YOUTUBE_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    "",
    300
  );
}

function getYouTubeVideoId(input = "") {
  const rawValue = cleanString(input, 1200);

  if (/^[A-Za-z0-9_-]{11}$/.test(rawValue)) {
    return rawValue;
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(
      rawValue.startsWith("http") ? rawValue : `https://${rawValue}`
    );
  } catch {
    return "";
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

  if (hostname === "youtu.be") {
    return cleanString(parsedUrl.pathname.split("/").filter(Boolean)[0], 40);
  }

  if (!hostname.endsWith("youtube.com")) {
    return "";
  }

  const queryVideoId = parsedUrl.searchParams.get("v");

  if (queryVideoId) {
    return cleanString(queryVideoId, 40);
  }

  const segments = parsedUrl.pathname.split("/").filter(Boolean);
  const markerIndex = segments.findIndex(
    (segment) => segment === "shorts" || segment === "embed" || segment === "live"
  );

  if (markerIndex >= 0 && segments[markerIndex + 1]) {
    return cleanString(segments[markerIndex + 1], 40);
  }

  return "";
}

function buildCanonicalYoutubeUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function formatMetric(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number) || number <= 0) return "—";
  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(1)}B`;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${Math.round(number / 1_000)}K`;

  return String(Math.round(number));
}

function formatIsoDuration(value) {
  const text = cleanString(value, 100);
  const match = text.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);

  if (!match) return "—";

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  if (!totalSeconds) return "—";

  const displayHours = Math.floor(totalSeconds / 3600);
  const displayMinutes = Math.floor((totalSeconds % 3600) / 60);
  const displaySeconds = totalSeconds % 60;

  if (displayHours > 0) {
    return `${displayHours}:${String(displayMinutes).padStart(2, "0")}:${String(
      displaySeconds
    ).padStart(2, "0")}`;
  }

  return `${displayMinutes}:${String(displaySeconds).padStart(2, "0")}`;
}

function makeFileStem(value) {
  const normalized = cleanString(value, 130)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\.+$/g, "")
    .trim();

  return normalized || "media-export";
}

function getExpiryIso() {
  return new Date(
    Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
}

function getVideoScaleFilter(videoQuality) {
  const heightByQuality = {
    "1080p": 1080,
    "720p": 720,
    "480p": 480,
    "360p": 360,
  };

  const height = heightByQuality[videoQuality];

  if (!height) return null;

  return `scale=-2:${height}:force_original_aspect_ratio=decrease`;
}

async function runFfmpeg(args) {
  return runFfmpegProcess(getFfmpegCommand(), args);
}

function getYtDlpCommand() {
  return cleanString(process.env.YT_DLP_PATH || "yt-dlp", 1000);
}

function getYoutubeMaxFileSizeMb() {
  const configured = Number(
    process.env.MEDIA_EXPORT_MAX_YOUTUBE_FILE_SIZE_MB || MAX_UPLOAD_SIZE_MB
  );
  const requested = Number.isFinite(configured)
    ? Math.floor(configured)
    : MAX_UPLOAD_SIZE_MB;

  // No deployment variable can reopen this synchronous API endpoint to
  // multi-gigabyte downloads.
  return Math.max(10, Math.min(requested, MAX_UPLOAD_SIZE_MB, 250));
}

async function runYtDlp(args) {
  return runYtDlpProcess(getYtDlpCommand(), args);
}

function getYoutubeFormatSelector({ outputType, videoQuality }) {
  if (outputType === "audio") {
    return "bestaudio/best";
  }

  if (videoQuality === "original") {
    return "bestvideo*+bestaudio/best";
  }

  const heightByQuality = {
    "1080p": 1080,
    "720p": 720,
    "480p": 480,
    "360p": 360,
  };

  const height = heightByQuality[videoQuality] || 720;

  return `bestvideo*[height<=${height}]+bestaudio/best[height<=${height}]/best`;
}

async function removeYoutubeDownloadArtifacts(prefix) {
  if (!prefix) return;

  let entries = [];

  try {
    entries = await fsp.readdir(INCOMING_DIR);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Could not read temporary YouTube files:", error.message);
    }
    return;
  }

  await Promise.all(
    entries
      .filter((entry) => entry.startsWith(prefix))
      .map((entry) => safelyDeleteFile(path.join(INCOMING_DIR, entry)))
  );
}

function getDownloadedYoutubePath({ stdout, tempPrefix }) {
  const candidatePaths = String(stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reverse();

  for (const candidate of candidatePaths) {
    const resolvedPath = path.resolve(candidate);

    if (
      path.basename(resolvedPath).startsWith(tempPrefix) &&
      isFileInsideDirectory(resolvedPath, INCOMING_DIR)
    ) {
      return resolvedPath;
    }
  }

  throw createHttpError(
    "yt-dlp did not return a usable temporary media file.",
    422
  );
}

async function downloadYoutubeSource({
  userId,
  youtubeUrl,
  outputType,
  videoQuality,
  exportId,
}) {
  const youtubeVideoId = getYouTubeVideoId(youtubeUrl);

  if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeVideoId)) {
    throw createHttpError("Enter a valid YouTube video link.", 400);
  }

  fs.mkdirSync(INCOMING_DIR, { recursive: true });

  const canonicalYoutubeUrl = buildCanonicalYoutubeUrl(youtubeVideoId);
  const tempPrefix = `youtube-${getUserTempPrefix(userId)}${exportId}-`;
  const outputTemplate = path.join(INCOMING_DIR, `${tempPrefix}%(id)s.%(ext)s`);
  const formatSelector = getYoutubeFormatSelector({
    outputType,
    videoQuality,
  });

  const args = [
    "--no-playlist",
    "--no-warnings",
    "--no-progress",
    "--restrict-filenames",
    "--max-filesize",
    `${getYoutubeMaxFileSizeMb()}M`,
    "--output",
    outputTemplate,
    "--print",
    "after_move:filepath",
    "--format",
    formatSelector,
  ];

  if (outputType === "video") {
    args.push("--merge-output-format", "mp4");
  }

  args.push(canonicalYoutubeUrl);

  try {
    const { stdout } = await runYtDlp(args);
    const inputPath = getDownloadedYoutubePath({ stdout, tempPrefix });

    await fsp.access(inputPath, fs.constants.R_OK);

    return {
      inputPath,
      tempPrefix,
      youtubeVideoId,
      youtubeUrl: canonicalYoutubeUrl,
      originalName: `youtube-${youtubeVideoId}${path.extname(inputPath) || ".mp4"}`,
    };
  } catch (error) {
    await removeYoutubeDownloadArtifacts(tempPrefix);
    throw error;
  }
}

function getMediaTranscodeArgs({
  inputPath,
  outputPath,
  outputType,
  audioBitrate,
  videoQuality,
}) {
  if (outputType === "audio") {
    return [
      "-hide_banner",
      "-y",
      "-i",
      inputPath,
      "-map",
      "0:a:0?",
      "-vn",
      "-c:a",
      "libmp3lame",
      "-b:a",
      `${audioBitrate}k`,
      outputPath,
    ];
  }

  const scaleFilter = getVideoScaleFilter(videoQuality);

  return [
    "-hide_banner",
    "-y",
    "-i",
    inputPath,
    "-map",
    "0:v:0?",
    "-map",
    "0:a:0?",
    ...(scaleFilter ? ["-vf", scaleFilter] : []),
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

function mapMediaExportRecord(row) {
  return {
    id: row.id,
    title: row.youtube_title || row.original_name || "Media export",
    youtubeUrl: row.youtube_url || "",
    youtubeVideoId: row.youtube_video_id || "",
    originalName: row.original_name || "",
    outputName: row.output_name || "",
    outputType: row.output_type || "video",
    outputQuality: row.output_quality || "",
    outputMimeType: row.output_mime_type || "application/octet-stream",
    outputBytes: Number(row.output_bytes || 0),
    status: row.status || "completed",
    createdAt: row.created_at || "",
    expiresAt: row.expires_at || "",
  };
}

async function requestYoutubeOembed(videoUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
        videoUrl
      )}`,
      { signal: controller.signal }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data?.title) {
      throw new Error("YouTube oEmbed preview is unavailable.");
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function getYoutubeVideoPreview({ videoUrl }) {
  const videoId = getYouTubeVideoId(videoUrl);

  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw createHttpError("Enter a valid YouTube video link.", 400);
  }

  const canonicalUrl = buildCanonicalYoutubeUrl(videoId);
  const fallbackThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const basicPreview = {
    videoId,
    url: canonicalUrl,
    title: "YouTube video",
    channelTitle: "YouTube",
    thumbnail: fallbackThumbnail,
    duration: "—",
    views: "—",
    source: "youtube-thumbnail-fallback",
    isLimitedPreview: true,
  };

  const apiKey = getYoutubeDataApiKey();

  if (apiKey) {
    try {
      const youtube = google.youtube({
        version: "v3",
        auth: apiKey,
      });

      const response = await youtube.videos.list({
        part: ["snippet", "contentDetails", "statistics"],
        id: [videoId],
      });

      const video = response.data.items?.[0];

      if (video) {
        return {
          ...basicPreview,
          title: video.snippet?.title || basicPreview.title,
          channelTitle:
            video.snippet?.channelTitle || basicPreview.channelTitle,
          thumbnail:
            video.snippet?.thumbnails?.high?.url ||
            video.snippet?.thumbnails?.medium?.url ||
            video.snippet?.thumbnails?.default?.url ||
            fallbackThumbnail,
          duration: formatIsoDuration(video.contentDetails?.duration),
          views: formatMetric(video.statistics?.viewCount),
          source: "youtube-data-api",
          isLimitedPreview: false,
        };
      }
    } catch (error) {
      console.warn(
        "YouTube Data API preview failed. Trying oEmbed/fallback:",
        error.message
      );
    }
  }

  try {
    const oembed = await requestYoutubeOembed(canonicalUrl);

    return {
      ...basicPreview,
      title: cleanString(oembed.title, 180) || basicPreview.title,
      channelTitle:
        cleanString(oembed.author_name, 160) || basicPreview.channelTitle,
      source: "youtube-oembed",
      isLimitedPreview: false,
    };
  } catch (error) {
    console.warn(
      "YouTube oEmbed preview failed. Showing basic preview:",
      error.message
    );

    return basicPreview;
  }
}

async function convertOwnedMedia({
  userId,
  file,
  outputType,
  audioBitrate,
  videoQuality,
  rightsAcknowledged,
  youtubeUrl,
  youtubeVideoId,
  youtubeTitle,
}) {
  if (!userId) {
    throw createHttpError("User account is required.", 401);
  }

  const hasUploadedFile = Boolean(file?.path && file?.originalname);
  const requestedYoutubeUrl = cleanString(youtubeUrl, 1200);

  if (!hasUploadedFile && !requestedYoutubeUrl) {
    throw createHttpError(
      "Paste a YouTube link or upload an original video file first.",
      400
    );
  }

  if (!toBoolean(rightsAcknowledged)) {
    throw createHttpError(
      "Confirm that you own this media or have permission to download and export it.",
      400
    );
  }

  const normalizedOutputType = cleanString(outputType, 20).toLowerCase();

  if (!ALLOWED_OUTPUT_TYPES.has(normalizedOutputType)) {
    throw createHttpError("Choose Video MP4 or Audio MP3.", 400);
  }

  const normalizedAudioBitrate = Number(audioBitrate || 192);

  if (!ALLOWED_AUDIO_BITRATES.has(normalizedAudioBitrate)) {
    throw createHttpError("Unsupported audio bitrate selected.", 400);
  }

  const normalizedVideoQuality = cleanString(videoQuality || "original", 20);

  if (!ALLOWED_VIDEO_QUALITIES.has(normalizedVideoQuality)) {
    throw createHttpError("Unsupported video quality selected.", 400);
  }

  const exportId = crypto.randomUUID();
  let inputPath = "";
  let sourceOriginalName = "";
  let canonicalYoutubeUrl = requestedYoutubeUrl;
  let resolvedYoutubeVideoId = cleanString(youtubeVideoId, 40);
  let youtubeTempPrefix = "";
  let outputPath = "";
  let durableObject = null;

  try {
    if (hasUploadedFile) {
      inputPath = path.resolve(file.path);

      if (!isFileInsideDirectory(inputPath, INCOMING_DIR)) {
        throw createHttpError("Invalid uploaded media file.", 400);
      }

      sourceOriginalName = cleanString(file.originalname, 260);
    } else {
      const downloadedSource = await downloadYoutubeSource({
        userId,
        youtubeUrl: requestedYoutubeUrl,
        outputType: normalizedOutputType,
        videoQuality: normalizedVideoQuality,
        exportId,
      });

      inputPath = downloadedSource.inputPath;
      sourceOriginalName = downloadedSource.originalName;
      canonicalYoutubeUrl = downloadedSource.youtubeUrl;
      resolvedYoutubeVideoId = downloadedSource.youtubeVideoId;
      youtubeTempPrefix = downloadedSource.tempPrefix;
    }

    // Reject renamed/corrupt files before FFmpeg consumes CPU.
    await inspectMediaFile({
      ffprobeCommand: getFfprobeCommand(),
      filePath: inputPath,
      requireVideo: normalizedOutputType === "video",
    });

    ensureOutputDirectory();

    const outputExtension = normalizedOutputType === "audio" ? ".mp3" : ".mp4";
    const outputMimeType =
      normalizedOutputType === "audio" ? "audio/mpeg" : "video/mp4";
    const fileStem = makeFileStem(
      youtubeTitle ||
      (resolvedYoutubeVideoId
        ? `youtube-${resolvedYoutubeVideoId}`
        : path.parse(sourceOriginalName).name)
    );
    const outputName = `${fileStem}-${exportId.slice(0, 8)}${outputExtension}`;
    outputPath = path.join(OUTPUT_DIR, outputName);

    const args = getMediaTranscodeArgs({
      inputPath,
      outputPath,
      outputType: normalizedOutputType,
      audioBitrate: normalizedAudioBitrate,
      videoQuality: normalizedVideoQuality,
    });

    await runFfmpeg(args);

    const outputStats = await fsp.stat(outputPath);

    if (!outputStats.size) {
      throw createHttpError("The converted file is empty. Try another source.", 422);
    }

    // Local disk is temporary processing space only. Persist the completed
    // export before responding so restarts and multiple instances are safe.
    durableObject = await uploadMediaExportToCloudinary({
      userId,
      exportId,
      outputPath,
      outputName,
    });

    await safelyDeleteFile(outputPath);
    outputPath = "";

    const row = {
      id: exportId,
      user_id: userId,
      youtube_url: canonicalYoutubeUrl || null,
      youtube_video_id: resolvedYoutubeVideoId || null,
      youtube_title: cleanString(youtubeTitle, 220) || null,
      original_name: sourceOriginalName,
      output_name: outputName,
      output_type: normalizedOutputType,
      output_quality:
        normalizedOutputType === "audio"
          ? `${normalizedAudioBitrate} kbps`
          : normalizedVideoQuality,
      output_path: null,
      storage_provider: durableObject.provider,
      storage_key: durableObject.key,
      storage_format: durableObject.format,
      output_mime_type: outputMimeType,
      output_bytes: outputStats.size,
      rights_acknowledged: true,
      status: "completed",
      created_at: new Date().toISOString(),
      expires_at: getExpiryIso(),
    };

    const { data, error } = await supabase
      .from("media_exports")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      await deleteDurableMediaExport({
        storage_provider: durableObject.provider,
        storage_key: durableObject.key,
        storage_format: durableObject.format,
      });
      durableObject = null;
      throw createHttpError(
        error.message || "Could not save media export history.",
        500
      );
    }

    return mapMediaExportRecord(data);
  } catch (error) {
    await safelyDeleteFile(outputPath);

    if (durableObject) {
      try {
        await deleteDurableMediaExport({
          storage_provider: durableObject.provider,
          storage_key: durableObject.key,
          storage_format: durableObject.format,
        });
      } catch (storageError) {
        console.error(
          "Could not roll back durable media export:",
          storageError.message || storageError
        );
      }
    }

    throw error;
  } finally {
    await removeYoutubeDownloadArtifacts(youtubeTempPrefix);
  }
}

async function getMediaExportHistory({ userId }) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("media_exports")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(RECENT_EXPORT_LIMIT);

  if (error) {
    throw createHttpError(error.message || "Could not load media export history.", 500);
  }

  return (data || []).map(mapMediaExportRecord);
}

async function getOwnedMediaExport({ userId, exportId }) {
  const { data, error } = await supabase
    .from("media_exports")
    .select("*")
    .eq("id", exportId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw createHttpError(error.message || "Could not find media export.", 500);
  }

  if (!data) {
    throw createHttpError("Media export was not found.", 404);
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    throw createHttpError(
      "This export has expired. Create it again from your original file.",
      410
    );
  }

  if (data.storage_provider && data.storage_key) {
    return {
      record: data,
      outputPath: "",
      downloadUrl: getPrivateDownloadUrl(data),
    };
  }

  // Compatibility only for exports created before durable storage was enabled.
  const outputPath = path.resolve(data.output_path || "");

  if (!isFileInsideDirectory(outputPath, OUTPUT_DIR)) {
    throw createHttpError("Invalid media export path.", 500);
  }

  try {
    await fsp.access(outputPath, fs.constants.R_OK);
  } catch {
    throw createHttpError("The export file is no longer available.", 404);
  }

  return {
    record: data,
    outputPath,
    downloadUrl: "",
  };
}

async function deleteOwnedMediaExport({ userId, exportId }) {
  const { record, outputPath } = await getOwnedMediaExport({ userId, exportId });

  // Delete the durable object before its database record to avoid leaving a
  // still-downloadable private asset after a successful database delete.
  if (record.storage_provider && record.storage_key) {
    await deleteDurableMediaExport(record);
  } else if (outputPath) {
    await safelyDeleteFile(outputPath);
  }

  const { error } = await supabase
    .from("media_exports")
    .delete()
    .eq("id", record.id)
    .eq("user_id", userId);

  if (error) {
    throw createHttpError(error.message || "Could not delete media export.", 500);
  }

  return { id: record.id };
}

async function removeTemporaryInputFile(filePath) {
  if (!filePath) return;

  const resolvedPath = path.resolve(filePath);

  if (!isFileInsideDirectory(resolvedPath, INCOMING_DIR)) {
    return;
  }

  await safelyDeleteFile(resolvedPath);
}


async function removeFileInsideDirectory(filePath, directoryPath) {
  const resolvedPath = path.resolve(filePath || "");

  if (!resolvedPath || !isFileInsideDirectory(resolvedPath, directoryPath)) {
    throw createHttpError(
      "Refusing to delete a media file outside the managed storage directory.",
      500
    );
  }

  try {
    await fsp.unlink(resolvedPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw createHttpError(
        `Could not remove media file: ${error.message}`,
        500
      );
    }
  }
}

async function deleteAllMediaExportsForUser({ userId }) {
  if (!userId) {
    throw createHttpError("User ID is required to delete media exports.", 400);
  }

  const { data: exportsList, error: listError } = await supabase
    .from("media_exports")
    .select("id, output_path, storage_provider, storage_key, storage_format")
    .eq("user_id", userId);

  if (listError) {
    throw createHttpError(
      listError.message || "Could not read user media exports.",
      500
    );
  }

  const items = exportsList || [];

  for (const item of items) {
    if (item.storage_provider && item.storage_key) {
      await deleteDurableMediaExport(item);
      continue;
    }

    if (item.output_path) {
      await removeFileInsideDirectory(item.output_path, OUTPUT_DIR);
    }
  }

  const { error: deleteError } = await supabase
    .from("media_exports")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    throw createHttpError(
      deleteError.message || "Could not delete user media export records.",
      500
    );
  }

  return {
    deletedRecords: items.length,
    deletedFiles: items.length,
  };
}

async function removeTemporaryMediaForUser({ userId }) {
  if (!userId) {
    return { deletedFiles: 0 };
  }

  const ownerPrefix = getUserTempPrefix(userId);
  const youtubePrefix = `youtube-${ownerPrefix}`;

  let entries = [];

  try {
    entries = await fsp.readdir(INCOMING_DIR, {
      withFileTypes: true,
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      return { deletedFiles: 0 };
    }

    throw createHttpError(
      `Could not inspect temporary media storage: ${error.message}`,
      500
    );
  }

  const matchingFiles = entries.filter((entry) => {
    if (!entry.isFile()) return false;

    return (
      entry.name.startsWith(ownerPrefix) ||
      entry.name.startsWith(youtubePrefix)
    );
  });

  for (const entry of matchingFiles) {
    await removeFileInsideDirectory(
      path.join(INCOMING_DIR, entry.name),
      INCOMING_DIR
    );
  }

  return {
    deletedFiles: matchingFiles.length,
  };
}

async function purgeExpiredMediaExports() {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("media_exports")
    .select("id, output_path, storage_provider, storage_key, storage_format")
    .lt("expires_at", now)
    .limit(100);

  if (error) {
    throw createHttpError(
      error.message || "Could not find expired media exports.",
      500
    );
  }

  const expiredItems = data || [];

  for (const item of expiredItems) {
    if (item.storage_provider && item.storage_key) {
      await deleteDurableMediaExport(item);
      continue;
    }

    const outputPath = path.resolve(item.output_path || "");
    if (isFileInsideDirectory(outputPath, OUTPUT_DIR)) {
      await safelyDeleteFile(outputPath);
    }
  }

  if (expiredItems.length) {
    const { error: deleteError } = await supabase
      .from("media_exports")
      .delete()
      .in(
        "id",
        expiredItems.map((item) => item.id)
      );

    if (deleteError) {
      throw createHttpError(
        deleteError.message || "Could not remove expired media export history.",
        500
      );
    }
  }

  return {
    removed: expiredItems.length,
  };
}

module.exports = {
  getYoutubeVideoPreview,
  convertOwnedMedia,
  getMediaExportHistory,
  getOwnedMediaExport,
  deleteOwnedMediaExport,
  removeTemporaryInputFile,
  deleteAllMediaExportsForUser,
  removeTemporaryMediaForUser,
  purgeExpiredMediaExports,
};