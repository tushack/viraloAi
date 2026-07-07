const nodemailer = require("nodemailer");

const admin = require("../config/firebaseAdmin");
const supabase = require("../config/supabase");

const REMINDER_CHANNEL = "email";
const MAX_REMINDER_ATTEMPTS = 3;
const CLAIM_STALE_AFTER_MINUTES = 15;
const BATCH_SIZE = 100;

let transporter = null;

function cleanText(value, maxLength = 1000) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const smtpHost = cleanText(process.env.SMTP_HOST || "smtp.gmail.com", 255);
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = cleanText(process.env.SMTP_USER, 320);
  const smtpPass = String(process.env.SMTP_PASS || "").trim();

  if (!smtpHost || !Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    throw new Error("Calendar reminder SMTP_HOST or SMTP_PORT is invalid.");
  }

  if (!smtpUser || !smtpPass) {
    throw new Error(
      "Calendar reminders require SMTP_USER and SMTP_PASS in backend environment variables."
    );
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
}

function getReminderFromAddress() {
  const from = cleanText(process.env.CALENDAR_REMINDER_FROM || process.env.SMTP_FROM || process.env.SMTP_USER, 320);

  if (!from) {
    throw new Error(
      "Calendar reminders require CALENDAR_REMINDER_FROM, SMTP_FROM, or SMTP_USER."
    );
  }

  return from;
}

function formatInUserTimezone(utcIso, timezone) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone || "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(utcIso));
}

function createEmailContent(event) {
  const scheduledTime = formatInUserTimezone(
    event.scheduled_at_utc,
    event.user_timezone
  );

  const title = escapeHtml(event.title || "Content plan");
  const platform = escapeHtml(event.platform || "YouTube");
  const status = escapeHtml(event.status || "Ideas");
  const timezone = escapeHtml(event.user_timezone || "Asia/Kolkata");

  return {
    subject: `Reminder: ${event.title || "Your content plan"}`,
    text: [
      "Content Calendar Reminder",
      "",
      `Topic: ${event.title || "Content plan"}`,
      `When: ${scheduledTime} (${event.user_timezone || "Asia/Kolkata"})`,
      `Platform: ${event.platform || "YouTube"}`,
      `Status: ${event.status || "Ideas"}`,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:620px;margin:auto">
        <h2 style="margin:0 0 12px">Content Calendar Reminder</h2>
        <p style="margin:0 0 18px">Your scheduled content task is coming up.</p>
        <div style="border:1px solid #dbeafe;border-radius:14px;padding:18px;background:#f8fbff">
          <p style="margin:0 0 10px"><strong>Topic:</strong> ${title}</p>
          <p style="margin:0 0 10px"><strong>When:</strong> ${escapeHtml(scheduledTime)} (${timezone})</p>
          <p style="margin:0 0 10px"><strong>Platform:</strong> ${platform}</p>
          <p style="margin:0"><strong>Status:</strong> ${status}</p>
        </div>
        <p style="margin:18px 0 0;color:#64748b;font-size:13px">This reminder was sent by Viralo AI Content Calendar.</p>
      </div>
    `,
  };
}

async function getDueReminderCandidates() {
  const now = new Date().toISOString();
  const staleBefore = new Date(
    Date.now() - CLAIM_STALE_AFTER_MINUTES * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("content_calendar_events")
    .select(
      "id, user_id, title, platform, status, user_timezone, scheduled_at_utc, reminder_due_at, reminder_sent_at, reminder_claimed_at, reminder_attempts, reminder_failed_at"
    )
    .is("deleted_at", null)
    .eq("notified", false)
    .is("reminder_sent_at", null)
    .is("reminder_failed_at", null)
    .not("reminder_due_at", "is", null)
    .not("scheduled_at_utc", "is", null)
    .lte("reminder_due_at", now)
    .gt("scheduled_at_utc", now)
    .or(`reminder_claimed_at.is.null,reminder_claimed_at.lt.${staleBefore}`)
    .order("reminder_due_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    throw new Error(error.message || "Could not load due calendar reminders.");
  }

  return data || [];
}

async function claimReminder(candidate) {
  const claimedAt = new Date().toISOString();
  const staleBefore = new Date(
    Date.now() - CLAIM_STALE_AFTER_MINUTES * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("content_calendar_events")
    .update({
      reminder_claimed_at: claimedAt,
      reminder_attempts: Number(candidate.reminder_attempts || 0) + 1,
    })
    .eq("id", candidate.id)
    .eq("user_id", candidate.user_id)
    .is("deleted_at", null)
    .eq("notified", false)
    .is("reminder_sent_at", null)
    .is("reminder_failed_at", null)
    .or(`reminder_claimed_at.is.null,reminder_claimed_at.lt.${staleBefore}`)
    .select(
      "id, user_id, title, platform, status, user_timezone, scheduled_at_utc, reminder_due_at, reminder_claimed_at, reminder_attempts"
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not claim calendar reminder.");
  }

  return data || null;
}

async function insertReminderLog({
  event,
  status,
  sentAt = null,
  errorMessage = null,
}) {
  const { error } = await supabase.from("calendar_reminder_logs").insert({
    event_id: event.id,
    user_id: event.user_id,
    channel: REMINDER_CHANNEL,
    scheduled_at_utc: event.scheduled_at_utc,
    sent_at: sentAt,
    status,
    error_message: errorMessage ? cleanText(errorMessage, 2000) : null,
  });

  if (error) {
    console.error("Calendar reminder log write failed:", error.message);
  }
}

async function markReminderSent(event, sentAt) {
  const { error } = await supabase
    .from("content_calendar_events")
    .update({
      notified: true,
      reminder_sent_at: sentAt,
      reminder_channel: REMINDER_CHANNEL,
      reminder_claimed_at: null,
      reminder_failed_at: null,
    })
    .eq("id", event.id)
    .eq("user_id", event.user_id)
    .eq("reminder_claimed_at", event.reminder_claimed_at);

  if (error) {
    throw new Error(error.message || "Could not mark calendar reminder as sent.");
  }
}

async function releaseReminderAfterFailure(event, failureMessage) {
  const attempts = Number(event.reminder_attempts || 0);
  const update = {
    reminder_claimed_at: null,
  };

  if (attempts >= MAX_REMINDER_ATTEMPTS) {
    update.reminder_failed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("content_calendar_events")
    .update(update)
    .eq("id", event.id)
    .eq("user_id", event.user_id)
    .eq("reminder_claimed_at", event.reminder_claimed_at);

  if (error) {
    console.error("Calendar reminder failure state update failed:", error.message);
  }

  await insertReminderLog({
    event,
    status: "failed",
    errorMessage: failureMessage,
  });
}

async function sendReminderEmail(event) {
  const firebaseUser = await admin.auth().getUser(event.user_id);
  const recipientEmail = cleanText(firebaseUser.email, 320);

  if (!recipientEmail) {
    throw new Error("Calendar reminder user does not have an email address.");
  }

  const content = createEmailContent(event);

  await getTransporter().sendMail({
    from: getReminderFromAddress(),
    to: recipientEmail,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}

async function processDueCalendarReminders() {
  const candidates = await getDueReminderCandidates();
  const result = {
    scanned: candidates.length,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  for (const candidate of candidates) {
    let claimedEvent;

    try {
      claimedEvent = await claimReminder(candidate);

      if (!claimedEvent) {
        result.skipped += 1;
        continue;
      }

      await sendReminderEmail(claimedEvent);

      const sentAt = new Date().toISOString();
      await markReminderSent(claimedEvent, sentAt);
      await insertReminderLog({
        event: claimedEvent,
        status: "sent",
        sentAt,
      });

      result.sent += 1;
    } catch (error) {
      console.error("Calendar reminder send failed:", error.message);

      if (claimedEvent) {
        await releaseReminderAfterFailure(claimedEvent, error.message);
      }

      result.failed += 1;
    }
  }

  return result;
}

module.exports = {
  processDueCalendarReminders,
};
