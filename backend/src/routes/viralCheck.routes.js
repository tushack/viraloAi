const express = require("express");

const {
  analyzeViralCheck,
} = require("../controllers/viralCheck.controller");

const {
  requireFirebaseAuth,
} = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/analyze", requireFirebaseAuth, analyzeViralCheck);

module.exports = router;
