const crypto = require("crypto");
const admin = require("../config/firebaseAdmin");

const CONTACT_WINDOW_MS = 15 * 60 * 1000;
const CONTACT_MAX_PER_WINDOW = 3;
const CONTACT_MIN_MESSAGE_LENGTH = 10;
const CONTACT_MAX_MESSAGE_LENGTH = 5000;

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function cleanText(value, maxLength) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function normalizeEmail(value) {
  const email = cleanText(value, 320).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createHttpError("Please enter a valid email address.", 400);
  }

  return email;
}

function getClientIp(req) {
  // Do not trust a client-provided X-Forwarded-For value unless the production
  // proxy configuration is explicitly trusted at the server level.
  return cleanText(req.ip || req.socket?.remoteAddress || "unknown", 200);
}

function getRateLimitSecret() {
  const secret = String(process.env.CONTACT_RATE_LIMIT_SECRET || "").trim();

  if (secret.length < 32) {
    throw createHttpError(
      "Contact form is temporarily unavailable. Server configuration is incomplete.",
      503
    );
  }

  return secret;
}

function makeRateLimitKey(ipAddress, email) {
  // Combining IP + normalised email avoids accidentally placing every visitor
  // behind a shared hosting proxy into one rate-limit bucket. The stored value
  // remains an irreversible HMAC hash, not raw PII.
  return crypto
    .createHmac("sha256", getRateLimitSecret())
    .update(`${ipAddress}\n${email}`)
    .digest("hex");
}

async function enforceContactRateLimit(db, ipHash) {
  const limitRef = db.collection("contact_rate_limits").doc(ipHash);
  const now = Date.now();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(limitRef);
    const existing = snapshot.exists ? snapshot.data() || {} : {};
    const windowStartedAtMs = Number(existing.windowStartedAtMs || 0);
    const isNewWindow = now - windowStartedAtMs >= CONTACT_WINDOW_MS;
    const nextWindowStartedAtMs = isNewWindow ? now : windowStartedAtMs;
    const currentCount = isNewWindow ? 0 : Number(existing.count || 0);

    if (currentCount >= CONTACT_MAX_PER_WINDOW) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((CONTACT_WINDOW_MS - (now - nextWindowStartedAtMs)) / 1000)
      );

      throw createHttpError(
        `Too many contact messages. Please try again in ${retryAfterSeconds} seconds.`,
        429
      );
    }

    transaction.set(
      limitRef,
      {
        count: currentCount + 1,
        windowStartedAtMs: nextWindowStartedAtMs,
        expiresAtMs: nextWindowStartedAtMs + CONTACT_WINDOW_MS,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

async function resolveOptionalFirebaseUser(req) {
  const authHeader = String(req.headers.authorization || "").trim();

  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith("Bearer ")) {
    throw createHttpError("Unauthorized. Invalid token format.", 401);
  }

  const idToken = authHeader.slice("Bearer ".length).trim();

  if (!idToken) {
    throw createHttpError("Unauthorized. Invalid token format.", 401);
  }

  const decodedToken = await admin.auth().verifyIdToken(idToken, true);

  return {
    uid: decodedToken.uid || "",
    email: cleanText(decodedToken.email, 320).toLowerCase(),
  };
}

async function submitContactMessage(req, res) {
  try {
    const fullName = cleanText(req.body?.fullName, 120);
    const email = normalizeEmail(req.body?.email);
    const message = cleanText(req.body?.message, CONTACT_MAX_MESSAGE_LENGTH);
    const honeypotValue = cleanText(req.body?.website, 300);

    // Bots commonly fill every field. Return a generic success message so they
    // cannot use the endpoint as an oracle.
    if (honeypotValue) {
      return res.status(201).json({
        message: "Thanks for contacting Viralo AI. Our team will get back to you soon.",
      });
    }

    if (fullName.length < 2) {
      throw createHttpError("Please enter your full name.", 400);
    }

    if (message.length < CONTACT_MIN_MESSAGE_LENGTH) {
      throw createHttpError(
        `Please write a message of at least ${CONTACT_MIN_MESSAGE_LENGTH} characters.`,
        400
      );
    }

    const db = admin.firestore();
    const optionalUser = await resolveOptionalFirebaseUser(req);
    const ipHash = makeRateLimitKey(getClientIp(req), email);

    await enforceContactRateLimit(db, ipHash);

    const createdAtMs = Date.now();
    const messageRef = await db.collection("contact_messages").add({
      fullName,
      email,
      message,
      status: "new",
      source: "website_contact_form",
      accountUid: optionalUser?.uid || null,
      accountEmail: optionalUser?.email || null,
      ipHash,
      userAgent: cleanText(req.get("user-agent"), 300),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtMs,
    });

    return res.status(201).json({
      message: "Thanks for contacting Viralo AI. Our team will get back to you soon.",
      messageId: messageRef.id,
    });
  } catch (error) {
    console.error("Contact form submission failed:", error.message);

    return res.status(error.statusCode || 500).json({
      message:
        error.statusCode && error.statusCode < 500
          ? error.message
          : "We could not send your message right now. Please try again shortly.",
    });
  }
}

module.exports = {
  submitContactMessage,
};
