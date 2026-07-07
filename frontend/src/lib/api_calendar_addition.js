// Add this immediately after deleteCalendarEvent() in frontend/src/lib/api.js.
export async function markCalendarReminderSent(eventId, channel = "browser") {
  if (!eventId) {
    throw new Error("Calendar event ID is required.");
  }

  return calendarRequest(`/${encodeURIComponent(eventId)}/reminder-sent`, {
    method: "PATCH",
    body: { channel },
  });
}
