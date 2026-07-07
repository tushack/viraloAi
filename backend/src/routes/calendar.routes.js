const express = require("express");

const {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  markCalendarReminderSent,
  deleteCalendarEvent,
} = require("../controllers/calendar.controller");

const { requireFirebaseAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireFirebaseAuth, getCalendarEvents);
router.post("/", requireFirebaseAuth, createCalendarEvent);
router.patch("/:id/reminder-sent", requireFirebaseAuth, markCalendarReminderSent);
router.patch("/:id", requireFirebaseAuth, updateCalendarEvent);
router.delete("/:id", requireFirebaseAuth, deleteCalendarEvent);

module.exports = router;
