const admin = require("../config/firebaseAdmin");

const CONTACT_MESSAGE_STATUSES = ["new", "in_progress", "resolved"];

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function cleanText(value, maxLength = 5000) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function clampInteger(value, fallback, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(number)));
}

function normalizeStatus(value, { optional = false } = {}) {
  const status = cleanText(value, 30).toLowerCase();

  if (!status && optional) {
    return "";
  }

  if (!CONTACT_MESSAGE_STATUSES.includes(status)) {
    throw createHttpError(
      "Status must be new, in_progress, or resolved.",
      400
    );
  }

  return status;
}

function toIso(value) {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapContactMessage(documentSnapshot) {
  const data = documentSnapshot.data() || {};

  return {
    id: documentSnapshot.id,
    fullName: cleanText(data.fullName, 100),
    email: cleanText(data.email, 320).toLowerCase(),
    message: cleanText(data.message, 5000),
    status: CONTACT_MESSAGE_STATUSES.includes(data.status)
      ? data.status
      : "new",
    source: cleanText(data.source, 120) || "website-contact-form",
    accountUid: cleanText(data.accountUid, 200),
    createdAt: toIso(data.createdAt),
    createdAtMs: Number(data.createdAtMs || 0),
    updatedAt: toIso(data.updatedAt),
    updatedAtMs: Number(data.updatedAtMs || 0),
    statusUpdatedByEmail: cleanText(data.statusUpdatedByEmail, 320),
  };
}

async function getCount(query) {
  if (typeof query.count === "function") {
    const snapshot = await query.count().get();
    return Number(snapshot.data()?.count || 0);
  }

  const snapshot = await query.get();
  return snapshot.size;
}

async function getContactMessageSummary(messagesRef) {
  const [total, newCount, inProgressCount, resolvedCount] = await Promise.all([
    getCount(messagesRef),
    getCount(messagesRef.where("status", "==", "new")),
    getCount(messagesRef.where("status", "==", "in_progress")),
    getCount(messagesRef.where("status", "==", "resolved")),
  ]);

  return {
    total,
    new: newCount,
    inProgress: inProgressCount,
    resolved: resolvedCount,
  };
}

async function listAdminContactMessages({ page, limit, status } = {}) {
  const safePage = clampInteger(page, 1, 1, 100);
  const safeLimit = clampInteger(limit, 25, 1, 100);
  const normalizedStatus = normalizeStatus(status, { optional: true });

  const db = admin.firestore();
  const messagesRef = db.collection("contact_messages");
  const filteredRef = normalizedStatus
    ? messagesRef.where("status", "==", normalizedStatus)
    : messagesRef;

  const [summary, total] = await Promise.all([
    getContactMessageSummary(messagesRef),
    getCount(filteredRef),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const resolvedPage = Math.min(safePage, totalPages);
  const offset = (resolvedPage - 1) * safeLimit;

  const snapshot = await filteredRef
    .orderBy("createdAtMs", "desc")
    .offset(offset)
    .limit(safeLimit)
    .get();

  return {
    items: snapshot.docs.map(mapContactMessage),
    summary,
    pagination: {
      page: resolvedPage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

async function updateAdminContactMessageStatus({
  messageId,
  status,
  updatedByUserId,
  updatedByEmail,
}) {
  const cleanMessageId = cleanText(messageId, 200);
  const nextStatus = normalizeStatus(status);

  // Firestore auto-generated document IDs are URL-safe 20-character IDs.
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(cleanMessageId)) {
    throw createHttpError("Invalid contact message ID.", 400);
  }

  const db = admin.firestore();
  const documentRef = db.collection("contact_messages").doc(cleanMessageId);
  const beforeSnapshot = await documentRef.get();

  if (!beforeSnapshot.exists) {
    throw createHttpError("Contact message was not found.", 404);
  }

  const before = mapContactMessage(beforeSnapshot);

  await documentRef.update({
    status: nextStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAtMs: Date.now(),
    statusUpdatedByUserId: cleanText(updatedByUserId, 200),
    statusUpdatedByEmail: cleanText(updatedByEmail, 320).toLowerCase(),
  });

  const afterSnapshot = await documentRef.get();

  return {
    before,
    message: mapContactMessage(afterSnapshot),
  };
}

module.exports = {
  CONTACT_MESSAGE_STATUSES,
  listAdminContactMessages,
  updateAdminContactMessageStatus,
};
