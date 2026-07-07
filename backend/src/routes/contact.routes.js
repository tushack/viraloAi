const express = require("express");
const { submitContactMessage } = require("../controllers/contact.controller");

const router = express.Router();

// Public by design: Razorpay reviewers and visitors can use the contact form
// without logging in. The controller validates input, uses a honeypot, and
// enforces a Firestore-backed sender rate limit.
router.post("/messages", submitContactMessage);

module.exports = router;
