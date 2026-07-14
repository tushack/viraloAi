const admin = require("../config/firebaseAdmin");
const { rateLimit } = require("express-rate-limit");
const authenticatedUserLimiter = rateLimit({
  windowMs: 60 * 1000,

  // Har Firebase user ki separate limit.
  limit: 120,

  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => req.user.uid,

  message: {
    message:
      "You are making too many requests. Please try again after a minute.",
  },
});

async function requireFirebaseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Unauthorized. Missing Firebase token.",
      });
    }

    const idToken = authHeader.split("Bearer ")[1];

    if (!idToken) {
      return res.status(401).json({
        message: "Unauthorized. Invalid token format.",
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      emailVerified: decodedToken.email_verified === true,
      phoneNumber: decodedToken.phone_number || "",
      phoneVerified: Boolean(decodedToken.phone_number),
      name: decodedToken.name || "",
      picture: decodedToken.picture || "",
      isAdmin:
        decodedToken.admin === true ||
        decodedToken.role === "admin" ||
        decodedToken.role === "owner",
    };

    return authenticatedUserLimiter(req, res, next);
  } catch (error) {
    console.error("Firebase auth error:", error);

    return res.status(401).json({
      message: "Unauthorized. Invalid or expired Firebase token.",
    });
  }
}

module.exports = {
  requireFirebaseAuth,
};