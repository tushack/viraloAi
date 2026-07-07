const {
  getYoutubeVideoPreview,
  convertOwnedMedia,
  getMediaExportHistory,
  getOwnedMediaExport,
  deleteOwnedMediaExport,
  removeTemporaryInputFile,
} = require("../services/mediaExport.service");

const { logActivitySafe } = require("../services/activityLog.service");
const {
  FEATURES,
  runWithFeatureQuota,
} = require("../services/planAccess.service");
const {
  claimMediaExportLease,
  releaseMediaExportLease,
} = require("../services/mediaExportLease.service");

function sendServiceError(res, error, fallbackMessage) {
  return res.status(error?.statusCode || 500).json({
    message: error?.message || fallbackMessage,
    ...(error?.code ? { code: error.code } : {}),
    ...(error?.upgrade ? { upgrade: error.upgrade } : {}),
  });
}

/*
  Preview is free.
  Actual YouTube export/download is limited for free users.
*/
async function previewYoutubeMedia(req, res) {
  try {
    const preview = await getYoutubeVideoPreview({
      videoUrl: req.body?.videoUrl,
    });

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "media.youtube_previewed",
      module: "media",
      metadata: {
        videoId: preview?.videoId || "",
        title: preview?.title || "",
      },
      req,
    });

    return res.status(200).json({ preview });
  } catch (error) {
    console.error("YouTube media preview error:", error);

    return sendServiceError(
      res,
      error,
      "Could not load YouTube preview."
    );
  }
}

/*
  Free user:
  - 3 YouTube downloads lifetime

  Paid user:
  - unlimited YouTube downloads

  Admin:
  - unlimited YouTube downloads

  Uploaded own local files:
  - not counted as YouTube download quota
*/
async function convertMediaExport(req, res) {
  let lease = null;
  let conversionCompleted = false;

  try {
    // Database-backed lease enforces both user and global concurrency across
    // every server instance before yt-dlp or FFmpeg starts.
    lease = await claimMediaExportLease({ userId: req.user.uid });

    const youtubeUrl = String(req.body?.youtubeUrl || "").trim();
    const youtubeVideoId = String(req.body?.youtubeVideoId || "").trim();
    const youtubeTitle = String(req.body?.youtubeTitle || "").trim();

    const isYoutubeDownload = Boolean(youtubeUrl || youtubeVideoId);

    const executeConversion = () =>
      convertOwnedMedia({
        userId: req.user.uid,
        file: req.file || null,
        outputType: req.body?.outputType,
        audioBitrate: req.body?.audioBitrate,
        videoQuality: req.body?.videoQuality,
        rightsAcknowledged: req.body?.rightsAcknowledged,
        youtubeUrl,
        youtubeVideoId,
        youtubeTitle,
      });

    const execution = isYoutubeDownload
      ? await runWithFeatureQuota({
          userId: req.user.uid,
          email: req.user.email,
          feature: FEATURES.YOUTUBE_DOWNLOAD,
          operation: executeConversion,
        })
      : {
          result: await executeConversion(),
          usage: null,
        };

    const exportItem = execution.result;
    conversionCompleted = true;

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "media.export_completed",
      module: "media",
      entityId: exportItem?.id || "",
      metadata: {
        sourceType: isYoutubeDownload ? "youtube" : "uploaded_file",
        outputType: exportItem?.outputType || req.body?.outputType || "",
        outputQuality: exportItem?.outputQuality || "",
        outputBytes: exportItem?.outputBytes || 0,
        youtubeTitle: exportItem?.youtubeTitle || youtubeTitle || "",
        usage: execution.usage || null,
      },
      req,
    });

    return res.status(201).json({
      message: "Your media export is ready.",
      exportItem,
      usage: execution.usage || null,
    });
  } catch (error) {
    console.error("Media conversion error:", error);

    await logActivitySafe({
      userId: req.user?.uid,
      userEmail: req.user?.email,
      eventType: "media.export_failed",
      module: "media",
      status: "failed",
      metadata: {
        message: error?.message || "",
        code: error?.code || "",
      },
      req,
    });

    return sendServiceError(res, error, "Could not export media.");
  } finally {
    await removeTemporaryInputFile(req.file?.path);
    await releaseMediaExportLease(
      lease?.id,
      conversionCompleted ? "completed" : "failed"
    );
  }
}

async function getMediaExports(req, res) {
  try {
    const items = await getMediaExportHistory({
      userId: req.user.uid,
    });

    return res.status(200).json({ items });
  } catch (error) {
    console.error("Media export history error:", error);

    return sendServiceError(
      res,
      error,
      "Could not load media export history."
    );
  }
}

/*
  This downloads an already-created export.
  It does not consume quota again.
*/
async function downloadMediaExport(req, res) {
  try {
    const { record, outputPath, downloadUrl } = await getOwnedMediaExport({
      userId: req.user.uid,
      exportId: req.params.exportId,
    });

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "media.export_downloaded",
      module: "media",
      entityId: record.id,
      metadata: {
        outputName: record.output_name,
        outputType: record.output_type,
      },
      req,
    });

    // New exports always use a short-lived, signed private-storage URL.
    if (downloadUrl) {
      return res.redirect(302, downloadUrl);
    }

    // Compatibility only for exports created before this security patch.
    res.type(record.output_mime_type || "application/octet-stream");
    return res.download(outputPath, record.output_name, (error) => {
      if (!error) return;

      console.error("Media export legacy download error:", error);

      if (!res.headersSent) {
        res.status(500).json({
          message: "Could not download this media export.",
        });
      }
    });
  } catch (error) {
    console.error("Get media export download error:", error);

    return sendServiceError(
      res,
      error,
      "Could not download media export."
    );
  }
}

async function deleteMediaExport(req, res) {
  try {
    const result = await deleteOwnedMediaExport({
      userId: req.user.uid,
      exportId: req.params.exportId,
    });

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "media.export_deleted",
      module: "media",
      entityId: req.params.exportId,
      req,
    });

    return res.status(200).json({
      message: "Media export deleted.",
      result,
    });
  } catch (error) {
    console.error("Delete media export error:", error);

    return sendServiceError(
      res,
      error,
      "Could not delete media export."
    );
  }
}

module.exports = {
  previewYoutubeMedia,
  convertMediaExport,
  getMediaExports,
  downloadMediaExport,
  deleteMediaExport,
};
