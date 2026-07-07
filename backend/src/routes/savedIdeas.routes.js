const express = require("express");
const router = express.Router();

const {
  createSavedIdea,
  getSavedIdeas,
  deleteSavedIdea,
} = require("../controllers/savedIdeas.controller");

const {
  requireFirebaseAuth,
} = require("../middlewares/auth.middleware");

router.post("/", requireFirebaseAuth, createSavedIdea);
router.get("/", requireFirebaseAuth, getSavedIdeas);
router.delete("/:id", requireFirebaseAuth, deleteSavedIdea);

module.exports = router;