const express = require("express");

const {
  requireFirebaseAuth,
} = require("../middlewares/auth.middleware");

const {
  createProQuote,
  createProOrder,
  verifyProPayment,
} = require("../controllers/payment.controller");

const router = express.Router();

// A quote writes a short-lived server-side record, therefore POST is intentional.
router.post("/quote", requireFirebaseAuth, createProQuote);
router.post("/razorpay/order", requireFirebaseAuth, createProOrder);
router.post("/razorpay/verify", requireFirebaseAuth, verifyProPayment);

module.exports = router;
