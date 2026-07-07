const express = require("express");

const {
  getTrendFeed,
  searchTrendTopics,
} = require("../controllers/trends.controller");

const {
  requireFirebaseAuth,
} = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/feed", requireFirebaseAuth, getTrendFeed);

router.post("/search", requireFirebaseAuth, searchTrendTopics);

module.exports = router;