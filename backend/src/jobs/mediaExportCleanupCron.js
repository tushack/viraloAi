const cron = require("node-cron");

const {
  purgeExpiredMediaExports,
} = require("../services/mediaExport.service");

let cleanupRunning = false;

function startMediaExportCleanupCron() {
  const enabled = process.env.ENABLE_MEDIA_EXPORT_CLEANUP_CRON !== "false";

  if (!enabled) {
    console.log("Media export cleanup cron is disabled.");
    return;
  }

  const schedule = process.env.MEDIA_EXPORT_CLEANUP_CRON_TIME || "30 3 * * *";
  const timezone = process.env.MEDIA_EXPORT_CLEANUP_TIMEZONE || "Asia/Kolkata";

  if (!cron.validate(schedule)) {
    console.error("Invalid MEDIA_EXPORT_CLEANUP_CRON_TIME:", schedule);
    return;
  }

  cron.schedule(
    schedule,
    async () => {
      if (cleanupRunning) {
        console.log("Media export cleanup is already running. Skipping...");
        return;
      }

      try {
        cleanupRunning = true;
        const result = await purgeExpiredMediaExports();
        console.log("Media export cleanup completed:", result);
      } catch (error) {
        console.error("Media export cleanup failed:", error);
      } finally {
        cleanupRunning = false;
      }
    },
    { timezone }
  );

  console.log(
    `Media export cleanup cron started. Schedule: ${schedule}, Timezone: ${timezone}`
  );
}

module.exports = {
  startMediaExportCleanupCron,
};