const admin = require("../config/firebaseAdmin");
const supabase = require("../config/supabase");

const ROLES = ["owner", "admin", "support", "viewer"];

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function cleanText(value, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeEmail(value) {
  const email = cleanText(value, 320).toLowerCase();

  if (!email || !email.includes("@")) {
    throw createHttpError("A valid email address is required.", 400);
  }

  return email;
}

function normalizeRole(value) {
  const role = cleanText(value, 30).toLowerCase();

  if (!ROLES.includes(role)) {
    throw createHttpError(
      "Role must be owner, admin, support, or viewer.",
      400
    );
  }

  return role;
}

function normalizeOptionalBoolean(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  throw createHttpError("isActive must be true or false.", 400);
}

function mapAdminAccount(record) {
  if (!record) return null;

  return {
    id: record.id,
    userId: record.user_id || "",
    email: record.email || "",
    role: record.role || "viewer",
    isActive: Boolean(record.is_active),
    createdByUserId: record.created_by_user_id || "",
    createdByEmail: record.created_by_email || "",
    createdAt: record.created_at || null,
    updatedAt: record.updated_at || null,
  };
}

async function findAdminById(adminId) {
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("id", adminId)
    .maybeSingle();

  if (error) {
    throw createHttpError(error.message || "Could not load admin account.", 500);
  }

  return data || null;
}

async function findAdminByUserId(userId) {
  const cleanUserId = cleanText(userId, 200);

  if (!cleanUserId) return null;

  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", cleanUserId)
    .maybeSingle();

  if (error) {
    throw createHttpError(error.message || "Could not load admin account.", 500);
  }

  return data || null;
}

async function findAdminByEmail(email) {
  const cleanEmail = normalizeEmail(email);

  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (error) {
    throw createHttpError(error.message || "Could not load admin account.", 500);
  }

  return data || null;
}

async function getActiveAdminForFirebaseUser({ userId, email }) {
  const cleanUserId = cleanText(userId, 200);
  const cleanEmail = normalizeEmail(email);

  if (!cleanUserId) {
    return null;
  }

  const userIdRecord = await findAdminByUserId(cleanUserId);

  if (userIdRecord) {
    return userIdRecord.is_active ? mapAdminAccount(userIdRecord) : null;
  }

  const emailRecord = await findAdminByEmail(cleanEmail);

  if (!emailRecord || !emailRecord.is_active) {
    return null;
  }

  // First owner login binds Firebase UID to seeded owner email.
  if (emailRecord.user_id) {
    return null;
  }

  const { data, error } = await supabase
    .from("admin_users")
    .update({
      user_id: cleanUserId,
    })
    .eq("id", emailRecord.id)
    .is("user_id", null)
    .select("*")
    .maybeSingle();

  if (error) {
    const retryRecord = await findAdminByUserId(cleanUserId);

    if (retryRecord?.is_active) {
      return mapAdminAccount(retryRecord);
    }

    throw createHttpError(
      error.message || "Could not bind admin access to this account.",
      500
    );
  }

  return data?.is_active ? mapAdminAccount(data) : null;
}

async function listAdminAccounts() {
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw createHttpError(error.message || "Could not load admin accounts.", 500);
  }

  const rank = {
    owner: 4,
    admin: 3,
    support: 2,
    viewer: 1,
  };

  return (data || [])
    .map(mapAdminAccount)
    .sort((a, b) => {
      const roleDifference = (rank[b.role] || 0) - (rank[a.role] || 0);

      if (roleDifference !== 0) {
        return roleDifference;
      }

      return a.email.localeCompare(b.email);
    });
}

async function countActiveOwners() {
  const { count, error } = await supabase
    .from("admin_users")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("role", "owner")
    .eq("is_active", true);

  if (error) {
    throw createHttpError(error.message || "Could not verify owner access.", 500);
  }

  return Number(count || 0);
}


async function resolveFirebaseUserForAdminTarget({ targetUserId, targetEmail }) {
  const cleanTargetUserId = cleanText(targetUserId, 200);
  const suppliedEmail = cleanText(targetEmail, 320);

  if (!cleanTargetUserId && !suppliedEmail) {
    throw createHttpError("Firebase user ID or email address is required.", 400);
  }

  try {
    if (cleanTargetUserId) {
      return await admin.auth().getUser(cleanTargetUserId);
    }

    return await admin.auth().getUserByEmail(normalizeEmail(suppliedEmail));
  } catch (error) {
    if (error?.code === "auth/user-not-found") {
      throw createHttpError(
        "No Firebase account exists for this email. Ask the user to sign up first, then grant admin access.",
        404
      );
    }

    throw error;
  }
}

async function createAdminAccount({ actor, targetUserId, targetEmail, role }) {
  if (actor?.role !== "owner") {
    throw createHttpError("Only an owner can add an admin account.", 403);
  }

  const nextRole = normalizeRole(role);
  const firebaseUser = await resolveFirebaseUserForAdminTarget({
    targetUserId,
    targetEmail,
  });

  const cleanTargetUserId = cleanText(firebaseUser.uid, 200);

  if (firebaseUser.disabled) {
    throw createHttpError(
      "This Firebase account is disabled. Enable it before granting admin access.",
      409
    );
  }

  const email = normalizeEmail(firebaseUser.email);
  const existingByUserId = await findAdminByUserId(cleanTargetUserId);
  const existingByEmail = await findAdminByEmail(email);
  const existing = existingByUserId || existingByEmail;

  if (existing && existing.user_id && existing.user_id !== cleanTargetUserId) {
    throw createHttpError(
      "This email is already linked to another Firebase admin account.",
      409
    );
  }

  const before = mapAdminAccount(existing);

  if (existing) {
    const { data, error } = await supabase
      .from("admin_users")
      .update({
        user_id: cleanTargetUserId,
        email,
        role: nextRole,
        is_active: true,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw createHttpError(error.message || "Could not update admin access.", 500);
    }

    return { before, admin: mapAdminAccount(data) };
  }

  const { data, error } = await supabase
    .from("admin_users")
    .insert({
      user_id: cleanTargetUserId,
      email,
      role: nextRole,
      is_active: true,
      created_by_user_id: actor.userId,
      created_by_email: actor.email,
    })
    .select("*")
    .single();

  if (error) {
    throw createHttpError(error.message || "Could not create admin access.", 500);
  }

  return { before: null, admin: mapAdminAccount(data) };
}

async function updateAdminAccount({
  actor,
  adminId,
  role,
  isActive,
}) {
  if (actor?.role !== "owner") {
    throw createHttpError("Only an owner can modify admin access.", 403);
  }

  const target = await findAdminById(adminId);

  if (!target) {
    throw createHttpError("Admin account was not found.", 404);
  }

  const nextRole =
    role === undefined ? target.role : normalizeRole(role);

  const nextIsActive =
    isActive === undefined
      ? Boolean(target.is_active)
      : normalizeOptionalBoolean(isActive);

  if (
    target.user_id &&
    target.user_id === actor.userId &&
    (nextRole !== target.role || nextIsActive !== target.is_active)
  ) {
    throw createHttpError(
      "You cannot change your own role or deactivate your own admin account.",
      400
    );
  }

  const ownerIsBeingRemoved =
    target.role === "owner" &&
    (nextRole !== "owner" || nextIsActive === false);

  if (ownerIsBeingRemoved) {
    const activeOwnerCount = await countActiveOwners();

    if (activeOwnerCount <= 1) {
      throw createHttpError(
        "At least one active owner must remain in the system.",
        409
      );
    }
  }

  const before = mapAdminAccount(target);

  const { data, error } = await supabase
    .from("admin_users")
    .update({
      role: nextRole,
      is_active: nextIsActive,
    })
    .eq("id", target.id)
    .select("*")
    .single();

  if (error) {
    throw createHttpError(
      error.message || "Could not update admin access.",
      500
    );
  }

  return {
    before,
    admin: mapAdminAccount(data),
  };
}


async function deleteAdminAccount({ actor, adminId }) {
  if (actor?.role !== "owner") {
    throw createHttpError("Only an owner can remove admin access.", 403);
  }

  const target = await findAdminById(adminId);

  if (!target) {
    throw createHttpError("Admin account was not found.", 404);
  }

  if (target.user_id && target.user_id === actor.userId) {
    throw createHttpError("You cannot remove your own admin access.", 400);
  }

  if (target.role === "owner" && target.is_active) {
    const activeOwnerCount = await countActiveOwners();

    if (activeOwnerCount <= 1) {
      throw createHttpError(
        "At least one active owner must remain in the system.",
        409
      );
    }
  }

  const deletedAdmin = mapAdminAccount(target);
  const { error } = await supabase
    .from("admin_users")
    .delete()
    .eq("id", target.id);

  if (error) {
    throw createHttpError(error.message || "Could not remove admin access.", 500);
  }

  // This deliberately removes only the RBAC record. The Firebase user and their
  // normal product data remain untouched.
  return { deletedAdmin };
}

async function getAdminAccountByUserId(userId) {
  const record = await findAdminByUserId(userId);
  return mapAdminAccount(record);
}

async function assertAccountDeletionAllowed(userId) {
  const adminAccount = await getAdminAccountByUserId(userId);

  if (!adminAccount?.isActive) {
    return;
  }

  if (adminAccount.role !== "owner") {
    return;
  }

  const activeOwnerCount = await countActiveOwners();

  if (activeOwnerCount <= 1) {
    throw createHttpError(
      "You are the only active owner. Transfer ownership before deleting this account.",
      409
    );
  }
}

async function deactivateAdminAccountForDeletedUser(userId) {
  const record = await findAdminByUserId(userId);

  if (!record) {
    return null;
  }

  const { data, error } = await supabase
    .from("admin_users")
    .update({
      is_active: false,
    })
    .eq("id", record.id)
    .select("*")
    .single();

  if (error) {
    throw createHttpError(
      error.message || "Could not deactivate deleted admin account.",
      500
    );
  }

  return mapAdminAccount(data);
}

module.exports = {
  ROLES,
  getActiveAdminForFirebaseUser,
  listAdminAccounts,
  createAdminAccount,
  updateAdminAccount,
  getAdminAccountByUserId,
  assertAccountDeletionAllowed,
  deactivateAdminAccountForDeletedUser,
  deleteAdminAccount,

};