import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  X,
} from "lucide-react";

import {
  openBackgroundTask,
  markBackgroundTaskViewed,
  registerBackgroundTaskNavigator,
  useBackgroundTasks,
} from "../../lib/backgroundTasks";

function getTaskMessage(task) {
  if (task.status === "running") {
    if (task.progressMessage) return task.progressMessage;

    if (Number(task.progress || 0) > 0) {
      return `${Math.round(task.progress)}% complete`;
    }

    return "Working in the background...";
  }

  if (task.status === "completed") {
    return task.successMessage || "Your result is ready.";
  }

  return (
    task.error?.message ||
    task.errorMessage ||
    "The task could not be completed."
  );
}

export default function BackgroundTaskCenter() {
  const navigate = useNavigate();
  const location = useLocation();
  const tasks = useBackgroundTasks();

  useEffect(
    () =>
      registerBackgroundTaskNavigator((_task, url) => {
        navigate(url);
      }),
    [navigate]
  );

  const visibleTasks = useMemo(
    () =>
      tasks
        .filter((task) => {
          if (task.status === "running") {
            return location.pathname !== task.route;
          }

          return !task.viewedAt;
        })
        .slice(0, 3),
    [location.pathname, tasks]
  );

  if (!visibleTasks.length) return null;

  return (
    <aside
      aria-label="Background tasks"
      className="pointer-events-none fixed right-3 top-3 z-[20000] flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-3 sm:right-5 sm:top-5"
    >
      {visibleTasks.map((task) => {
        const completed = task.status === "completed";
        const failed = task.status === "failed";
        const progress = Math.max(
          0,
          Math.min(100, Number(task.progress || 0))
        );

        return (
          <div
            key={task.id}
            className="pointer-events-auto overflow-hidden rounded-3xl border border-white/10 bg-[#090c14]/95 p-4 text-white shadow-2xl shadow-black/50 backdrop-blur-2xl"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                  completed
                    ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                    : failed
                      ? "border-red-300/20 bg-red-400/10 text-red-200"
                      : "border-cyan-300/20 bg-cyan-300/10 text-cyan-200"
                }`}
              >
                {completed ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : failed ? (
                  <CircleAlert className="h-5 w-5" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {task.title}
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  {getTaskMessage(task)}
                </p>
              </div>

              {task.status !== "running" && (
                <button
                  type="button"
                  onClick={() => markBackgroundTaskViewed(task.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {task.status === "running" && progress > 0 && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {task.status !== "running" && (
              <button
                type="button"
                onClick={() => openBackgroundTask(task)}
                className={`mt-3 h-10 w-full rounded-2xl text-xs font-semibold transition ${
                  failed
                    ? "border border-white/10 bg-white/[0.05] text-zinc-200 hover:bg-white/[0.09]"
                    : "bg-white text-black hover:bg-zinc-200"
                }`}
              >
                {failed ? "Open and retry" : "View result"}
              </button>
            )}
          </div>
        );
      })}
    </aside>
  );
}
