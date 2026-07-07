const express = require("express");
const router = express.Router();

const {
  deleteSelectedRecords,
  requestDeleteAccountOtp,
  deleteAccount,
  purgeDueArchives,
} = require("../controllers/dataPrivacy.controller");

const {
  requireFirebaseAuth,
} = require("../middlewares/auth.middleware");

router.post("/delete-records", requireFirebaseAuth, deleteSelectedRecords);
router.post("/delete-account-code", requireFirebaseAuth, requestDeleteAccountOtp);
router.post("/delete-account", requireFirebaseAuth, deleteAccount);

router.post("/purge-due", purgeDueArchives);

module.exports = router;