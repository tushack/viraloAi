const admin = require("../config/firebaseAdmin");

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
      name: decodedToken.name || "",
      picture: decodedToken.picture || "",
      isAdmin:
        decodedToken.admin === true ||
        decodedToken.role === "admin" ||
        decodedToken.role === "owner",
    };

    next();
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