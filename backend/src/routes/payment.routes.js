const express = require("express");

const {
  requireFirebaseAuth,
} = require("../middlewares/auth.middleware");

const {
  getProAccess,
  createProQuote,
  createProOrder,
  verifyProPayment,
} = require("../controllers/payment.controller");

const {
  restorePurchaseAccess,
} = require("../controllers/purchaseRestore.controller");

const router = express.Router();

// A quote writes a short-lived server-side record, therefore POST is intentional.
router.get("/access", requireFirebaseAuth, getProAccess);

// Same verified email + still-active old subscription.
// This endpoint never creates a new period and never changes the expiry date.
router.post(
  "/restore-access",
  requireFirebaseAuth,
  restorePurchaseAccess
);

router.post("/quote", requireFirebaseAuth, createProQuote);
router.post(
  "/razorpay/order",
  requireFirebaseAuth,
  createProOrder
);
router.post(
  "/razorpay/verify",
  requireFirebaseAuth,
  verifyProPayment
);

module.exports = router;
