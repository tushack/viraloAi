import { useSyncExternalStore } from "react";

const STORAGE_KEY = "viraloBackgroundTasks:v1";
const MAX_STORED_TASKS = 24;
const TASK_EVENT = "viralo:background-tasks-changed";

let version = 0;
let notificationPermissionPromise = null;
let taskNavigator = null;
const listeners = new Set();
const runningPromises = new Map();

function nowIso() {
  return new Date().toISOString();
}

function createId(kind = "task") {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${String(kind || "task").replace(/[^a-z0-9-]/gi, "-")}-${random}`;
}

function toSerializable(value, seen = new WeakSet()) {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value ?? null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof File !== "undefined" && value instanceof File) {
    return {
      __type: "File",
      name: value.name,
      size: value.size,
      type: value.type,
      lastModified: value.lastModified,
    };
  }

  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return {
      __type: "Blob",
      size: value.size,
      type: value.type,
    };
  }

  if (value instanceof Error) {
    return {
      name: value.name || "Error",
      message: value.message || "Something went wrong.",
      code: value.code || "",
      status: value.status || value.statusCode || null,
      upgrade: toSerializable(value.upgrade, seen),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => toSerializable(item, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);

    const output = {};

    Object.entries(value).forEach(([key, item]) => {
      if (typeof item === "function") return;
      output[key] = toSerializable(item, seen);
    });

    seen.delete(value);
    return output;
  }

  return String(value);
}

function readStoredTasks() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");

    if (!Array.isArray(parsed)) return [];

    const restoredAt = nowIso();

    return parsed
      .filter((task) => task && task.id && task.key)
      .map((task) =>
        task.status === "running"
          ? {
              ...task,
              status: "failed",
              error: {
                name: "InterruptedTask",
                message:
                  "This task was interrupted because the Viralo AI tab was reloaded or closed.",
              },
              updatedAt: restoredAt,
              completedAt: restoredAt,
            }
          : task
      )
      .slice(0, MAX_STORED_TASKS);
  } catch {
    return [];
  }
}

let tasks = readStoredTasks();

function persistTasks() {
  if (typeof window === "undefined") return;

  try {
    const compact = tasks
      .slice()
      .sort(
        (first, second) =>
          new Date(second.updatedAt || second.createdAt || 0).getTime() -
          new Date(first.updatedAt || first.createdAt || 0).getTime()
      )
      .slice(0, MAX_STORED_TASKS);

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
  } catch (error) {
    console.warn("Background task storage is unavailable:", error);
  }
}

function emitChange() {
  version += 1;
  persistTasks();

  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("Background task listener error:", error);
    }
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(TASK_EVENT, {
        detail: {
          version,
        },
      })
    );
  }
}

function updateTask(taskId, updater) {
  let updatedTask = null;

  tasks = tasks.map((task) => {
    if (task.id !== taskId) return task;

    updatedTask = {
      ...task,
      ...updater(task),
      updatedAt: nowIso(),
    };

    return updatedTask;
  });

  if (updatedTask) {
    emitChange();
  }

  return updatedTask;
}

function getTaskPromise(taskId) {
  return runningPromises.get(taskId) || null;
}

function getRunningTaskByKey(key) {
  return tasks.find((task) => task.key === key && task.status === "running") || null;
}

function shouldShowSystemNotification(task) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return false;
  }

  return document.visibilityState !== "visible" || window.location.pathname !== task.route;
}

export function buildBackgroundTaskUrl(task) {
  if (!task?.route) return "/dashboard";

  if (typeof window === "undefined") {
    return `${task.route}?backgroundTask=${encodeURIComponent(task.id)}`;
  }

  const url = new URL(task.route, window.location.origin);
  url.searchParams.set("backgroundTask", task.id);

  return `${url.pathname}${url.search}${url.hash}`;
}

export function registerBackgroundTaskNavigator(navigator) {
  taskNavigator = typeof navigator === "function" ? navigator : null;

  return () => {
    if (taskNavigator === navigator) {
      taskNavigator = null;
    }
  };
}

export function markBackgroundTaskViewed(taskId) {
  if (!taskId) return;

  updateTask(taskId, () => ({
    viewedAt: nowIso(),
  }));
}

export function openBackgroundTask(task) {
  if (!task) return;

  markBackgroundTaskViewed(task.id);

  const url = buildBackgroundTaskUrl(task);

  if (typeof window !== "undefined") {
    try {
      window.focus();
    } catch {
      // Ignore focus failures.
    }
  }

  if (taskNavigator) {
    taskNavigator(task, url);
    return;
  }

  if (typeof window !== "undefined") {
    window.location.assign(url);
  }
}

export function requestBackgroundNotificationPermission() {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "default"
  ) {
    return Promise.resolve(
      typeof Notification !== "undefined" ? Notification.permission : "unsupported"
    );
  }

  if (!notificationPermissionPromise) {
    notificationPermissionPromise = Notification.requestPermission().catch(
      () => "denied"
    );
  }

  return notificationPermissionPromise;
}

async function showSystemNotification(task) {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !shouldShowSystemNotification(task)
  ) {
    return;
  }

  const permission =
    Notification.permission === "default"
      ? await requestBackgroundNotificationPermission()
      : Notification.permission;

  if (permission !== "granted") return;

  try {
    const notification = new Notification(
      task.status === "completed"
        ? task.title || "Viralo AI task complete"
        : `${task.title || "Viralo AI task"} failed`,
      {
        body:
          task.status === "completed"
            ? task.successMessage || "Your result is ready. Click to open it."
            : task.error?.message ||
              task.errorMessage ||
              "The task could not be completed.",
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `viralo-background-${task.key}`,
        renotify: true,
        data: {
          taskId: task.id,
          url: buildBackgroundTaskUrl(task),
        },
      }
    );

    notification.onclick = () => {
      notification.close();
      openBackgroundTask(task);
    };
  } catch (error) {
    console.warn("Browser notification could not be shown:", error);
  }
}

export function reportBackgroundTaskProgress(taskId, progress, message = "") {
  const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));

  updateTask(taskId, () => ({
    progress: safeProgress,
    progressMessage: String(message || ""),
  }));
}

export function runBackgroundTask({
  key,
  kind = "generic",
  title = "Viralo AI task",
  route = "/dashboard",
  input = null,
  successMessage = "Your result is ready. Click to open it.",
  errorMessage = "The task could not be completed.",
  run,
}) {
  if (!key) {
    throw new Error("Background task key is required.");
  }

  if (typeof run !== "function") {
    throw new Error("Background task run function is required.");
  }

  const existing = getRunningTaskByKey(key);

  if (existing) {
    const existingPromise = getTaskPromise(existing.id);

    if (existingPromise) {
      return {
        id: existing.id,
        promise: existingPromise,
        reused: true,
      };
    }
  }

  requestBackgroundNotificationPermission();

  const id = createId(kind);
  const createdAt = nowIso();

  const task = {
    id,
    key,
    kind,
    title,
    route,
    input: toSerializable(input),
    result: null,
    error: null,
    status: "running",
    progress: 0,
    progressMessage: "",
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
    viewedAt: null,
    successMessage,
    errorMessage,
  };

  tasks = [task, ...tasks.filter((item) => item.id !== id)].slice(
    0,
    MAX_STORED_TASKS
  );
  emitChange();

  const promise = Promise.resolve()
    .then(() =>
      run({
        taskId: id,
        reportProgress: (progress, message = "") =>
          reportBackgroundTaskProgress(id, progress, message),
      })
    )
    .then((result) => {
      const completedTask = updateTask(id, () => ({
        status: "completed",
        progress: 100,
        result: toSerializable(result),
        completedAt: nowIso(),
      }));

      if (completedTask) {
        void showSystemNotification(completedTask);
      }

      return result;
    })
    .catch((error) => {
      const failedTask = updateTask(id, () => ({
        status: "failed",
        error: toSerializable(error),
        completedAt: nowIso(),
      }));

      if (failedTask) {
        void showSystemNotification(failedTask);
      }

      throw error;
    })
    .finally(() => {
      runningPromises.delete(id);
    });

  runningPromises.set(id, promise);

  return {
    id,
    promise,
    reused: false,
  };
}

export function getBackgroundTasks() {
  return tasks
    .slice()
    .sort(
      (first, second) =>
        new Date(second.updatedAt || second.createdAt || 0).getTime() -
        new Date(first.updatedAt || first.createdAt || 0).getTime()
    );
}

export function getBackgroundTaskById(taskId) {
  if (!taskId) return null;
  return tasks.find((task) => task.id === taskId) || null;
}

export function getLatestBackgroundTask(key) {
  if (!key) return null;

  return (
    getBackgroundTasks().find((task) => task.key === key) ||
    null
  );
}

export function getLatestBackgroundTaskByKind(kind) {
  if (!kind) return null;

  return (
    getBackgroundTasks().find((task) => task.kind === kind) ||
    null
  );
}

export function subscribeBackgroundTasks(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getVersionSnapshot() {
  return version;
}

export function useBackgroundTasks() {
  useSyncExternalStore(
    subscribeBackgroundTasks,
    getVersionSnapshot,
    getVersionSnapshot
  );

  return getBackgroundTasks();
}

export function useBackgroundTask(key) {
  useSyncExternalStore(
    subscribeBackgroundTasks,
    getVersionSnapshot,
    getVersionSnapshot
  );

  return getLatestBackgroundTask(key);
}

export function useBackgroundTaskByKind(kind) {
  useSyncExternalStore(
    subscribeBackgroundTasks,
    getVersionSnapshot,
    getVersionSnapshot
  );

  return getLatestBackgroundTaskByKind(kind);
}

export function useBackgroundTaskById(taskId) {
  useSyncExternalStore(
    subscribeBackgroundTasks,
    getVersionSnapshot,
    getVersionSnapshot
  );

  return getBackgroundTaskById(taskId);
}

export function isBackgroundTaskRouteActive(route) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  return (
    document.visibilityState === "visible" &&
    window.location.pathname === route
  );
}
