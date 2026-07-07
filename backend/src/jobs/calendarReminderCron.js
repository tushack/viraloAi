const cron = require("node-cron");

const {
  processDueCalendarReminders,
} = require("../services/calendarReminder.service");

let isCalendarReminderRunning = false;

async function runCalendarReminderCycle() {
  if (isCalendarReminderRunning) {
    return;
  }

  try {
    isCalendarReminderRunning = true;
    const result = await processDueCalendarReminders();

    if (result.scanned > 0) {
      console.log("Calendar reminder cycle completed:", result);
    }
  } catch (error) {
    console.error("Calendar reminder cycle failed:", error.message || error);
  } finally {
    isCalendarReminderRunning = false;
  }
}

function startCalendarReminderCron() {
  const enabled = String(
    process.env.ENABLE_CALENDAR_REMINDER_CRON || "false"
  ).toLowerCase() === "true";

  if (!enabled) {
    console.log("Calendar reminder cron is disabled.");
    return;
  }

  const schedule = process.env.CALENDAR_REMINDER_CRON_TIME || "* * * * *";

  if (!cron.validate(schedule)) {
    console.error("Invalid CALENDAR_REMINDER_CRON_TIME:", schedule);
    return;
  }

  // Run once at startup so a restart does not delay a due reminder by a minute.
  runCalendarReminderCycle();

  cron.schedule(schedule, runCalendarReminderCycle, {
    timezone: "UTC",
  });

  console.log(`Calendar reminder cron started. Schedule: ${schedule} UTC`);
}

module.exports = {
  startCalendarReminderCron,
};
