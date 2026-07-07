import React from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  KanbanSquare,
  Plus,
  Trash2,
  Video,
  X,
} from "lucide-react";

import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  updateCalendarEvent,
} from "../../lib/api";

const STATUSES = [
  "Ideas",
  "Scripting",
  "Recording",
  "Editing",
  "Scheduled",
  "Posted",
];

function getCalendarKey(userId) {
  return userId
    ? `viraloContentCalendar:${userId}`
    : "viraloContentCalendar:guest";
}

function getCalendarMigrationKey(userId) {
  return userId
    ? `viraloContentCalendarMigrationV2:${userId}`
    : "viraloContentCalendarMigrationV2:guest";
}

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
}

function normalizeFingerprintValue(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getEventFingerprint(event = {}) {
  return [
    normalizeFingerprintValue(event.title),
    String(event.date || "").trim(),
    String(event.time || "10:00").slice(0, 5),
    normalizeFingerprintValue(event.platform || "YouTube"),
  ].join("|");
}

function dedupeEventsByFingerprint(items = []) {
  const seen = new Set();

  return items.filter((item) => {
    const fingerprint = getEventFingerprint(item);

    if (seen.has(fingerprint)) {
      return false;
    }

    seen.add(fingerprint);
    return true;
  });
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function getStartOfWeek(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() - value.getDay());
  return value;
}

function getWeekDays(viewDate) {
  const start = getStartOfWeek(viewDate);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function getMonthDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);

  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatMonth(date) {
  return date.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(date) {
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function loadEvents(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEvents(key, events) {
  localStorage.setItem(key, JSON.stringify(events));
}

function escapeIcsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], {
    type: "text/calendar;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function buildIcs(events) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Viralo AI//Content Calendar//EN",
  ];

  events.forEach((event) => {
    const start = new Date(`${event.date}T${event.time || "09:00"}`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const formatIcsDate = (date) =>
      `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
        date.getDate()
      )}T${pad(date.getHours())}${pad(date.getMinutes())}00`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id}@viralo-ai`);
    lines.push(`DTSTAMP:${formatIcsDate(new Date())}`);
    lines.push(`DTSTART:${formatIcsDate(start)}`);
    lines.push(`DTEND:${formatIcsDate(end)}`);
    lines.push(`SUMMARY:${escapeIcsText(event.title || "Content Topic")}`);
    lines.push(
      `DESCRIPTION:${escapeIcsText(
        `Platform: ${event.platform || "YouTube"} | Status: ${event.status || "Ideas"
        }`
      )}`
    );
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

export default function ContentCalendarWidget({
  userId,
  defaultTopic = "",
  variant = "card",
}) {
  const storageKey = React.useMemo(() => getCalendarKey(userId), [userId]);
  const migrationKey = React.useMemo(
    () => getCalendarMigrationKey(userId),
    [userId]
  );
  const [open, setOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(new Date());
  const [events, setEvents] = React.useState(() => loadEvents(storageKey));
  const [draggedEventId, setDraggedEventId] = React.useState("");
  const [viewMode, setViewMode] = React.useState("month");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState("");
  const [deleteEventId, setDeleteEventId] = React.useState("");
  const [calendarLoading, setCalendarLoading] = React.useState(Boolean(userId));
  const [calendarSaving, setCalendarSaving] = React.useState(false);
  const [calendarError, setCalendarError] = React.useState("");

  const [form, setForm] = React.useState({
    title: defaultTopic || "",
    date: toDateKey(new Date()),
    time: "10:00",
    platform: "YouTube",
    status: "Ideas",
    reminderMinutes: "30",
  });

  React.useEffect(() => {
    let active = true;

    async function loadCalendar() {
      const localEvents = loadEvents(storageKey);

      if (!userId) {
        if (active) {
          setEvents(localEvents);
          setCalendarLoading(false);
        }
        return;
      }

      setCalendarLoading(true);
      setCalendarError("");

      try {
        const response = await getCalendarEvents();
        let remoteEvents = Array.isArray(response?.items) ? response.items : [];
        const migrationComplete =
          localStorage.getItem(migrationKey) === "done";
        let migrationHadFailure = false;

        // Migrate every unmatched local plan, even when remote plans already exist.
        if (!migrationComplete && localEvents.length) {
          const remoteFingerprints = new Set(
            remoteEvents.map(getEventFingerprint)
          );
          const createdEvents = [];

          for (const localEvent of localEvents) {
            const fingerprint = getEventFingerprint(localEvent);

            if (remoteFingerprints.has(fingerprint)) {
              continue;
            }

            try {
              const created = await createCalendarEvent({
                title: localEvent.title,
                date: localEvent.date,
                time: localEvent.time,
                platform: localEvent.platform,
                status: localEvent.status,
                reminderMinutes: Number(localEvent.reminderMinutes || 30),
                timezone: localEvent.userTimezone || getBrowserTimeZone(),
              });

              if (!created?.item) {
                throw new Error("Migration response did not include the event.");
              }

              createdEvents.push(created.item);
              remoteFingerprints.add(fingerprint);
            } catch (migrationError) {
              migrationHadFailure = true;
              console.error("Calendar migration error:", migrationError);
            }
          }

          remoteEvents = dedupeEventsByFingerprint([
            ...remoteEvents,
            ...createdEvents,
          ]);

          // The marker is set only after every local item was matched or uploaded.
          if (!migrationHadFailure) {
            localStorage.setItem(migrationKey, "done");
          } else {
            // Preserve unmatched legacy events locally so the next load can retry.
            remoteEvents = dedupeEventsByFingerprint([
              ...remoteEvents,
              ...localEvents,
            ]);
          }
        }

        if (active) {
          setEvents(remoteEvents);

          if (migrationHadFailure) {
            setCalendarError(
              "Some older local calendar plans could not sync yet. They will retry automatically next time."
            );
          }
        }
      } catch (error) {
        if (active) {
          setEvents(localEvents);
          setCalendarError(
            error.message ||
            "Could not sync your content calendar. Please try again."
          );
        }
      } finally {
        if (active) {
          setCalendarLoading(false);
        }
      }
    }

    loadCalendar();

    return () => {
      active = false;
    };
  }, [migrationKey, storageKey, userId]);

  React.useEffect(() => {
    // Keeps a local backup only. The source of truth for logged-in users is the API.
    saveEvents(storageKey, events);
  }, [events, storageKey]);

  React.useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;

      // Sabse upar wala popup pehle close hoga.
      if (deleteEventId) {
        setDeleteEventId("");
        return;
      }

      if (formOpen) {
        setFormOpen(false);
        return;
      }

      setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, formOpen, deleteEventId]);

  React.useEffect(() => {
    if (userId) {
      return undefined;
    }

    const timer = setInterval(() => {
      const now = Date.now();

      setEvents((current) =>
        current.map((event) => {
          if (event.notified) return event;

          const eventTime = new Date(
            `${event.date}T${event.time || "09:00"}`
          ).getTime();
          const reminderMs = Number(event.reminderMinutes || 30) * 60 * 1000;

          if (eventTime - now > 0 && eventTime - now <= reminderMs) {
            if (
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification("Content reminder", {
                body: `${event.title} at ${event.time}`,
              });
            } else {
              window.alert(`Reminder: ${event.title} at ${event.time}`);
            }

            return {
              ...event,
              notified: true,
            };
          }

          return event;
        })
      );
    }, 60000);

    return () => clearInterval(timer);
  }, [userId]);

  const monthDays = React.useMemo(() => getMonthDays(viewDate), [viewDate]);
  const weekDays = React.useMemo(() => getWeekDays(viewDate), [viewDate]);

  const todayKey = toDateKey(new Date());

  const currentWeekStart = getStartOfWeek(new Date());
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
  currentWeekEnd.setHours(23, 59, 59, 999);

  const postedThisWeek = events.filter((item) => {
    if (item.status !== "Posted") return false;

    const date = new Date(`${item.date}T${item.time || "09:00"}`);

    return date >= currentWeekStart && date <= currentWeekEnd;
  }).length;

  const scheduledCount = events.filter(
    (item) => item.status === "Scheduled"
  ).length;

  const weeklyGoal = 3;

  const closeCalendar = () => {
    setDeleteEventId("");
    setOpen(false);
    setFormOpen(false);
  };

  const openCreateForm = (dateKey = toDateKey(new Date())) => {
    setEditingId("");
    setForm({
      title: defaultTopic || "",
      date: dateKey,
      time: "10:00",
      platform: "YouTube",
      status: "Ideas",
      reminderMinutes: "30",
    });
    setFormOpen(true);
  };

  const openEditForm = (event) => {
    setEditingId(event.id);
    setForm({
      title: event.title || "",
      date: event.date || toDateKey(new Date()),
      time: event.time || "10:00",
      platform: event.platform || "YouTube",
      status: event.status || "Ideas",
      reminderMinutes: String(event.reminderMinutes || "30"),
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      window.alert("Please enter content topic.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      platform: form.platform,
      status: form.status,
      reminderMinutes: Number(form.reminderMinutes || 30),
      timezone: getBrowserTimeZone(),
      notified: false,
    };

    setCalendarSaving(true);
    setCalendarError("");

    try {
      if (!userId) {
        const localPayload = {
          id: editingId || `content-${Date.now()}`,
          ...payload,
          createdAt: new Date().toISOString(),
        };

        setEvents((current) => {
          if (editingId) {
            return current.map((item) =>
              item.id === editingId ? { ...item, ...localPayload } : item
            );
          }

          return [localPayload, ...current];
        });
      } else if (editingId) {
        const response = await updateCalendarEvent(editingId, payload);
        const updatedItem = response?.item;

        setEvents((current) =>
          current.map((item) =>
            item.id === editingId ? updatedItem || { ...item, ...payload } : item
          )
        );
      } else {
        const response = await createCalendarEvent(payload);
        const createdItem = response?.item;

        if (!createdItem) {
          throw new Error("The content plan was not returned by the server.");
        }

        setEvents((current) => [createdItem, ...current]);
      }

      setFormOpen(false);
    } catch (error) {
      setCalendarError(error.message || "Could not save content plan.");
    } finally {
      setCalendarSaving(false);
    }
  };

  const handleDelete = (id) => {
    if (!id) return;

    // Global appConfirm use nahi karna.
    // Local portal popup hamesha calendar ke upar rahega.
    setDeleteEventId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteEventId) return;

    const eventId = deleteEventId;

    setCalendarSaving(true);
    setCalendarError("");

    try {
      if (userId) {
        await deleteCalendarEvent(eventId);
      }

      setEvents((current) => current.filter((item) => item.id !== eventId));
      setDeleteEventId("");
      setEditingId("");
      setFormOpen(false);
    } catch (error) {
      setCalendarError(error.message || "Could not delete content plan.");
      setDeleteEventId("");
    } finally {
      setCalendarSaving(false);
    }
  };

  const moveMonth = (direction) => {
    setViewDate((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + direction);
      return next;
    });
  };

  const handleDropOnDate = async (dateKey) => {
    if (!draggedEventId) return;

    const eventId = draggedEventId;
    const eventToMove = events.find((item) => item.id === eventId);

    if (!eventToMove || eventToMove.date === dateKey) {
      setDraggedEventId("");
      return;
    }

    setCalendarSaving(true);
    setCalendarError("");

    try {
      let updatedItem = {
        ...eventToMove,
        date: dateKey,
        timezone: eventToMove.userTimezone || getBrowserTimeZone(),
        notified: false,
      };

      if (userId) {
        const response = await updateCalendarEvent(eventId, updatedItem);
        updatedItem = response?.item || updatedItem;
      }

      setEvents((current) =>
        current.map((event) => (event.id === eventId ? updatedItem : event))
      );
    } catch (error) {
      setCalendarError(error.message || "Could not reschedule content plan.");
    } finally {
      setDraggedEventId("");
      setCalendarSaving(false);
    }
  };

  const handleExport = () => {
    if (!events.length) {
      window.alert("No calendar events to export.");
      return;
    }

    const ics = buildIcs(events);
    downloadTextFile("viralo-content-calendar.ics", ics);
  };

  const askNotificationPermission = async () => {
    if (!("Notification" in window)) {
      window.alert("Browser notifications are not supported.");
      return;
    }

    const result = await Notification.requestPermission();

    if (result === "granted") {
      window.alert("Reminder notifications enabled.");
    } else {
      window.alert("Reminder notification permission was not enabled.");
    }
  };

  const renderEventChip = (item) => (
    <button
      key={item.id}
      type="button"
      draggable
      onDragStart={() => setDraggedEventId(item.id)}
      onClick={() => openEditForm(item)}
      className="block w-full rounded-xl border border-cyan-300/15 bg-cyan-300/10 px-2 py-1 text-left text-[11px] leading-4 text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/15"
    >
      <span className="block truncate">{item.title}</span>
      <span className="text-[10px] text-cyan-100/60">
        {item.time} • {item.status}
      </span>
    </button>
  );

  const triggerButton =
    variant === "dashboard-floating" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="animate-calendar-float fixed bottom-6 right-5 z-[9000] flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-cyan-300/25 bg-[#101722]/90 text-cyan-200 shadow-2xl shadow-cyan-950/50 backdrop-blur-2xl transition hover:scale-105 hover:border-cyan-300/50 hover:bg-cyan-300/15 sm:bottom-8 sm:right-8 sm:h-[70px] sm:w-[70px]"
        title="Open Content Calendar"
      >
        <span className="absolute inset-0 rounded-[1.4rem] bg-cyan-300/10 blur-xl" />

        <CalendarDays className="relative h-7 w-7" />

        {events.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-cyan-300 px-1.5 text-[11px] font-bold text-black shadow-lg shadow-cyan-950/40">
            {events.length}
          </span>
        )}
      </button>
    ) : variant === "floating" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group absolute right-5 top-5 z-20 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 shadow-xl shadow-cyan-950/40 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyan-300/50 hover:bg-cyan-300/20"
        title="Open Content Calendar"
      >
        <CalendarDays className="h-5 w-5" />

        {events.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-300 px-1 text-[10px] font-bold text-black">
            {events.length}
          </span>
        )}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex h-full min-h-[150px] w-full flex-col justify-between overflow-hidden rounded-[1.7rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-300/12 via-white/[0.05] to-fuchsia-400/10 p-5 text-left shadow-2xl shadow-cyan-950/30 transition hover:-translate-y-1 hover:border-cyan-300/40 hover:shadow-cyan-500/10"
      >
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-300/20 blur-2xl transition group-hover:bg-cyan-300/30" />

        <div className="relative flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
            <CalendarDays className="h-6 w-6 text-cyan-200" />
          </div>

          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-cyan-100">
            Open
          </span>
        </div>

        <div className="relative mt-5">
          <p className="text-sm text-zinc-400">Content Calendar</p>
          <h3 className="mt-1 text-2xl font-semibold text-white">
            {events.length}
          </h3>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Plan topics, posting time and reminders.
          </p>
        </div>
      </button>
    );

  const calendarModal =
    open && typeof document !== "undefined"
      ? createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-6">
          <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#080a12] shadow-2xl shadow-black">
            <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  Native Content Planner
                </p>

                <h2 className="mt-1 text-xl font-semibold text-white">
                  Content Calendar
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={askNotificationPermission}
                  className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm text-zinc-200 transition hover:bg-white/[0.1]"
                >
                  <Bell className="h-4 w-4" />
                  Enable Reminder
                </button>

                <button
                  type="button"
                  onClick={handleExport}
                  className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm text-zinc-200 transition hover:bg-white/[0.1]"
                >
                  <Download className="h-4 w-4" />
                  Export .ics
                </button>

                <button
                  type="button"
                  onClick={() => openCreateForm()}
                  className="flex h-10 items-center gap-2 rounded-full bg-cyan-300 px-4 text-sm font-semibold text-black transition hover:bg-cyan-200"
                >
                  <Plus className="h-4 w-4" />
                  Add Topic
                </button>

                <button
                  type="button"
                  onClick={closeCalendar}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-zinc-300 transition hover:bg-white/[0.1]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {(calendarLoading || calendarError) && (
              <div
                className={`mx-4 mt-4 rounded-2xl border px-4 py-3 text-sm sm:mx-5 ${calendarError
                  ? "border-red-400/20 bg-red-500/10 text-red-200"
                  : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                  }`}
              >
                {calendarLoading
                  ? "Syncing your content calendar..."
                  : calendarError}
              </div>
            )}

            <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[1fr_330px]">
              <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveMonth(-1)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white transition hover:bg-white/[0.1]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <h3 className="min-w-[180px] text-center text-lg font-semibold text-white">
                      {formatMonth(viewDate)}
                    </h3>

                    <button
                      type="button"
                      onClick={() => moveMonth(1)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white transition hover:bg-white/[0.1]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex rounded-full border border-white/10 bg-white/[0.05] p-1">
                    {["month", "week", "pipeline"].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setViewMode(mode)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${viewMode === mode
                          ? "bg-cyan-300 text-black"
                          : "text-zinc-400 hover:text-white"
                          }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {viewMode === "month" && (
                  <div className="overflow-x-auto">
                    <div className="min-w-[760px]">
                      <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                          (day) => (
                            <div key={day}>{day}</div>
                          )
                        )}
                      </div>

                      <div className="grid grid-cols-7 gap-2">
                        {monthDays.map((date, index) => {
                          const dateKey = toDateKey(date);
                          const isCurrentMonth =
                            date.getMonth() === viewDate.getMonth();
                          const dayEvents = events.filter(
                            (item) => item.date === dateKey
                          );

                          return (
                            <div
                              key={`${dateKey}-${index}`}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => handleDropOnDate(dateKey)}
                              onDoubleClick={() => openCreateForm(dateKey)}
                              className={`min-h-[115px] rounded-2xl border p-2 transition ${dateKey === todayKey
                                ? "border-cyan-300/40 bg-cyan-300/10"
                                : "border-white/10 bg-white/[0.035]"
                                } ${!isCurrentMonth ? "opacity-40" : ""}`}
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs font-semibold text-zinc-300">
                                  {date.getDate()}
                                </p>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openCreateForm(dateKey);
                                  }}
                                  className="rounded-full p-1 text-zinc-500 transition hover:bg-white/10 hover:text-cyan-200"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="space-y-1">
                                {dayEvents.slice(0, 3).map(renderEventChip)}

                                {dayEvents.length > 3 && (
                                  <p className="text-[10px] text-zinc-500">
                                    +{dayEvents.length - 3} more
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {viewMode === "week" && (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
                    {weekDays.map((date) => {
                      const dateKey = toDateKey(date);
                      const dayEvents = events.filter(
                        (item) => item.date === dateKey
                      );

                      return (
                        <div
                          key={dateKey}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => handleDropOnDate(dateKey)}
                          className={`min-h-[320px] rounded-3xl border p-3 transition ${dateKey === todayKey
                            ? "border-cyan-300/40 bg-cyan-300/10"
                            : "border-white/10 bg-white/[0.035]"
                            }`}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {date.toLocaleString("en-IN", {
                                  weekday: "short",
                                })}
                              </p>

                              <p className="text-xs text-zinc-500">
                                {formatShortDate(date)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => openCreateForm(dateKey)}
                              className="rounded-full p-1 text-zinc-500 transition hover:bg-white/10 hover:text-cyan-200"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="space-y-2">
                            {dayEvents.length ? (
                              dayEvents.map(renderEventChip)
                            ) : (
                              <p className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-zinc-600">
                                No content planned.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {viewMode === "pipeline" && (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {STATUSES.map((status) => {
                      const statusEvents = events.filter(
                        (item) => item.status === status
                      );

                      return (
                        <div
                          key={status}
                          className="min-h-[260px] rounded-3xl border border-white/10 bg-white/[0.035] p-3"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-semibold text-white">
                              {status}
                            </p>

                            <span className="rounded-full bg-white/[0.06] px-2 py-1 text-xs text-zinc-400">
                              {statusEvents.length}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {statusEvents.length ? (
                              statusEvents.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => openEditForm(item)}
                                  className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-cyan-300/30"
                                >
                                  <p className="line-clamp-2 text-sm font-semibold text-white">
                                    {item.title}
                                  </p>

                                  <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                                    <Clock className="h-3.5 w-3.5" />
                                    {item.date} • {item.time}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <p className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-zinc-600">
                                No items here.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <aside className="border-t border-white/10 bg-white/[0.025] p-4 sm:p-5 lg:border-l lg:border-t-0">
                <div className="grid gap-3">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                      <p className="text-sm font-semibold text-white">
                        Weekly Goal
                      </p>
                    </div>

                    <p className="mt-3 text-3xl font-semibold text-white">
                      {postedThisWeek}/{weeklyGoal}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      videos posted this week
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-3">
                      <Video className="h-5 w-5 text-cyan-300" />
                      <p className="text-sm font-semibold text-white">
                        Scheduled
                      </p>
                    </div>

                    <p className="mt-3 text-3xl font-semibold text-white">
                      {scheduledCount}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      upcoming planned videos
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-3">
                      <KanbanSquare className="h-5 w-5 text-fuchsia-300" />
                      <p className="text-sm font-semibold text-white">
                        Pipeline
                      </p>
                    </div>

                    <p className="mt-3 text-xs leading-6 text-zinc-500">
                      Double click any date to add topic. Drag topic card to
                      another date to reschedule.
                    </p>
                  </div>
                </div>
              </aside>
            </div>

            {formOpen && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#0c0f18] p-5 shadow-2xl">
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      {editingId ? "Edit Content Plan" : "Add Content Plan"}
                    </h3>

                    <button
                      type="button"
                      onClick={() => setFormOpen(false)}
                      className="rounded-full p-2 text-zinc-400 transition hover:bg-white/10"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <label className="block">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        Topic
                      </p>

                      <input
                        value={form.title}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Example: 5 AI tools for creators"
                        className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/40"
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Date
                        </p>

                        <input
                          type="date"
                          value={form.date}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              date: event.target.value,
                            }))
                          }
                          className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm text-white outline-none focus:border-cyan-300/40"
                        />
                      </label>

                      <label className="block">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Time
                        </p>

                        <input
                          type="time"
                          value={form.time}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              time: event.target.value,
                            }))
                          }
                          className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm text-white outline-none focus:border-cyan-300/40"
                        />
                      </label>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Platform
                        </p>

                        <select
                          value={form.platform}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              platform: event.target.value,
                            }))
                          }
                          className="h-12 w-full rounded-2xl border border-white/10 bg-[#151821] px-4 text-sm text-white outline-none focus:border-cyan-300/40"
                        >
                          <option value="YouTube">YouTube</option>
                          <option value="YouTube Shorts">
                            YouTube Shorts
                          </option>
                          <option value="Instagram">Instagram</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="TikTok">TikTok</option>
                        </select>
                      </label>

                      <label className="block">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Status
                        </p>

                        <select
                          value={form.status}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              status: event.target.value,
                            }))
                          }
                          className="h-12 w-full rounded-2xl border border-white/10 bg-[#151821] px-4 text-sm text-white outline-none focus:border-cyan-300/40"
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="block">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        Reminder
                      </p>

                      <select
                        value={form.reminderMinutes}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            reminderMinutes: event.target.value,
                          }))
                        }
                        className="h-12 w-full rounded-2xl border border-white/10 bg-[#151821] px-4 text-sm text-white outline-none focus:border-cyan-300/40"
                      >
                        <option value="10">10 minutes before</option>
                        <option value="30">30 minutes before</option>
                        <option value="60">1 hour before</option>
                        <option value="1440">1 day before</option>
                      </select>
                    </label>

                    <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={calendarSaving}
                        className="h-12 flex-1 rounded-2xl bg-cyan-300 px-5 text-sm font-semibold text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {calendarSaving ? "Saving..." : "Save Plan"}
                      </button>

                      {editingId && (
                        <button
                          type="button"
                          onClick={() => handleDelete(editingId)}
                          disabled={calendarSaving}
                          className="h-12 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="mr-2 inline h-4 w-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )
      : null;

  const eventPendingDelete = events.find(
    (item) => item.id === deleteEventId
  );

  const deleteConfirmationModal =
    deleteEventId && typeof document !== "undefined"
      ? createPortal(
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-content-plan-title"
          onMouseDown={() => setDeleteEventId("")}
        >
          <div
            className="w-full max-w-md rounded-[2rem] border border-white/15 bg-[#0c0f18] p-5 shadow-2xl shadow-black/80 sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-300">
                  Delete Content Plan
                </p>

                <h3
                  id="delete-content-plan-title"
                  className="mt-2 text-xl font-semibold text-white"
                >
                  Delete this plan?
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setDeleteEventId("")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-zinc-300 transition hover:bg-white/[0.1]"
                aria-label="Close delete confirmation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-zinc-400">
              <span className="font-medium text-zinc-200">
                {eventPendingDelete?.title || "This content plan"}
              </span>{" "}
              will be permanently removed from your calendar.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteEventId("")}
                className="h-11 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.1]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={calendarSaving}
                className="h-11 rounded-2xl bg-red-500 px-5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="mr-2 inline h-4 w-4" />
                {calendarSaving ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
      : null;

  return (
    <>
      {triggerButton}
      {calendarModal}
      {deleteConfirmationModal}
    </>
  );
}