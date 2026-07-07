const {
  createPaymentQuote,
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
} = require("../services/payment.service");

function sendError(res, error, fallbackMessage) {
  return res.status(error?.statusCode || 500).json({
    message: error?.message || fallbackMessage,
    ...(error?.code ? { code: error.code } : {}),
  });
}

function getCheckoutCountry(req) {
  const defaultCountry = String(
    process.env.PAYMENT_DEFAULT_COUNTRY || "IN"
  )
    .trim()
    .toUpperCase();

  const trustedGeoHeaders = ["true", "1", "yes"].includes(
    String(process.env.PAYMENT_TRUSTED_GEO_HEADERS || "")
      .trim()
      .toLowerCase()
  );

  if (!trustedGeoHeaders) {
    return /^[A-Z]{2}$/.test(defaultCountry) ? defaultCountry : "IN";
  }

  const cloudflareCountry = String(req.headers["cf-ipcountry"] || "")
    .trim()
    .toUpperCase();

  const vercelCountry = String(req.headers["x-vercel-ip-country"] || "")
    .trim()
    .toUpperCase();

  const detectedCountry = cloudflareCountry || vercelCountry;

  if (/^[A-Z]{2}$/.test(detectedCountry) && detectedCountry !== "XX") {
    return detectedCountry;
  }

  return /^[A-Z]{2}$/.test(defaultCountry) ? defaultCountry : "IN";
}

async function createProQuote(req, res) {
  try {
    const quote = await createPaymentQuote({
      userId: req.user.uid,
      countryCode: getCheckoutCountry(req),
    });

    return res.status(201).json({ quote });
  } catch (error) {
    console.error("Create payment quote error:", error);
    return sendError(res, error, "Could not create live payment quote.");
  }
}

async function createProOrder(req, res) {
  try {
    const order = await createRazorpayOrder({
      userId: req.user.uid,
      email: req.user.email,
      quoteId: req.body?.quoteId,
    });

    return res.status(201).json({ order });
  } catch (error) {
    console.error("Create payment order error:", error);
    return sendError(res, error, "Could not start payment.");
  }
}

async function verifyProPayment(req, res) {
  try {
    const result = await verifyRazorpayPayment({
      userId: req.user.uid,
      orderId: req.body?.razorpay_order_id,
      paymentId: req.body?.razorpay_payment_id,
      signature: req.body?.razorpay_signature,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Verify payment error:", error);
    return sendError(res, error, "Could not verify payment.");
  }
}

async function razorpayWebhook(req, res) {
  try {
    await handleRazorpayWebhook({
      rawBody: req.body,
      signature: req.headers["x-razorpay-signature"],
    });

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return sendError(res, error, "Webhook processing failed.");
  }
}

module.exports = {
  createProQuote,
  createProOrder,
  verifyProPayment,
  razorpayWebhook,
};
