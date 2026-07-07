const cron = require("node-cron");

const {
  purgeDueDeletionArchives,
} = require("../services/dataPrivacy.service");

let isPurgeRunning = false;

function startDataPrivacyPurgeCron() {
  const enabled = process.env.ENABLE_DATA_PURGE_CRON === "true";

  if (!enabled) {
    console.log("Data privacy purge cron is disabled.");
    return;
  }

  const schedule = process.env.DATA_PURGE_CRON_TIME || "0 2 * * *";
  const timezone = process.env.DATA_PURGE_TIMEZONE || "Asia/Kolkata";

  if (!cron.validate(schedule)) {
    console.error("Invalid DATA_PURGE_CRON_TIME:", schedule);
    return;
  }

  cron.schedule(
    schedule,
    async () => {
      if (isPurgeRunning) {
        console.log("Data privacy purge already running. Skipping...");
        return;
      }

      try {
        isPurgeRunning = true;

        console.log("Starting data privacy purge cron...");

        const result = await purgeDueDeletionArchives();

        console.log("Data privacy purge cron completed:", result);
      } catch (error) {
        console.error("Data privacy purge cron failed:", error);
      } finally {
        isPurgeRunning = false;
      }
    },
    {
      timezone,
    }
  );

  console.log(
    `Data privacy purge cron started. Schedule: ${schedule}, Timezone: ${timezone}`
  );
}

module.exports = {
  startDataPrivacyPurgeCron,
};