const express = require("express");
const router = express.Router();

const {
  generateResearch,
  getDailyNicheIdeas,
  getTopYouTubeChannels,
  getResearchHistory,
  analyzeCompetitorChannel,
  createContentPack,
  generateThumbnail,
} = require("../controllers/research.controller");

const {
  requireFirebaseAuth,
} = require("../middlewares/auth.middleware");

router.post("/generate", requireFirebaseAuth, generateResearch);
router.get("/daily", requireFirebaseAuth, getDailyNicheIdeas);
router.get("/top-channels", requireFirebaseAuth, getTopYouTubeChannels);
router.get("/history", requireFirebaseAuth, getResearchHistory);
router.post("/analyze-channel", requireFirebaseAuth, analyzeCompetitorChannel);
router.post("/content-pack", requireFirebaseAuth, createContentPack);
router.post("/thumbnail", requireFirebaseAuth, generateThumbnail);

module.exports = router;