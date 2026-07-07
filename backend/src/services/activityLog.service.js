const supabase = require("../config/supabase");

function cleanText(value, maxLength = 1000) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeMetadata(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  try {
    return JSON.parse(
      JSON.stringify(value, (_key, item) => {
        if (typeof item === "string") {
          return item.slice(0, 2000);
        }

        return item;
      })
    );
  } catch {
    return {};
  }
}

function getRequestContext(req) {
  if (!req) {
    return {
      ipAddress: "",
      userAgent: "",
    };
  }

  const forwardedFor = cleanText(req.headers?.["x-forwarded-for"], 300);
  const ipAddress = cleanText(
    forwardedFor ? forwardedFor.split(",")[0] : req.ip || req.socket?.remoteAddress,
    200
  );

  return {
    ipAddress,
    userAgent: cleanText(req.headers?.["user-agent"], 800),
  };
}

async function logActivity({
  userId,
  userEmail,
  eventType,
  module,
  status = "success",
  entityId = "",
  metadata = {},
  req,
}) {
  const cleanEventType = cleanText(eventType, 120);
  const cleanModule = cleanText(module, 80);
  const cleanStatus = ["success", "failed", "info"].includes(status)
    ? status
    : "info";

  if (!cleanEventType || !cleanModule) {
    return null;
  }

  const context = getRequestContext(req);

  const { data, error } = await supabase
    .from("activity_logs")
    .insert({
      user_id: cleanText(userId, 200) || null,
      user_email: cleanText(userEmail, 320) || null,
      event_type: cleanEventType,
      module: cleanModule,
      status: cleanStatus,
      entity_id: cleanText(entityId, 200) || null,
      metadata: safeMetadata(metadata),
      ip_address: context.ipAddress || null,
      user_agent: context.userAgent || null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function logActivitySafe(payload) {
  try {
    return await logActivity(payload);
  } catch (error) {
    // Tracking must never break a user-facing feature.
    console.error("Activity log write error:", error.message);
    return null;
  }
}

module.exports = {
  logActivity,
  logActivitySafe,
};
