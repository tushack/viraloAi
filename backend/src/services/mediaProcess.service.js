const { spawn } = require("child_process");

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

function getProcessTimeoutMs(envName, fallbackSeconds, maximumSeconds) {
  return boundedInteger(
    process.env[envName],
    fallbackSeconds,
    30,
    maximumSeconds
  ) * 1000;
}

function appendLimited(current, chunk, maxBytes = 24 * 1024) {
  if (current.length >= maxBytes) return current;
  return `${current}${String(chunk || "")}`.slice(0, maxBytes);
}

function runMediaProcess({
  command,
  args,
  label,
  timeoutMs,
  captureStdout = false,
}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timedOut = false;
    let stdout = "";
    let stderr = "";
    let forceKillTimer = null;

    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      callback();
    };

    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ["ignore", captureStdout ? "pipe" : "ignore", "pipe"],
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceKillTimer = setTimeout(() => child.kill("SIGKILL"), 5_000);
      forceKillTimer.unref?.();
    }, timeoutMs);
    timeout.unref?.();

    child.stdout?.on("data", (chunk) => {
      stdout = appendLimited(stdout, chunk);
    });

    child.stderr?.on("data", (chunk) => {
      stderr = appendLimited(stderr, chunk);
    });

    child.on("error", (error) => {
      finish(() => {
        if (error.code === "ENOENT") {
          reject(
            createHttpError(
              `${label} was not found on the server. Configure its executable path and restart.`,
              500,
              "MEDIA_TOOL_NOT_FOUND"
            )
          );
          return;
        }

        reject(
          createHttpError(
            `${label} could not start: ${error.message}`,
            500,
            "MEDIA_TOOL_START_FAILED"
          )
        );
      });
    });

    child.on("close", (code, signal) => {
      finish(() => {
        if (timedOut) {
          reject(
            createHttpError(
              `${label} exceeded the permitted processing time. Try a shorter or smaller media file.`,
              408,
              "MEDIA_PROCESS_TIMEOUT"
            )
          );
          return;
        }

        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }

        const detail = stderr
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(-4)
          .join(" ");

        reject(
          createHttpError(
            detail
              ? `${label} failed. ${detail}`
              : `${label} failed${signal ? ` (${signal})` : ""}.`,
            422,
            "MEDIA_PROCESS_FAILED"
          )
        );
      });
    });
  });
}

async function runFfmpegProcess(command, args) {
  return runMediaProcess({
    command,
    args,
    label: "FFmpeg",
    timeoutMs: getProcessTimeoutMs("MEDIA_EXPORT_FFMPEG_TIMEOUT_SECONDS", 600, 1_800),
  });
}

async function runYtDlpProcess(command, args) {
  return runMediaProcess({
    command,
    args,
    label: "yt-dlp",
    timeoutMs: getProcessTimeoutMs("MEDIA_EXPORT_YTDLP_TIMEOUT_SECONDS", 600, 1_800),
    captureStdout: true,
  });
}

async function inspectMediaFile({ ffprobeCommand, filePath, requireVideo = false }) {
  const result = await runMediaProcess({
    command: ffprobeCommand,
    args: [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_type",
      "-of",
      "json",
      filePath,
    ],
    label: "FFprobe",
    timeoutMs: getProcessTimeoutMs("MEDIA_EXPORT_FFPROBE_TIMEOUT_SECONDS", 60, 300),
    captureStdout: true,
  });

  let parsed;
  try {
    parsed = JSON.parse(result.stdout || "{}");
  } catch {
    throw createHttpError(
      "The uploaded file is not a readable media file.",
      422,
      "MEDIA_FILE_INVALID"
    );
  }

  const streamTypes = new Set(
    (parsed.streams || []).map((stream) => String(stream?.codec_type || "").toLowerCase())
  );

  if (!streamTypes.has("video") && !streamTypes.has("audio")) {
    throw createHttpError(
      "The uploaded file does not contain a valid video or audio stream.",
      422,
      "MEDIA_FILE_INVALID"
    );
  }

  if (requireVideo && !streamTypes.has("video")) {
    throw createHttpError(
      "A video stream is required for MP4 export.",
      422,
      "MEDIA_VIDEO_REQUIRED"
    );
  }
}

module.exports = {
  runFfmpegProcess,
  runYtDlpProcess,
  inspectMediaFile,
};
