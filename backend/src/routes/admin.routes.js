const express = require("express");

const {
  getAdminAccess,
  getAdminSummary,
  listAdminUsers,
  getAdminUser,
  updateAdminUserStatus,
  createAdminUserNote,
  listAdminActivity,
  listAdminCalendarEvents,
  listAdminMediaExports,
  listAdminAccounts,
  createAdminAccount,
  updateAdminAccount,
  listAdminContactMessages,
  updateAdminContactMessageStatus,
  deleteAdminAccount,

} = require("../controllers/admin.controller");

const {
  requireFirebaseAuth,
} = require("../middlewares/auth.middleware");

const {
  requireAdmin,
  requireAdminRole,
} = require("../middlewares/admin.middleware");

const router = express.Router();

router.use(requireFirebaseAuth, requireAdmin);

router.get("/access", getAdminAccess);

router.get("/overview", getAdminSummary);
router.get("/users", listAdminUsers);
router.get("/users/:userId", getAdminUser);

router.patch(
  "/users/:userId/status",
  requireAdminRole("owner", "admin"),
  updateAdminUserStatus
);

router.post(
  "/users/:userId/notes",
  requireAdminRole("owner", "admin", "support"),
  createAdminUserNote
);

router.get("/contact-messages", listAdminContactMessages);

router.patch(
  "/contact-messages/:messageId/status",
  requireAdminRole("owner", "admin", "support"),
  updateAdminContactMessageStatus
);

router.get("/activity", listAdminActivity);
router.get("/calendar-events", listAdminCalendarEvents);
router.get("/media-exports", listAdminMediaExports);

/*
  Admin access control:
  Only owner can add, remove, activate, deactivate, or change roles.
*/
router.get(
  "/admins",
  requireAdminRole("owner"),
  listAdminAccounts
);

router.post(
  "/admins",
  requireAdminRole("owner"),
  createAdminAccount
);

router.patch(
  "/admins/:adminId",
  requireAdminRole("owner"),
  updateAdminAccount
);

router.delete(
  "/admins/:adminId",
  requireAdminRole("owner"),
  deleteAdminAccount
);

module.exports = router;