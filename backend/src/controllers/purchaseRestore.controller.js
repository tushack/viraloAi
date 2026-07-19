const {
  restoreActivePurchaseForVerifiedUser,
} = require("../services/purchaseRestore.service");

function getErrorStatus(error, fallbackStatus = 500) {
  const status = Number(
    error?.statusCode || error?.status || fallbackStatus
  );

  if (
    Number.isInteger(status) &&
    status >= 400 &&
    status <= 599
  ) {
    return status;
  }

  return fallbackStatus;
}

async function restorePurchaseAccess(req, res) {
  try {
    const result =
      await restoreActivePurchaseForVerifiedUser({
        userId: req.user.uid,
        email: req.user.email,
        emailVerified:
          req.user.emailVerified === true,
      });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Restore purchase access error:", error);

    return res.status(getErrorStatus(error)).json({
      message:
        error.message ||
        "Could not restore active purchase.",
      ...(error.code ? { code: error.code } : {}),
    });
  }
}

module.exports = {
  restorePurchaseAccess,
};
