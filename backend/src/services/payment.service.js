const crypto = require("crypto");
const https = require("https");
const Razorpay = require("razorpay");

const supabase = require("../config/supabase");
const {
  activatePaidSubscription,
  getPlanAccessForUser,
} = require("./planAccess.service");
let razorpayClient = null;
let fxRateCache = {
  usdToInr: null,
  expiresAt: 0,
};

function createHttpError(
  message,
  statusCode = 400,
  code = "",
  extra = {}
) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;

  Object.assign(error, extra);

  return error;
}

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();

  if (!value) {
    throw createHttpError(
      `${name} is not configured.`,
      500,
      "PAYMENT_CONFIGURATION_ERROR"
    );
  }

  return value;
}

function positiveInteger(value, fallback, name, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const rawValue = value === undefined || value === null || value === "" ? fallback : value;
  const numberValue = Number(rawValue);

  if (!Number.isSafeInteger(numberValue) || numberValue < min || numberValue > max) {
    throw createHttpError(
      `${name} must be a whole number between ${min} and ${max}.`,
      500,
      "PAYMENT_CONFIGURATION_ERROR"
    );
  }

  return numberValue;
}

function getPaymentConfig() {
  const baseUsdCents = positiveInteger(
    process.env.VIRALO_PRO_USD_CENTS,
    2000,
    "VIRALO_PRO_USD_CENTS",
    100,
    100000000
  );

  const periodDays = positiveInteger(
    process.env.VIRALO_PRO_PERIOD_DAYS,
    30,
    "VIRALO_PRO_PERIOD_DAYS",
    1,
    3660
  );

  const indiaTaxBps = positiveInteger(
    process.env.VIRALO_INDIA_TAX_BPS,
    1800,
    "VIRALO_INDIA_TAX_BPS",
    0,
    10000
  );

  const foreignTaxBps = positiveInteger(
    process.env.VIRALO_FOREIGN_TAX_BPS,
    0,
    "VIRALO_FOREIGN_TAX_BPS",
    0,
    10000
  );

  const fxRateCacheSeconds = positiveInteger(
    process.env.FX_RATE_CACHE_SECONDS,
    300,
    "FX_RATE_CACHE_SECONDS",
    30,
    3600
  );

  const quoteTtlMinutes = positiveInteger(
    process.env.PAYMENT_QUOTE_TTL_MINUTES,
    10,
    "PAYMENT_QUOTE_TTL_MINUTES",
    1,
    60
  );

  const fxRateUrl = String(
    process.env.FX_USD_RATE_URL || "https://open.er-api.com/v6/latest/USD"
  ).trim();

  if (!fxRateUrl) {
    throw createHttpError(
      "FX_USD_RATE_URL is not configured.",
      500,
      "PAYMENT_CONFIGURATION_ERROR"
    );
  }

  return {
    keyId: requiredEnv("RAZORPAY_KEY_ID"),
    keySecret: requiredEnv("RAZORPAY_KEY_SECRET"),
    webhookSecret: String(process.env.RAZORPAY_WEBHOOK_SECRET || "").trim(),
    baseUsdCents,
    periodDays,
    indiaTaxBps,
    foreignTaxBps,
    fxRateUrl,
    fxRateCacheSeconds,
    quoteTtlMinutes,
  };
}

function getRazorpayClient() {
  if (razorpayClient) {
    return razorpayClient;
  }

  const config = getPaymentConfig();

  razorpayClient = new Razorpay({
    key_id: config.keyId,
    key_secret: config.keySecret,
  });

  return razorpayClient;
}

function secureEquals(first, second) {
  const firstBuffer = Buffer.from(String(first || ""));
  const secondBuffer = Buffer.from(String(second || ""));

  if (!firstBuffer.length || firstBuffer.length !== secondBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(firstBuffer, secondBuffer);
}

function normalizeCountryCode(value) {
  const country = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : "";
}

function calculateTaxInclusiveBreakdown(totalMinor, taxBps) {
  const total = Number(totalMinor || 0);
  const bps = Number(taxBps || 0);

  if (!Number.isSafeInteger(total) || total < 0) {
    throw createHttpError("Invalid payment total.", 500, "PAYMENT_CONFIGURATION_ERROR");
  }

  if (!Number.isSafeInteger(bps) || bps < 0 || bps > 10000) {
    throw createHttpError("Invalid tax configuration.", 500, "PAYMENT_CONFIGURATION_ERROR");
  }

  if (!bps) {
    return {
      subtotalMinor: total,
      taxMinor: 0,
      totalMinor: total,
    };
  }

  const subtotalMinor = Math.round((total * 10000) / (10000 + bps));

  return {
    subtotalMinor,
    taxMinor: total - subtotalMinor,
    totalMinor: total,
  };
}

function getQuoteExpiry(config) {
  return new Date(Date.now() + config.quoteTtlMinutes * 60 * 1000).toISOString();
}

function calculatePeriodEnd(periodDays) {
  const periodEnd = new Date();
  periodEnd.setUTCDate(periodEnd.getUTCDate() + periodDays);
  return periodEnd.toISOString();
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function requestJson(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let parsedUrl;

    try {
      parsedUrl = new URL(url);
    } catch {
      reject(
        createHttpError(
          "FX_USD_RATE_URL must be a valid HTTPS URL.",
          500,
          "PAYMENT_CONFIGURATION_ERROR"
        )
      );
      return;
    }

    if (parsedUrl.protocol !== "https:") {
      reject(
        createHttpError(
          "FX_USD_RATE_URL must use HTTPS.",
          500,
          "PAYMENT_CONFIGURATION_ERROR"
        )
      );
      return;
    }

    const request = https.get(
      parsedUrl,
      {
        timeout: timeoutMs,
        headers: {
          Accept: "application/json",
          "User-Agent": "Viralo-Payment-Service/1.0",
        },
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");

        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`FX provider responded with HTTP ${response.statusCode}.`));
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error("FX provider returned invalid JSON."));
          }
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error("FX provider request timed out."));
    });

    request.on("error", reject);
  });
}

async function getLiveUsdToInrRate() {
  const config = getPaymentConfig();

  if (
    Number.isFinite(fxRateCache.usdToInr) &&
    fxRateCache.usdToInr > 0 &&
    fxRateCache.expiresAt > Date.now()
  ) {
    return fxRateCache.usdToInr;
  }

  try {
    const payload = await requestJson(config.fxRateUrl);
    const rate = Number(payload?.rates?.INR);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("FX provider response does not contain a valid INR rate.");
    }

    fxRateCache = {
      usdToInr: rate,
      expiresAt: Date.now() + config.fxRateCacheSeconds * 1000,
    };

    return rate;
  } catch (error) {
    console.error("Live USD/INR FX lookup failed:", error.message || error);

    throw createHttpError(
      "Live USD-to-INR pricing is temporarily unavailable. Please try again shortly.",
      503,
      "FX_RATE_UNAVAILABLE"
    );
  }
}

function toPublicQuote(quote) {
  if (!quote) return null;

  return {
    id: quote.id,
    countryCode: quote.country_code,
    currency: quote.currency,
    baseUsdCents: Number(quote.base_usd_cents),
    fxRate: quote.fx_rate === null || quote.fx_rate === undefined
      ? null
      : Number(quote.fx_rate),
    subtotalMinor: Number(quote.subtotal_minor),
    taxBps: Number(quote.tax_bps),
    taxMinor: Number(quote.tax_minor),
    totalMinor: Number(quote.total_minor),
    periodDays: Number(quote.period_days),
    expiresAt: quote.expires_at,
    createdAt: quote.created_at,
  };
}

function formatSubscriptionEnd(value) {
  const date = new Date(value || "");

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

async function getCurrentPlanAccess({ userId, email }) {
  const access = await getPlanAccessForUser({
    userId,
    email,
  });

  return {
    plan: access.plan,
    isPaid: access.isPaid,
    isAdmin: access.isAdmin,
    status:
      access.subscription?.status ||
      (access.isAdmin ? "active" : "inactive"),
    startedAt: access.subscription?.started_at || null,
    currentPeriodEnd:
      access.subscription?.current_period_end || null,
  };
}

async function ensureProPurchaseAllowed({ userId, email }) {
  const access = await getCurrentPlanAccess({
    userId,
    email,
  });

  if (!access.isPaid) {
    return access;
  }

  if (access.isAdmin) {
    throw createHttpError(
      "Admin accounts already have full Pro access.",
      409,
      "PRO_PLAN_ALREADY_ACTIVE"
    );
  }

  const formattedEnd = formatSubscriptionEnd(
    access.currentPeriodEnd
  );

  throw createHttpError(
    formattedEnd
      ? `Your Pro plan is already active until ${formattedEnd}. You can purchase again after it expires.`
      : "Your Pro plan is already active.",
    409,
    "PRO_PLAN_ALREADY_ACTIVE",
    {
      currentPeriodEnd: access.currentPeriodEnd,
    }
  );
}

async function createPaymentQuote({
  userId,
  email,
  countryCode,
}) {
  if (!userId) {
    throw createHttpError("Authenticated user is required.", 401);
  }

  await ensureProPurchaseAllowed({
    userId,
    email,
  });

  const config = getPaymentConfig();
  const resolvedCountryCode = normalizeCountryCode(countryCode) || "IN";

  let currency = "USD";
  let fxRate = null;
  let totalMinor = config.baseUsdCents;
  let taxBps = config.foreignTaxBps;

  // dollar uses
  // if (resolvedCountryCode === "IN") {
  //   fxRate = await getLiveUsdToInrRate();
  //   currency = "INR";
  //   totalMinor = Math.round(config.baseUsdCents * fxRate);
  //   taxBps = config.indiaTaxBps;
  // }


  // rupes uses
  if (resolvedCountryCode === "IN") {
    fxRate = await getLiveUsdToInrRate();
    currency = "INR";

    const testInrPaise = Number(process.env.VIRALO_PRO_TEST_INR_PAISE || 0);

    totalMinor =
      Number.isSafeInteger(testInrPaise) && testInrPaise > 0
        ? testInrPaise
        : Math.round(config.baseUsdCents * fxRate);

    taxBps = config.indiaTaxBps;
  }

  /////////////////////////////////////

  const breakdown = calculateTaxInclusiveBreakdown(totalMinor, taxBps);
  const expiresAt = getQuoteExpiry(config);

  const { data, error } = await supabase
    .from("payment_quotes")
    .insert({
      user_id: userId,
      country_code: resolvedCountryCode,
      currency,
      base_usd_cents: config.baseUsdCents,
      fx_rate: fxRate,
      subtotal_minor: breakdown.subtotalMinor,
      tax_bps: taxBps,
      tax_minor: breakdown.taxMinor,
      total_minor: breakdown.totalMinor,
      period_days: config.periodDays,
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) {
    throw createHttpError(
      error.message || "Could not create payment quote.",
      500
    );
  }

  return toPublicQuote(data);
}

async function loadOwnedQuote({ userId, quoteId }) {
  const cleanQuoteId = String(quoteId || "").trim();

  if (!cleanQuoteId) {
    throw createHttpError("A valid payment quote is required.", 400, "PAYMENT_QUOTE_REQUIRED");
  }

  const { data, error } = await supabase
    .from("payment_quotes")
    .select("*")
    .eq("id", cleanQuoteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw createHttpError(
      error.message || "Could not load payment quote.",
      500
    );
  }

  if (!data) {
    throw createHttpError("Payment quote was not found.", 404, "PAYMENT_QUOTE_NOT_FOUND");
  }

  if (data.used_at) {
    throw createHttpError(
      "This payment quote has already been used. Refresh the cart to continue.",
      409,
      "PAYMENT_QUOTE_USED"
    );
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    throw createHttpError(
      "This live price quote has expired. Refresh the cart to get the latest rate.",
      409,
      "PAYMENT_QUOTE_EXPIRED"
    );
  }

  return data;
}

async function claimQuoteForOrder({ userId, quoteId }) {
  const quote = await loadOwnedQuote({ userId, quoteId });
  const claimedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("payment_quotes")
    .update({ used_at: claimedAt })
    .eq("id", quote.id)
    .eq("user_id", userId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("*")
    .maybeSingle();

  if (error) {
    throw createHttpError(
      error.message || "Could not reserve payment quote.",
      500
    );
  }

  if (!data) {
    throw createHttpError(
      "This payment quote is no longer available. Refresh the cart and try again.",
      409,
      "PAYMENT_QUOTE_USED"
    );
  }

  return data;
}

async function releaseQuoteClaim(quoteId) {
  if (!quoteId) return;

  const { error } = await supabase
    .from("payment_quotes")
    .update({ used_at: null })
    .eq("id", quoteId);

  if (error) {
    console.error("Could not release payment quote:", error.message || error);
  }
}

async function createRazorpayOrder({ userId, email, quoteId }) {
  if (!userId) {
    throw createHttpError("Authenticated user is required.", 401);
  }

  await ensureProPurchaseAllowed({
    userId,
    email,
  });

  const config = getPaymentConfig();
  const razorpay = getRazorpayClient();
  const quote = await claimQuoteForOrder({ userId, quoteId });
  const receipt = `vr_${crypto.randomBytes(12).toString("hex")}`;

  let providerOrder;

  try {
    providerOrder = await razorpay.orders.create({
      amount: Number(quote.total_minor),
      currency: quote.currency,
      receipt,
      notes: {
        product: "viralo_pro",
        user_id: String(userId),
        quote_id: String(quote.id),
        country_code: String(quote.country_code),
        base_usd_cents: String(quote.base_usd_cents),
      },
    });
  } catch (error) {
    await releaseQuoteClaim(quote.id);

    throw createHttpError(
      error?.description || error?.message || "Could not create payment order.",
      502,
      "PAYMENT_PROVIDER_ERROR"
    );
  }

  const { error } = await supabase
    .from("payment_orders")
    .insert({
      user_id: userId,
      email: String(email || "").trim().toLowerCase() || null,
      provider: "razorpay",
      provider_order_id: providerOrder.id,
      plan: "pro",
      amount_paise: Number(quote.total_minor),
      currency: quote.currency,
      status: "created",
      quote_id: quote.id,
      country_code: quote.country_code,
      base_usd_cents: Number(quote.base_usd_cents),
      fx_rate: quote.fx_rate === null ? null : Number(quote.fx_rate),
      subtotal_minor: Number(quote.subtotal_minor),
      tax_bps: Number(quote.tax_bps),
      tax_minor: Number(quote.tax_minor),
    });

  if (error) {
    await releaseQuoteClaim(quote.id);

    throw createHttpError(
      error.message || "Could not save payment order.",
      500
    );
  }

  return {
    orderId: providerOrder.id,
    keyId: config.keyId,
    amount: Number(quote.total_minor),
    currency: quote.currency,
    quote: toPublicQuote(quote),
    plan: "pro",
  };
}

async function findPaymentOrder({ providerOrderId, userId = "" }) {
  let query = supabase
    .from("payment_orders")
    .select("*")
    .eq("provider", "razorpay")
    .eq("provider_order_id", providerOrderId);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw createHttpError(
      error.message || "Could not load payment order.",
      500
    );
  }

  return data || null;
}

async function findPaymentOrderById(orderId) {
  const { data, error } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw createHttpError(error.message || "Could not reload payment order.", 500);
  }

  return data || null;
}

function verifyCheckoutSignature({ orderId, paymentId, signature }) {
  const { keySecret } = getPaymentConfig();
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return secureEquals(expectedSignature, signature);
}

async function waitForAlreadyProcessingPayment(orderId, paymentId) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await sleep(350);

    const currentOrder = await findPaymentOrderById(orderId);

    if (
      currentOrder?.status === "paid" &&
      String(currentOrder.provider_payment_id || "") === String(paymentId)
    ) {
      return currentOrder;
    }
  }

  return null;
}

async function claimPaymentOrderForCapture({ paymentOrder, paymentId }) {
  if (
    paymentOrder.status === "paid" &&
    String(paymentOrder.provider_payment_id || "") === String(paymentId)
  ) {
    return {
      claimed: false,
      alreadyPaid: true,
      paymentOrder,
    };
  }

  if (
    paymentOrder.provider_payment_id &&
    String(paymentOrder.provider_payment_id) !== String(paymentId)
  ) {
    throw createHttpError("Payment ID does not match this order.", 400, "PAYMENT_MISMATCH");
  }

  const { data, error } = await supabase
    .from("payment_orders")
    .update({
      status: "capturing",
      provider_payment_id: paymentId,
    })
    .eq("id", paymentOrder.id)
    .in("status", ["created", "capture_failed"])
    .select("*")
    .maybeSingle();

  if (error) {
    throw createHttpError(
      error.message || "Could not reserve payment processing.",
      500
    );
  }

  if (data) {
    return {
      claimed: true,
      alreadyPaid: false,
      paymentOrder: data,
    };
  }

  const latestOrder = await waitForAlreadyProcessingPayment(paymentOrder.id, paymentId);

  if (latestOrder) {
    return {
      claimed: false,
      alreadyPaid: true,
      paymentOrder: latestOrder,
    };
  }

  throw createHttpError(
    "Payment verification is already being processed. Please refresh shortly.",
    409,
    "PAYMENT_PROCESSING"
  );
}

async function markPaymentOrderCaptureFailed(orderId) {
  if (!orderId) return;

  const { error } = await supabase
    .from("payment_orders")
    .update({ status: "capture_failed" })
    .eq("id", orderId)
    .eq("status", "capturing");

  if (error) {
    console.error("Could not mark payment order as capture_failed:", error.message || error);
  }
}

async function finalizeCapturedPayment({ paymentOrder, payment }) {
  const config = getPaymentConfig();
  const paymentId = String(payment?.id || "").trim();
  const providerOrderId = String(payment?.order_id || "").trim();
  const paymentStatus = String(payment?.status || "").trim().toLowerCase();
  const paymentAmount = Number(payment?.amount || 0);
  const paymentCurrency = String(payment?.currency || "").trim().toUpperCase();

  if (!paymentId || !providerOrderId) {
    throw createHttpError(
      "Payment provider did not return complete payment details.",
      502,
      "PAYMENT_PROVIDER_ERROR"
    );
  }

  if (providerOrderId !== paymentOrder.provider_order_id) {
    throw createHttpError("Payment order mismatch.", 400, "PAYMENT_MISMATCH");
  }

  if (paymentStatus !== "captured") {
    throw createHttpError(
      "Payment is not captured yet. Please wait a moment and try again.",
      409,
      "PAYMENT_PENDING"
    );
  }

  if (
    paymentAmount !== Number(paymentOrder.amount_paise) ||
    paymentCurrency !== String(paymentOrder.currency).toUpperCase()
  ) {
    throw createHttpError(
      "Payment amount or currency mismatch.",
      400,
      "PAYMENT_MISMATCH"
    );
  }

  const claim = await claimPaymentOrderForCapture({
    paymentOrder,
    paymentId,
  });

  if (claim.alreadyPaid) {
    return {
      subscription: null,
      paidAt: claim.paymentOrder.paid_at || null,
      alreadyProcessed: true,
    };
  }

  const claimedOrder = claim.paymentOrder;
  const paidAt = new Date().toISOString();
  const currentPeriodEnd = calculatePeriodEnd(config.periodDays);

  try {
    const { error: transactionError } = await supabase
      .from("payment_transactions")
      .upsert(
        {
          user_id: claimedOrder.user_id,
          provider: "razorpay",
          provider_order_id: claimedOrder.provider_order_id,
          provider_payment_id: paymentId,
          plan: "pro",
          amount_paise: paymentAmount,
          currency: paymentCurrency,
          status: "captured",
          provider_payload: {
            providerStatus: paymentStatus,
            method: String(payment?.method || "").slice(0, 40) || null,
            capturedAt: paidAt,
            quoteId: claimedOrder.quote_id || null,
          },
          paid_at: paidAt,
        },
        { onConflict: "provider_payment_id" }
      );

    if (transactionError) {
      throw createHttpError(
        transactionError.message || "Could not save payment transaction.",
        500
      );
    }

    const subscription = await activatePaidSubscription({
      userId: claimedOrder.user_id,
      email: claimedOrder.email || "",
      provider: "razorpay",
      providerPaymentId: paymentId,
      currentPeriodEnd,
    });

    const { error: orderUpdateError } = await supabase
      .from("payment_orders")
      .update({
        status: "paid",
        provider_payment_id: paymentId,
        paid_at: paidAt,
      })
      .eq("id", claimedOrder.id)
      .eq("status", "capturing");

    if (orderUpdateError) {
      throw createHttpError(
        orderUpdateError.message || "Could not update payment order.",
        500
      );
    }

    return {
      subscription,
      paidAt,
      alreadyProcessed: false,
    };
  } catch (error) {
    await markPaymentOrderCaptureFailed(claimedOrder.id);
    throw error;
  }
}

async function verifyRazorpayPayment({ userId, orderId, paymentId, signature }) {
  const cleanOrderId = String(orderId || "").trim();
  const cleanPaymentId = String(paymentId || "").trim();
  const cleanSignature = String(signature || "").trim();

  if (!cleanOrderId || !cleanPaymentId || !cleanSignature) {
    throw createHttpError("Incomplete payment verification details.", 400);
  }

  const paymentOrder = await findPaymentOrder({
    providerOrderId: cleanOrderId,
    userId,
  });

  if (!paymentOrder) {
    throw createHttpError("Payment order was not found.", 404);
  }

  if (!verifyCheckoutSignature({
    orderId: cleanOrderId,
    paymentId: cleanPaymentId,
    signature: cleanSignature,
  })) {
    throw createHttpError(
      "Payment signature verification failed.",
      400,
      "PAYMENT_SIGNATURE_INVALID"
    );
  }

  let payment;

  try {
    payment = await getRazorpayClient().payments.fetch(cleanPaymentId);
  } catch (error) {
    throw createHttpError(
      error?.description || error?.message || "Could not verify payment status.",
      502,
      "PAYMENT_PROVIDER_ERROR"
    );
  }

  const finalized = await finalizeCapturedPayment({
    paymentOrder,
    payment,
  });

  return {
    message: finalized.alreadyProcessed
      ? "Payment was already verified. Pro unlimited access is active."
      : "Payment verified. Pro unlimited access is active.",
    subscription: finalized.subscription,
  };
}

async function handleRazorpayWebhook({ rawBody, signature }) {
  const rawText = Buffer.isBuffer(rawBody)
    ? rawBody.toString("utf8")
    : String(rawBody || "");

  const { webhookSecret } = getPaymentConfig();

  if (!webhookSecret) {
    throw createHttpError(
      "RAZORPAY_WEBHOOK_SECRET is not configured.",
      500,
      "PAYMENT_CONFIGURATION_ERROR"
    );
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawText)
    .digest("hex");

  if (!secureEquals(expectedSignature, signature)) {
    throw createHttpError(
      "Invalid payment webhook signature.",
      401,
      "PAYMENT_WEBHOOK_SIGNATURE_INVALID"
    );
  }

  let payload;

  try {
    payload = JSON.parse(rawText);
  } catch {
    throw createHttpError("Invalid payment webhook body.", 400);
  }

  if (payload?.event !== "payment.captured") {
    return { ignored: true };
  }

  const payment = payload?.payload?.payment?.entity;
  const providerOrderId = String(payment?.order_id || "").trim();

  if (!providerOrderId) {
    return { ignored: true };
  }

  const paymentOrder = await findPaymentOrder({ providerOrderId });

  if (!paymentOrder) {
    return { ignored: true };
  }

  try {
    await finalizeCapturedPayment({ paymentOrder, payment });
  } catch (error) {
    if (error?.code === "PAYMENT_PROCESSING") {
      return { ignored: false, processing: true };
    }

    throw error;
  }

  return { ignored: false };
}

module.exports = {
  createPaymentQuote,
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
  getCurrentPlanAccess,
};
