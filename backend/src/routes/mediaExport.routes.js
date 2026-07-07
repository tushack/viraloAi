const express = require("express");
const multer = require("multer");

const {
  previewYoutubeMedia,
  convertMediaExport,
  getMediaExports,
  downloadMediaExport,
  deleteMediaExport,
} = require("../controllers/mediaExport.controller");

const {
  requireFirebaseAuth,
} = require("../middlewares/auth.middleware");

const {
  ownedMediaUpload,
} = require("../middlewares/mediaUpload.middleware");

const router = express.Router();

function uploadOriginalVideo(req, res, next) {
  ownedMediaUpload.single("file")(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "The uploaded file is larger than the allowed media export limit.",
      });
    }

    return res.status(400).json({
      message: error.message || "Could not upload the original video file.",
    });
  });
}

router.post("/youtube-preview", requireFirebaseAuth, previewYoutubeMedia);
router.post(
  "/convert",
  requireFirebaseAuth,
  uploadOriginalVideo,
  convertMediaExport
);
router.get("/", requireFirebaseAuth, getMediaExports);
router.get("/:exportId/download", requireFirebaseAuth, downloadMediaExport);
router.delete("/:exportId", requireFirebaseAuth, deleteMediaExport);

module.exports = router;