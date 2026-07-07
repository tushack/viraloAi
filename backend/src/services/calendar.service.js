const supabase = require("../config/supabase");

const ALLOWED_STATUSES = new Set([
  "Ideas",
  "Scripting",
  "Recording",
  "Editing",
  "Scheduled",
  "Posted",
]);

const ALLOWED_REMINDERS = new Set([10, 30, 60, 1440]);
const ALLOWED_REMINDER_CHANNELS = new Set([
  "browser",
  "email",
  "fcm",
  "whatsapp",
]);
const DEFAULT_TIMEZONE = process.env.DEFAULT_CALENDAR_TIMEZONE || "Asia/Kolkata";

const EVENT_SELECT_FIELDS = [
  "id",
  "title",
  "scheduled_date",
  "scheduled_time",
  "platform",
  "status",
  "reminder_minutes",
  "notified",
  "user_timezone",
  "scheduled_at_utc",
  "reminder_due_at",
  "reminder_sent_at",
  "reminder_channel",
  "reminder_attempts",
  "reminder_failed_at",
  "created_at",
  "updated_at",
].join(", ");

function cleanText(value, maxLength = 1000) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeDate(value) {
  const date = cleanText(value, 20);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createHttpError("A valid calendar date is required.");
  }

  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw createHttpError("A valid calendar date is required.");
  }

  return date;
}

function normalizeTime(value) {
  const time = cleanText(value || "10:00", 10);

  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    throw createHttpError("A valid calendar time is required.");
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (hours > 23 || minutes > 59) {
    throw createHttpError("A valid calendar time is required.");
  }

  return time.slice(0, 5);
}

function normalizeTimeZone(value) {
  const timezone = cleanText(value || DEFAULT_TIMEZONE, 100) || DEFAULT_TIMEZONE;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
  } catch {
    throw createHttpError("A valid IANA timezone is required.");
  }

  return timezone;
}

function getDatePartsInTimeZone(date, timezone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const values = {};

  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  });

  return values;
}

function getTimezoneOffsetMilliseconds(date, timezone) {
  const values = getDatePartsInTimeZone(date, timezone);

  const zonedAsUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second
  );

  return zonedAsUtc - date.getTime();
}

function getUtcDateForCalendarDateTime({ date, time, timezone }) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const localTimestampAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);

  let utcTimestamp = localTimestampAsUtc;

  // Two passes handle normal timezone offsets and DST transitions.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const offset = getTimezoneOffsetMilliseconds(
      new Date(utcTimestamp),
      timezone
    );
    utcTimestamp = localTimestampAsUtc - offset;
  }

  const resolved = getDatePartsInTimeZone(new Date(utcTimestamp), timezone);

  if (
    resolved.year !== year ||
    resolved.month !== month ||
    resolved.day !== day ||
    resolved.hour !== hour ||
    resolved.minute !== minute
  ) {
    throw createHttpError(
      "The selected date and time does not exist in the selected timezone. Choose another time.",
      400
    );
  }

  return new Date(utcTimestamp);
}

function buildSchedule({ date, time, timezone, reminderMinutes }) {
  const scheduledAt = getUtcDateForCalendarDateTime({
    date,
    time,
    timezone,
  });

  return {
    scheduled_at_utc: scheduledAt.toISOString(),
    reminder_due_at: new Date(
      scheduledAt.getTime() - reminderMinutes * 60 * 1000
    ).toISOString(),
  };
}

function normalizePayload(payload = {}) {
  const title = cleanText(payload.title, 280);

  if (!title) {
    throw createHttpError("Content topic is required.");
  }

  const status = cleanText(payload.status || "Ideas", 40);

  if (!ALLOWED_STATUSES.has(status)) {
    throw createHttpError("Invalid content plan status.");
  }

  const reminderMinutes = Number(
    payload.reminderMinutes ?? payload.reminder_minutes ?? 30
  );

  if (!ALLOWED_REMINDERS.has(reminderMinutes)) {
    throw createHttpError("Invalid reminder time.");
  }

  const scheduledDate = normalizeDate(payload.date ?? payload.scheduled_date);
  const scheduledTime = normalizeTime(payload.time ?? payload.scheduled_time);
  const userTimezone = normalizeTimeZone(
    payload.timezone ?? payload.userTimezone ?? payload.user_timezone
  );

  return {
    title,
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime,
    platform: cleanText(payload.platform || "YouTube", 80) || "YouTube",
    status,
    reminder_minutes: reminderMinutes,
    user_timezone: userTimezone,
    ...buildSchedule({
      date: scheduledDate,
      time: scheduledTime,
      timezone: userTimezone,
      reminderMinutes,
    }),
  };
}

function serializeCalendarEvent(record) {
  if (!record) return null;

  return {
    id: record.id,
    title: record.title,
    date: record.scheduled_date,
    time: String(record.scheduled_time || "10:00").slice(0, 5),
    platform: record.platform,
    status: record.status,
    reminderMinutes: Number(record.reminder_minutes || 30),
    notified: Boolean(record.notified || record.reminder_sent_at),
    userTimezone: record.user_timezone || DEFAULT_TIMEZONE,
    reminderDueAt: record.reminder_due_at || null,
    reminderSentAt: record.reminder_sent_at || null,
    reminderChannel: record.reminder_channel || null,
    reminderAttempts: Number(record.reminder_attempts || 0),
    reminderFailedAt: record.reminder_failed_at || null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

async function getCalendarEventsForUser(userId) {
  const { data, error } = await supabase
    .from("content_calendar_events")
    .select(EVENT_SELECT_FIELDS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true })
    .limit(500);

  if (error) {
    throw error;
  }

  return (data || []).map(serializeCalendarEvent);
}

async function createCalendarEventForUser({ userId, payload }) {
  const eventData = normalizePayload(payload);

  const { data, error } = await supabase
    .from("content_calendar_events")
    .insert({
      user_id: userId,
      ...eventData,
      notified: false,
      reminder_sent_at: null,
      reminder_channel: null,
      reminder_claimed_at: null,
      reminder_attempts: 0,
      reminder_failed_at: null,
    })
    .select(EVENT_SELECT_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return serializeCalendarEvent(data);
}

async function updateCalendarEventForUser({ userId, eventId, payload }) {
  const { data: existing, error: existingError } = await supabase
    .from("content_calendar_events")
    .select(EVENT_SELECT_FIELDS)
    .eq("id", eventId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    throw createHttpError("Content plan was not found.", 404);
  }

  const eventData = normalizePayload({
    ...payload,
    timezone:
      payload?.timezone ??
      payload?.userTimezone ??
      payload?.user_timezone ??
      existing.user_timezone,
  });

  const scheduleChanged = [
    "scheduled_date",
    "scheduled_time",
    "reminder_minutes",
    "user_timezone",
  ].some((field) => String(existing[field] ?? "") !== String(eventData[field] ?? ""));

  const updatePayload = {
    ...eventData,
  };

  if (scheduleChanged) {
    Object.assign(updatePayload, {
      notified: false,
      reminder_sent_at: null,
      reminder_channel: null,
      reminder_claimed_at: null,
      reminder_attempts: 0,
      reminder_failed_at: null,
    });
  }

  const { data, error } = await supabase
    .from("content_calendar_events")
    .update(updatePayload)
    .eq("id", eventId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(EVENT_SELECT_FIELDS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw createHttpError("Content plan was not found.", 404);
  }

  return serializeCalendarEvent(data);
}

async function insertReminderLog({
  eventId,
  userId,
  channel,
  scheduledAtUtc,
  status,
  sentAt = null,
  errorMessage = null,
}) {
  const { error } = await supabase.from("calendar_reminder_logs").insert({
    event_id: eventId,
    user_id: userId,
    channel,
    scheduled_at_utc: scheduledAtUtc,
    sent_at: sentAt,
    status,
    error_message: errorMessage,
  });

  if (error) {
    throw error;
  }
}

async function markCalendarReminderSentForUser({ userId, eventId, channel = "browser" }) {
  const cleanChannel = cleanText(channel, 30).toLowerCase();

  if (!ALLOWED_REMINDER_CHANNELS.has(cleanChannel)) {
    throw createHttpError("Invalid reminder channel.");
  }

  const sentAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("content_calendar_events")
    .update({
      notified: true,
      reminder_sent_at: sentAt,
      reminder_channel: cleanChannel,
      reminder_claimed_at: null,
      reminder_failed_at: null,
    })
    .eq("id", eventId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(EVENT_SELECT_FIELDS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw createHttpError("Content plan was not found.", 404);
  }

  await insertReminderLog({
    eventId: data.id,
    userId,
    channel: cleanChannel,
    scheduledAtUtc: data.scheduled_at_utc,
    status: "sent",
    sentAt,
  });

  return serializeCalendarEvent(data);
}

async function deleteCalendarEventForUser({ userId, eventId }) {
  const { data, error } = await supabase
    .from("content_calendar_events")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
    })
    .eq("id", eventId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(EVENT_SELECT_FIELDS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw createHttpError("Content plan was not found.", 404);
  }

  return serializeCalendarEvent(data);
}

module.exports = {
  getCalendarEventsForUser,
  createCalendarEventForUser,
  updateCalendarEventForUser,
  markCalendarReminderSentForUser,
  deleteCalendarEventForUser,
};
