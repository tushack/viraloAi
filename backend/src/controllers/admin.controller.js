const {
  getAdminOverview,
  getAdminUsers,
  getAdminUserDetail,
  setFirebaseUserDisabled,
  addAdminUserNote,
  getAdminActivity,
  getAdminCalendarEvents,
  getAdminMediaExports,
  getAdminPayments,
} = require("../services/admin.service");

const {
  listAdminAccounts: listAdminAccountsService,
  createAdminAccount: createAdminAccountService,
  updateAdminAccount: updateAdminAccountService,
  getAdminAccountByUserId,
} = require("../services/adminRbac.service");
const {
  listAdminContactMessages: listAdminContactMessagesService,
  updateAdminContactMessageStatus: updateAdminContactMessageStatusService,
} = require("../services/adminContactMessages.service");

const {
  logActivitySafe,
} = require("../services/activityLog.service");

const {
  writeAdminAuditSafe,
} = require("../services/adminAudit.service");

function sendError(res, error, fallbackMessage) {
  return res.status(error.statusCode || 500).json({
    message: error.message || fallbackMessage,
  });
}

function adminCapabilities(role) {
  return {
    canManageAdmins: role === "owner",
    canManageUsers: role === "owner" || role === "admin",
    canAddNotes: ["owner", "admin", "support"].includes(role),
    readOnly: role === "viewer",
  };
}

function getAdminAccess(req, res) {
  return res.status(200).json({
    allowed: true,
    admin: {
      ...req.admin,
      capabilities: adminCapabilities(req.admin.role),
    },
  });
}

async function getAdminSummary(req, res) {
  try {
    const result = await getAdminOverview({
      days: req.query?.days,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Admin overview error:", error);
    return sendError(res, error, "Could not load admin overview.");
  }
}

async function listAdminPayments(req, res) {
  try {
    const result = await getAdminPayments({
      page: req.query?.page,
      limit: req.query?.limit,
      userId: req.query?.userId,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Admin payments error:", error);

    return sendError(
      res,
      error,
      "Could not load successful payments."
    );
  }
}

async function listAdminUsers(req, res) {
  try {
    const result = await getAdminUsers({
      search: req.query?.search,
      page: req.query?.page,
      limit: req.query?.limit,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Admin users error:", error);
    return sendError(res, error, "Could not load users.");
  }
}

async function getAdminUser(req, res) {
  try {
    const result = await getAdminUserDetail(req.params.userId);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Admin user detail error:", error);
    return sendError(res, error, "Could not load user details.");
  }
}

async function updateAdminUserStatus(req, res) {
  try {
    const targetUserId = String(req.params.userId || "").trim();
    const disabled = req.body?.disabled === true;

    if (!targetUserId) {
      return res.status(400).json({
        message: "User ID is required.",
      });
    }

    if (targetUserId === req.user.uid && disabled) {
      return res.status(400).json({
        message: "You cannot disable the account currently used for admin access.",
      });
    }

    /*
      Existing admins must be deactivated through:
      PATCH /api/admin/admins/:adminId
      with { isActive: false }

      This prevents normal admins from disabling owner/admin accounts.
    */
    const targetAdmin = await getAdminAccountByUserId(targetUserId);

    if (targetAdmin?.isActive && disabled) {
      return res.status(409).json({
        message:
          "This user has active admin access. Deactivate their admin role from Access Control before disabling their Firebase account.",
      });
    }

    const user = await setFirebaseUserDisabled({
      userId: targetUserId,
      disabled,
    });

    await logActivitySafe({
      userId: targetUserId,
      userEmail: user.email,
      eventType: disabled
        ? "admin.user_disabled"
        : "admin.user_enabled",
      module: "admin",
      entityId: targetUserId,
      metadata: {
        performedByUserId: req.user.uid,
        performedByEmail: req.user.email,
      },
      req,
    });

    await writeAdminAuditSafe({
      req,
      action: disabled ? "admin.user_disabled" : "admin.user_enabled",
      targetUserId,
      targetEmail: user.email,
      before: {
        disabled: !disabled,
      },
      after: {
        disabled,
      },
    });

    return res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Admin user status error:", error);
    return sendError(res, error, "Could not update user status.");
  }
}

async function createAdminUserNote(req, res) {
  try {
    const note = await addAdminUserNote({
      userId: req.params.userId,
      note: req.body?.note,
      createdByUserId: req.user.uid,
      createdByEmail: req.user.email,
    });

    await logActivitySafe({
      userId: req.params.userId,
      eventType: "admin.note_added",
      module: "admin",
      entityId: note.id,
      metadata: {
        performedByUserId: req.user.uid,
        performedByEmail: req.user.email,
      },
      req,
    });

    await writeAdminAuditSafe({
      req,
      action: "admin.note_added",
      targetUserId: req.params.userId,
      before: {},
      after: {
        noteId: note.id,
      },
    });

    return res.status(201).json({
      note,
    });
  } catch (error) {
    console.error("Admin user note error:", error);
    return sendError(res, error, "Could not save admin note.");
  }
}

async function listAdminActivity(req, res) {
  try {
    const result = await getAdminActivity({
      page: req.query?.page,
      limit: req.query?.limit,
      module: req.query?.module,
      status: req.query?.status,
      userId: req.query?.userId,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Admin activity error:", error);
    return sendError(res, error, "Could not load activity logs.");
  }
}

async function listAdminCalendarEvents(req, res) {
  try {
    const result = await getAdminCalendarEvents({
      page: req.query?.page,
      limit: req.query?.limit,
      status: req.query?.status,
      userId: req.query?.userId,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Admin calendar events error:", error);
    return sendError(res, error, "Could not load calendar plans.");
  }
}

async function listAdminMediaExports(req, res) {
  try {
    const result = await getAdminMediaExports({
      page: req.query?.page,
      limit: req.query?.limit,
      userId: req.query?.userId,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Admin media exports error:", error);
    return sendError(res, error, "Could not load media exports.");
  }
}

async function listAdminAccounts(req, res) {
  try {
    const items = await listAdminAccountsService();

    return res.status(200).json({
      items,
    });
  } catch (error) {
    console.error("Admin access list error:", error);
    return sendError(res, error, "Could not load admin accounts.");
  }
}

async function createAdminAccount(req, res) {
  try {
    const result = await createAdminAccountService({
      actor: req.admin,
      targetUserId: req.body?.userId,
      targetEmail: req.body?.targetEmail,
      role: req.body?.role,
    });

    await writeAdminAuditSafe({
      req,
      action: result.before
        ? "admin.access_reactivated_or_changed"
        : "admin.access_granted",
      targetAdmin: result.admin,
      before: result.before || {},
      after: result.admin,
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error("Create admin account error:", error);
    return sendError(res, error, "Could not grant admin access.");
  }
}

async function updateAdminAccount(req, res) {
  try {
    const result = await updateAdminAccountService({
      actor: req.admin,
      adminId: req.params.adminId,
      role: req.body?.role,
      isActive: req.body?.isActive,
    });

    await writeAdminAuditSafe({
      req,
      action: result.admin.isActive
        ? "admin.access_updated"
        : "admin.access_deactivated",
      targetAdmin: result.admin,
      before: result.before,
      after: result.admin,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Update admin account error:", error);
    return sendError(res, error, "Could not update admin access.");
  }
}



async function deleteAdminAccount(req, res) {
  try {
    const result = await deleteAdminAccountService({
      actor: req.admin,
      adminId: req.params.adminId,
    });

    await writeAdminAuditSafe({
      req,
      action: "admin.access_deleted",
      targetAdmin: result.deletedAdmin,
      before: result.deletedAdmin,
      after: {},
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Delete admin account error:", error);
    return sendError(res, error, "Could not remove admin access.");
  }
}

async function listAdminContactMessages(req, res) {
  try {
    const result = await listAdminContactMessagesService({
      page: req.query?.page,
      limit: req.query?.limit,
      status: req.query?.status,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Admin contact messages error:", error);
    return sendError(res, error, "Could not load contact messages.");
  }
}

async function updateAdminContactMessageStatus(req, res) {
  try {
    const result = await updateAdminContactMessageStatusService({
      messageId: req.params.messageId,
      status: req.body?.status,
      updatedByUserId: req.user.uid,
      updatedByEmail: req.user.email,
    });

    await logActivitySafe({
      userId: result.message.accountUid || null,
      userEmail: result.message.email,
      eventType: "admin.contact_message_status_updated",
      module: "admin",
      entityId: result.message.id,
      metadata: {
        fromStatus: result.before.status,
        toStatus: result.message.status,
        performedByUserId: req.user.uid,
        performedByEmail: req.user.email,
      },
      req,
    });

    await writeAdminAuditSafe({
      req,
      action: "admin.contact_message_status_updated",
      targetUserId: result.message.accountUid || "",
      targetEmail: result.message.email,
      before: {
        contactMessageId: result.message.id,
        status: result.before.status,
      },
      after: {
        contactMessageId: result.message.id,
        status: result.message.status,
      },
    });

    return res.status(200).json({
      message: result.message,
    });
  } catch (error) {
    console.error("Admin contact message status error:", error);
    return sendError(res, error, "Could not update contact message status.");
  }
}

module.exports = {
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
  listAdminPayments,
};