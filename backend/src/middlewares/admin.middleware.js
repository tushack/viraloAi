const {
  getActiveAdminForFirebaseUser,
} = require("../services/adminRbac.service");

async function requireAdmin(req, res, next) {
  try {
    const adminAccount = await getActiveAdminForFirebaseUser({
      userId: req.user?.uid,
      email: req.user?.email,
    });

    if (!adminAccount) {
      return res.status(403).json({
        message: "Admin access is required for this endpoint.",
      });
    }

    req.admin = adminAccount;

    return next();
  } catch (error) {
    console.error("Admin access middleware error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Could not verify admin access.",
    });
  }
}

function requireAdminRole(...allowedRoles) {
  const allowed = new Set(
    allowedRoles.map((role) => String(role || "").toLowerCase())
  );

  return (req, res, next) => {
    if (!req.admin?.role || !allowed.has(req.admin.role)) {
      return res.status(403).json({
        message: "You do not have permission for this admin action.",
      });
    }

    return next();
  };
}

module.exports = {
  requireAdmin,
  requireAdminRole,
};