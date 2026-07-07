const {
  getCalendarEventsForUser,
  createCalendarEventForUser,
  updateCalendarEventForUser,
  markCalendarReminderSentForUser,
  deleteCalendarEventForUser,
} = require("../services/calendar.service");

const { logActivitySafe } = require("../services/activityLog.service");

function sendError(res, error, fallbackMessage) {
  return res.status(error.statusCode || 500).json({
    message: error.message || fallbackMessage,
  });
}

async function getCalendarEvents(req, res) {
  try {
    const items = await getCalendarEventsForUser(req.user.uid);
    return res.status(200).json({ items });
  } catch (error) {
    console.error("Get calendar events error:", error);
    return sendError(res, error, "Could not load content calendar.");
  }
}

async function createCalendarEvent(req, res) {
  try {
    const item = await createCalendarEventForUser({
      userId: req.user.uid,
      payload: req.body || {},
    });

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "calendar.plan_created",
      module: "calendar",
      entityId: item.id,
      metadata: {
        title: item.title,
        date: item.date,
        time: item.time,
        platform: item.platform,
        status: item.status,
        timezone: item.userTimezone,
      },
      req,
    });

    return res.status(201).json({ item });
  } catch (error) {
    console.error("Create calendar event error:", error);
    await logActivitySafe({
      userId: req.user?.uid,
      userEmail: req.user?.email,
      eventType: "calendar.plan_create_failed",
      module: "calendar",
      status: "failed",
      metadata: { message: error.message },
      req,
    });
    return sendError(res, error, "Could not save content plan.");
  }
}

async function updateCalendarEvent(req, res) {
  try {
    const item = await updateCalendarEventForUser({
      userId: req.user.uid,
      eventId: req.params.id,
      payload: req.body || {},
    });

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "calendar.plan_updated",
      module: "calendar",
      entityId: item.id,
      metadata: {
        title: item.title,
        date: item.date,
        time: item.time,
        platform: item.platform,
        status: item.status,
        timezone: item.userTimezone,
      },
      req,
    });

    return res.status(200).json({ item });
  } catch (error) {
    console.error("Update calendar event error:", error);
    return sendError(res, error, "Could not update content plan.");
  }
}

async function markCalendarReminderSent(req, res) {
  try {
    const item = await markCalendarReminderSentForUser({
      userId: req.user.uid,
      eventId: req.params.id,
      channel: req.body?.channel || "browser",
    });

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "calendar.reminder_marked_sent",
      module: "calendar",
      entityId: item.id,
      metadata: {
        channel: item.reminderChannel,
        reminderSentAt: item.reminderSentAt,
      },
      req,
    });

    return res.status(200).json({ item });
  } catch (error) {
    console.error("Mark calendar reminder sent error:", error);
    return sendError(res, error, "Could not mark reminder as sent.");
  }
}

async function deleteCalendarEvent(req, res) {
  try {
    const item = await deleteCalendarEventForUser({
      userId: req.user.uid,
      eventId: req.params.id,
    });

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "calendar.plan_deleted",
      module: "calendar",
      entityId: item.id,
      metadata: {
        title: item.title,
        date: item.date,
        time: item.time,
        platform: item.platform,
        status: item.status,
      },
      req,
    });

    return res.status(200).json({ message: "Content plan deleted.", item });
  } catch (error) {
    console.error("Delete calendar event error:", error);
    return sendError(res, error, "Could not delete content plan.");
  }
}

module.exports = {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  markCalendarReminderSent,
  deleteCalendarEvent,
};
