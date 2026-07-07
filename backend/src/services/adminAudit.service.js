const supabase = require("../config/supabase");

function cleanText(value, maxLength = 2000) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeJson(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  const sensitiveKeys = [
    "token",
    "secret",
    "password",
    "authorization",
    "refresh",
    "access_token",
    "refresh_token",
  ];

  try {
    return JSON.parse(
      JSON.stringify(value, (key, item) => {
        const lowerKey = String(key || "").toLowerCase();

        if (sensitiveKeys.some((word) => lowerKey.includes(word))) {
          return "[REDACTED]";
        }

        if (typeof item === "string") {
          return item.slice(0, 3000);
        }

        return item;
      })
    );
  } catch {
    return {};
  }
}

function getRequestContext(req) {
  const forwardedFor = cleanText(req?.headers?.["x-forwarded-for"], 300);

  return {
    ipAddress: cleanText(
      forwardedFor
        ? forwardedFor.split(",")[0]
        : req?.ip || req?.socket?.remoteAddress || "",
      200
    ),
    userAgent: cleanText(req?.headers?.["user-agent"], 800),
  };
}

async function writeAdminAudit({
  req,
  action,
  targetAdmin = null,
  targetUserId = "",
  targetEmail = "",
  before = {},
  after = {},
}) {
  const actor = req?.admin;

  if (!actor?.id || !actor?.userId || !actor?.email) {
    throw new Error("Missing admin audit actor.");
  }

  const context = getRequestContext(req);

  const { error } = await supabase
    .from("admin_audit_logs")
    .insert({
      actor_admin_id: actor.id,
      actor_user_id: actor.userId,
      actor_email: actor.email,

      action: cleanText(action, 160),

      target_admin_id: targetAdmin?.id || null,
      target_user_id: cleanText(
        targetUserId || targetAdmin?.userId || "",
        200
      ) || null,
      target_email: cleanText(
        targetEmail || targetAdmin?.email || "",
        320
      ) || null,

      before_json: sanitizeJson(before),
      after_json: sanitizeJson(after),

      ip_address: context.ipAddress || null,
      user_agent: context.userAgent || null,
    });

  if (error) {
    throw error;
  }
}

async function writeAdminAuditSafe(payload) {
  try {
    await writeAdminAudit(payload);
  } catch (error) {
    console.error("Admin audit log write failed:", error.message);
  }
}

module.exports = {
  writeAdminAudit,
  writeAdminAuditSafe,
};