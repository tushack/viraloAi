const crypto = require("crypto");
const { v2: cloudinary } = require("cloudinary");

function createHttpError(message, statusCode = 500, code = "") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function requiredEnv(name, minLength = 1) {
  const value = String(process.env[name] || "").trim();

  if (value.length < minLength) {
    throw createHttpError(
      `${name} is not configured for durable media storage.`,
      500,
      "MEDIA_STORAGE_CONFIGURATION_ERROR"
    );
  }

  return value;
}

function getStorageConfig() {
  const folder = String(process.env.CLOUDINARY_MEDIA_EXPORT_FOLDER || "viralo-media-exports")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9_\-/]/g, "-")
    .slice(0, 180);

  return {
    cloudName: requiredEnv("CLOUDINARY_CLOUD_NAME", 2),
    apiKey: requiredEnv("CLOUDINARY_API_KEY", 6),
    apiSecret: requiredEnv("CLOUDINARY_API_SECRET", 16),
    folder: folder || "viralo-media-exports",
  };
}

function configureCloudinary() {
  const config = getStorageConfig();

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  return config;
}

function ownerFolder(userId) {
  return crypto
    .createHash("sha256")
    .update(String(userId || ""))
    .digest("hex")
    .slice(0, 24);
}

async function uploadMediaExportToCloudinary({
  userId,
  exportId,
  outputPath,
  outputName,
}) {
  const config = configureCloudinary();
  const publicId = `${config.folder}/${ownerFolder(userId)}/${exportId}`;

  let uploaded;
  try {
    uploaded = await cloudinary.uploader.upload(outputPath, {
      resource_type: "video",
      type: "private",
      public_id: publicId,
      overwrite: false,
      unique_filename: false,
      use_filename: false,
      filename_override: String(outputName || "media-export").slice(0, 220),
      context: {
        application: "viralo-ai",
        export_id: String(exportId),
      },
    });
  } catch (error) {
    throw createHttpError(
      error?.message || "Could not move the media export into durable storage.",
      502,
      "MEDIA_STORAGE_UPLOAD_FAILED"
    );
  }

  if (!uploaded?.public_id || !uploaded?.format) {
    throw createHttpError(
      "Durable storage did not return the saved media file details.",
      502,
      "MEDIA_STORAGE_UPLOAD_FAILED"
    );
  }

  return {
    provider: "cloudinary",
    key: uploaded.public_id,
    format: uploaded.format,
  };
}

function getPrivateDownloadUrl(record) {
  configureCloudinary();

  if (!record?.storage_key || !record?.storage_format) {
    throw createHttpError("Stored media export details are incomplete.", 500);
  }

  const expiresAt = Math.floor(Date.now() / 1000) + 60;

  return cloudinary.utils.private_download_url(
    record.storage_key,
    record.storage_format,
    {
      resource_type: "video",
      type: "private",
      attachment: String(record.output_name || "media-export").slice(0, 220),
      expires_at: expiresAt,
    }
  );
}

async function deleteDurableMediaExport(record) {
  if (!record?.storage_provider || !record?.storage_key) return;

  if (record.storage_provider !== "cloudinary") {
    throw createHttpError("Unsupported media storage provider.", 500);
  }

  configureCloudinary();

  try {
    await cloudinary.uploader.destroy(record.storage_key, {
      resource_type: "video",
      type: "private",
      invalidate: true,
    });
  } catch (error) {
    throw createHttpError(
      error?.message || "Could not delete the stored media export.",
      502,
      "MEDIA_STORAGE_DELETE_FAILED"
    );
  }
}

module.exports = {
  uploadMediaExportToCloudinary,
  getPrivateDownloadUrl,
  deleteDurableMediaExport,
};
