import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Film,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  StickyNote,
  MessageSquare,
  Users,
  X,
} from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import AdminContactMessagesTab from "../components/admin/AdminContactMessagesTab";

import {
  addAdminUserNote,
  getAdminActivity,
  getAdminCalendarEvents,
  getAdminMediaExports,
  getAdminOverview,
  getAdminUser,
  getAdminUsers,
  updateAdminUserStatus,
} from "../lib/api";

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "users", label: "Users", icon: Users },
  { id: "activity", label: "Activity", icon: Clock3 },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "exports", label: "Media Exports", icon: Download },
  { id: "contactMessages", label: "Contact Messages", icon: MessageSquare },

];

function formatDate(value, fallback = "—") {
  if (!value) return fallback;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

function formatBytes(value) {
  const bytes = Number(value || 0);

  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

function getUserLabel(user) {
  return (
    user?.name ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    user?.uid?.slice(0, 10) ||
    "Unknown user"
  );
}

function getActivityMessage(item) {
  const metadata = item?.metadata || {};
  const value =
    metadata.title ||
    metadata.topic ||
    metadata.niche ||
    metadata.channelTitle ||
    metadata.channelName ||
    metadata.query ||
    metadata.message ||
    "";

  return value ? String(value) : "";
}

function statusPillClass(status) {
  if (status === "success") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  }

  if (status === "failed") {
    return "border-red-300/20 bg-red-500/10 text-red-200";
  }

  return "border-cyan-300/20 bg-cyan-300/10 text-cyan-100";
}

function MetricCard({ icon: Icon, label, value, caption }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-xl shadow-black/10">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
          <Icon className="h-5 w-5 text-cyan-300" />
        </div>

        <p className="text-xs text-zinc-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-white">
          {formatNumber(value)}
        </p>
        <p className="mt-2 text-xs leading-5 text-zinc-500">{caption}</p>
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, description, children, action }) {
  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {description && (
              <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
            )}
          </div>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }) {
  return (
    <div className="p-8 text-center text-sm text-zinc-500">{text}</div>
  );
}

function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
      <p className="text-xs text-zinc-500">
        Page {pagination.page} of {pagination.totalPages} · {pagination.total} records
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="h-8 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs text-zinc-200 hover:bg-white/[0.1] disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="h-8 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs text-zinc-200 hover:bg-white/[0.1] disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function UserAvatar({ user, className = "" }) {
  const label = getUserLabel(user);
  const initials = label.slice(0, 2).toUpperCase();

  if (user?.photoUrl) {
    return (
      <img
        src={user.photoUrl}
        alt={label}
        className={`h-9 w-9 rounded-2xl border border-white/10 object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-xs font-semibold text-cyan-100 ${className}`}
    >
      {initials}
    </div>
  );
}

export default function AdminPanel() {
  const [tab, setTab] = useState("overview");
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState(null);
  const [usersData, setUsersData] = useState({ items: [], pagination: null });
  const [activityData, setActivityData] = useState({
    items: [],
    pagination: null,
  });
  const [calendarData, setCalendarData] = useState({
    items: [],
    pagination: null,
  });
  const [mediaData, setMediaData] = useState({ items: [], pagination: null });
  const [userSearch, setUserSearch] = useState("");
  const [activityModule, setActivityModule] = useState("");
  const [activityStatus, setActivityStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserData, setSelectedUserData] = useState(null);
  const [userDrawerLoading, setUserDrawerLoading] = useState(false);
  const [drawerSection, setDrawerSection] = useState("overview");
  const [noteText, setNoteText] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const kpis = overview?.kpis || {};

  const visibleModules = useMemo(() => {
    const modules = overview?.moduleUsage || [];
    return modules.slice(0, 8);
  }, [overview]);

  const loadOverview = async () => {
    const data = await getAdminOverview(days);
    setOverview(data);
  };

  const loadUsers = async (page = 1, search = userSearch) => {
    const data = await getAdminUsers({
      page,
      limit: 50,
      search,
    });
    setUsersData(data);
  };

  const loadActivity = async (page = 1) => {
    const data = await getAdminActivity({
      page,
      limit: 50,
      module: activityModule,
      status: activityStatus,
    });
    setActivityData(data);
  };

  const loadCalendar = async (page = 1) => {
    const data = await getAdminCalendarEvents({ page, limit: 50 });
    setCalendarData(data);
  };

  const loadMedia = async (page = 1) => {
    const data = await getAdminMediaExports({ page, limit: 50 });
    setMediaData(data);
  };

  const refreshAll = async () => {
    setLoading(true);
    setError("");

    try {
      const [summary, users, activity, calendar, media] = await Promise.all([
        getAdminOverview(days),
        getAdminUsers({ page: 1, limit: 50, search: userSearch }),
        getAdminActivity({
          page: 1,
          limit: 50,
          module: activityModule,
          status: activityStatus,
        }),
        getAdminCalendarEvents({ page: 1, limit: 50 }),
        getAdminMediaExports({ page: 1, limit: 50 }),
      ]);

      setOverview(summary);
      setUsersData(users);
      setActivityData(activity);
      setCalendarData(calendar);
      setMediaData(media);
    } catch (requestError) {
      setError(requestError.message || "Could not load admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // Initial dashboard load and manual range change only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!loading) {
        loadUsers(1, userSearch).catch((requestError) =>
          setError(requestError.message || "Could not search users.")
        );
      }
    }, 350);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch]);

  useEffect(() => {
    if (loading) return;

    loadActivity(1).catch((requestError) =>
      setError(requestError.message || "Could not filter activity.")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityModule, activityStatus]);

  const openUser = async (userId) => {
    setSelectedUserId(userId);
    setSelectedUserData(null);
    setDrawerSection("overview");
    setNoteText("");
    setUserDrawerLoading(true);

    try {
      const data = await getAdminUser(userId);
      setSelectedUserData(data);
    } catch (requestError) {
      setError(requestError.message || "Could not load user details.");
      setSelectedUserId("");
    } finally {
      setUserDrawerLoading(false);
    }
  };

  const handleUserStatus = async () => {
    const user = selectedUserData?.user;

    if (!user?.uid) return;

    const nextDisabled = !user.disabled;
    const confirmation = window.confirm(
      nextDisabled
        ? `Disable ${getUserLabel(user)}? They will no longer be able to sign in.`
        : `Enable ${getUserLabel(user)}?`
    );

    if (!confirmation) return;

    setActionLoading("status");

    try {
      const response = await updateAdminUserStatus(user.uid, nextDisabled);

      setSelectedUserData((current) =>
        current
          ? {
            ...current,
            user: {
              ...current.user,
              ...response.user,
            },
          }
          : current
      );

      await Promise.all([
        loadUsers(usersData.pagination?.page || 1),
        loadOverview(),
        loadActivity(activityData.pagination?.page || 1),
      ]);
    } catch (requestError) {
      setError(requestError.message || "Could not update user status.");
    } finally {
      setActionLoading("");
    }
  };

  const handleAddNote = async () => {
    const cleanNote = noteText.trim();

    if (!cleanNote || !selectedUserId) return;

    setActionLoading("note");

    try {
      const response = await addAdminUserNote(selectedUserId, cleanNote);

      setSelectedUserData((current) =>
        current
          ? {
            ...current,
            notes: [response.note, ...(current.notes || [])],
          }
          : current
      );
      setNoteText("");
    } catch (requestError) {
      setError(requestError.message || "Could not add admin note.");
    } finally {
      setActionLoading("");
    }
  };

  const reloadTab = async () => {
    setTableLoading(true);
    setError("");

    try {
      if (tab === "overview") await loadOverview();
      if (tab === "users") await loadUsers(usersData.pagination?.page || 1);
      if (tab === "activity") await loadActivity(activityData.pagination?.page || 1);
      if (tab === "calendar") await loadCalendar(calendarData.pagination?.page || 1);
      if (tab === "exports") await loadMedia(mediaData.pagination?.page || 1);

    } catch (requestError) {
      setError(requestError.message || "Could not refresh admin data.");
    } finally {
      setTableLoading(false);
    }
  };

  const userDrawer =
    selectedUserId && typeof document !== "undefined"
      ? createPortal(
        <div className="fixed inset-0 z-[100000] flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-3xl flex-col border-l border-white/10 bg-[#0a0d15] shadow-2xl shadow-black/80">
            <div className="flex items-start justify-between border-b border-white/10 p-5 sm:p-6">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar user={selectedUserData?.user} className="h-12 w-12 rounded-2xl" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                    User profile
                  </p>
                  <h2 className="mt-1 truncate text-xl font-semibold text-white">
                    {selectedUserData?.user
                      ? getUserLabel(selectedUserData.user)
                      : "Loading user..."}
                  </h2>
                  <p className="mt-1 truncate text-sm text-zinc-500">
                    {selectedUserData?.user?.email || selectedUserId}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedUserId("");
                  setSelectedUserData(null);
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1]"
                aria-label="Close user details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {userDrawerLoading && (
              <div className="flex flex-1 items-center justify-center gap-3 text-sm text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
                Loading complete user activity...
              </div>
            )}

            {!userDrawerLoading && selectedUserData && (
              <>
                <div className="overflow-x-auto border-b border-white/10 px-4 py-3">
                  <div className="flex min-w-max gap-2">
                    {[
                      ["overview", "Overview"],
                      ["activity", "Activity"],
                      ["research", "Research"],
                      ["calendar", "Calendar"],
                      ["exports", "Exports"],
                      ["saved", "Saved Ideas"],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setDrawerSection(id)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${drawerSection === id
                          ? "bg-cyan-300 text-black"
                          : "border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                  {drawerSection === "overview" && (
                    <div className="space-y-5">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard
                          icon={BrainCircuit}
                          label="Research scans"
                          value={selectedUserData.totals.research}
                          caption="Saved research records"
                        />
                        <MetricCard
                          icon={CalendarDays}
                          label="Calendar plans"
                          value={selectedUserData.totals.calendarPlans}
                          caption="Active content plans"
                        />
                        <MetricCard
                          icon={Download}
                          label="Exports"
                          value={selectedUserData.totals.mediaExports}
                          caption="Media export records"
                        />
                        <MetricCard
                          icon={Activity}
                          label="Tracked actions"
                          value={selectedUserData.totals.activities}
                          caption="Recent activity history"
                        />
                      </div>

                      <div className="grid gap-5 lg:grid-cols-2">
                        <SectionCard
                          title="Account controls"
                          description={`Joined ${formatDate(
                            selectedUserData.user.createdAt
                          )}`}
                        >
                          <div className="space-y-3 p-5">
                            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                              <div>
                                <p className="text-sm font-medium text-white">
                                  Account status
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                  {selectedUserData.user.disabled
                                    ? "This account cannot sign in."
                                    : "This account is active."}
                                </p>
                              </div>
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-semibold ${selectedUserData.user.disabled
                                  ? "border-red-300/20 bg-red-500/10 text-red-200"
                                  : "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                                  }`}
                              >
                                {selectedUserData.user.disabled ? "Disabled" : "Active"}
                              </span>
                            </div>

                            <Button
                              type="button"
                              onClick={handleUserStatus}
                              disabled={actionLoading === "status"}
                              className={`h-11 w-full rounded-2xl px-5 text-sm font-semibold ${selectedUserData.user.disabled
                                ? "bg-emerald-400 text-black hover:bg-emerald-300"
                                : "bg-red-500 text-white hover:bg-red-400"
                                }`}
                            >
                              {actionLoading === "status"
                                ? "Updating..."
                                : selectedUserData.user.disabled
                                  ? "Enable account"
                                  : "Disable account"}
                            </Button>
                          </div>
                        </SectionCard>

                        <SectionCard
                          title="YouTube connection"
                          description="Connected channel metadata only. OAuth tokens are never shown."
                        >
                          <div className="p-5">
                            {selectedUserData.youtubeConnection?.channel_id ? (
                              <div className="flex items-center gap-3">
                                {selectedUserData.youtubeConnection.channel_thumbnail ? (
                                  <img
                                    src={selectedUserData.youtubeConnection.channel_thumbnail}
                                    alt={selectedUserData.youtubeConnection.channel_title}
                                    className="h-12 w-12 rounded-2xl border border-white/10 object-cover"
                                  />
                                ) : (
                                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                                    <Film className="h-5 w-5 text-cyan-300" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-white">
                                    {selectedUserData.youtubeConnection.channel_title}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-zinc-500">
                                    Connected {formatDate(selectedUserData.youtubeConnection.updated_at)}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-zinc-500">
                                No YouTube channel connected.
                              </p>
                            )}
                          </div>
                        </SectionCard>
                      </div>

                      <SectionCard
                        title="Admin notes"
                        description="Internal notes are visible only to admins."
                      >
                        <div className="border-b border-white/10 p-5">
                          <textarea
                            value={noteText}
                            onChange={(event) => setNoteText(event.target.value)}
                            placeholder="Add an internal note about this user..."
                            className="min-h-24 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/40"
                          />
                          <div className="mt-3 flex justify-end">
                            <Button
                              type="button"
                              onClick={handleAddNote}
                              disabled={!noteText.trim() || actionLoading === "note"}
                              className="h-10 rounded-full bg-cyan-300 px-4 text-sm font-semibold text-black hover:bg-cyan-200 disabled:opacity-50"
                            >
                              <StickyNote className="h-4 w-4" />
                              {actionLoading === "note" ? "Saving..." : "Add note"}
                            </Button>
                          </div>
                        </div>

                        <div className="divide-y divide-white/10">
                          {(selectedUserData.notes || []).length ? (
                            selectedUserData.notes.map((note) => (
                              <div key={note.id} className="p-5">
                                <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                                  {note.note}
                                </p>
                                <p className="mt-2 text-xs text-zinc-500">
                                  {note.created_by_email || "Admin"} · {formatDate(note.created_at)}
                                </p>
                              </div>
                            ))
                          ) : (
                            <EmptyState text="No internal notes yet." />
                          )}
                        </div>
                      </SectionCard>
                    </div>
                  )}

                  {drawerSection === "activity" && (
                    <SectionCard title="Activity timeline" description="Newest tracked actions first.">
                      <div className="divide-y divide-white/10">
                        {(selectedUserData.activities || []).length ? (
                          selectedUserData.activities.map((item) => (
                            <div key={item.id} className="flex gap-3 p-5">
                              <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-300" />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-medium text-white">
                                    {String(item.event_type || "").replaceAll(".", " · ")}
                                  </p>
                                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusPillClass(item.status)}`}>
                                    {item.status}
                                  </span>
                                </div>
                                {getActivityMessage(item) && (
                                  <p className="mt-1 text-sm text-zinc-500">
                                    {getActivityMessage(item)}
                                  </p>
                                )}
                                <p className="mt-2 text-xs text-zinc-600">
                                  {formatDate(item.created_at)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <EmptyState text="No tracked activity yet. New actions will appear here." />
                        )}
                      </div>
                    </SectionCard>
                  )}

                  {drawerSection === "research" && (
                    <SectionCard title="Research history" description="Latest stored research scans.">
                      <div className="divide-y divide-white/10">
                        {(selectedUserData.researchQueries || []).length ? (
                          selectedUserData.researchQueries.map((item) => (
                            <div key={item.id} className="p-5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium text-white">{item.niche}</p>
                                <p className="text-xs text-zinc-500">{formatDate(item.created_at)}</p>
                              </div>
                              <p className="mt-2 text-sm text-zinc-500">
                                {item.platform} · {item.audience}
                              </p>
                            </div>
                          ))
                        ) : (
                          <EmptyState text="No research history found." />
                        )}
                      </div>
                    </SectionCard>
                  )}

                  {drawerSection === "calendar" && (
                    <SectionCard title="Content calendar" description="Includes deleted plans for admin audit.">
                      <div className="divide-y divide-white/10">
                        {(selectedUserData.calendarEvents || []).length ? (
                          selectedUserData.calendarEvents.map((item) => (
                            <div key={item.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium text-white">{item.title}</p>
                                <p className="mt-1 text-sm text-zinc-500">
                                  {item.scheduled_date} · {String(item.scheduled_time || "").slice(0, 5)} · {item.platform}
                                </p>
                              </div>
                              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.deleted_at
                                ? "border-red-300/20 bg-red-500/10 text-red-200"
                                : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                                }`}>
                                {item.deleted_at ? "Deleted" : item.status}
                              </span>
                            </div>
                          ))
                        ) : (
                          <EmptyState text="No calendar plans found." />
                        )}
                      </div>
                    </SectionCard>
                  )}

                  {drawerSection === "exports" && (
                    <SectionCard title="Media exports" description="Stored export history, without exposing file paths.">
                      <div className="divide-y divide-white/10">
                        {(selectedUserData.mediaExports || []).length ? (
                          selectedUserData.mediaExports.map((item) => (
                            <div key={item.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="truncate font-medium text-white">
                                  {item.youtube_title || item.output_name || item.original_name}
                                </p>
                                <p className="mt-1 text-sm text-zinc-500">
                                  {item.output_type} · {item.output_quality || "Original"} · {formatBytes(item.output_bytes)}
                                </p>
                              </div>
                              <p className="text-xs text-zinc-500">{formatDate(item.created_at)}</p>
                            </div>
                          ))
                        ) : (
                          <EmptyState text="No media exports found." />
                        )}
                      </div>
                    </SectionCard>
                  )}

                  {drawerSection === "saved" && (
                    <SectionCard title="Saved ideas" description="Ideas explicitly saved by this user.">
                      <div className="divide-y divide-white/10">
                        {(selectedUserData.savedIdeas || []).length ? (
                          selectedUserData.savedIdeas.map((item) => (
                            <div key={item.id} className="p-5">
                              <div className="flex items-center justify-between gap-3">
                                <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-xs font-semibold text-violet-200">
                                  {item.type}
                                </span>
                                <p className="text-xs text-zinc-500">{formatDate(item.created_at)}</p>
                              </div>
                              <p className="mt-3 text-sm leading-6 text-zinc-200">{item.content}</p>
                              <p className="mt-2 text-xs text-zinc-500">
                                {item.niche || "No niche"} · {item.platform || "No platform"}
                              </p>
                            </div>
                          ))
                        ) : (
                          <EmptyState text="No saved ideas found." />
                        )}
                      </div>
                    </SectionCard>
                  )}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )
      : null;

  return (
    <DashboardLayout
      eyebrow="Platform Control Center"
      title="Admin Panel"
      onNewScan={reloadTab}
      headerActionLabel="Refresh"
      headerActionIcon={RefreshCw}
    >
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-3xl border border-red-300/20 bg-red-500/10 p-4 text-sm text-red-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Admin data could not be loaded</p>
            <p className="mt-1 leading-6 text-red-100/80">{error}</p>
            {error.toLowerCase().includes("admin access") && (
              <p className="mt-2 text-xs text-red-100/70">
                Add your login email to backend <code>ADMIN_EMAILS</code>, then restart the backend.
              </p>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
            Loading secure admin data...
          </div>
        </div>
      ) : (
        <>
          <section className="rounded-[2rem] border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.10] via-white/[0.04] to-violet-400/[0.08] p-5 shadow-2xl shadow-cyan-950/20 sm:p-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
                  <ShieldCheck className="h-4 w-4" />
                  Server-protected admin access
                </div>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                  See users, usage and every tracked product action.
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
                  Firebase holds user identity, while Supabase stores research, calendar plans,
                  saved ideas, media exports and audit logs.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[7, 30, 90].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDays(value)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${days === value
                      ? "border-cyan-300 bg-cyan-300 text-black"
                      : "border-white/10 bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1]"
                      }`}
                  >
                    Last {value} days
                  </button>
                ))}

                <Button
                  type="button"
                  onClick={refreshAll}
                  disabled={tableLoading}
                  className="h-10 rounded-full border border-white/10 bg-white/[0.07] px-4 text-sm text-zinc-100 hover:bg-white/[0.12]"
                >
                  <RefreshCw className={`h-4 w-4 ${tableLoading ? "animate-spin" : ""}`} />
                  Refresh all
                </Button>
              </div>
            </div>
          </section>

          <section className="mt-5 overflow-x-auto">
            <div className="flex min-w-max gap-2 rounded-3xl border border-white/10 bg-white/[0.035] p-2">
              {TABS.map((item) => {
                const Icon = item.icon;
                const selected = tab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${selected
                      ? "bg-cyan-300 text-black"
                      : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </section>

          {tab === "overview" && (
            <section className="mt-5 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Users} label="Total users" value={kpis.totalUsers} caption={`${formatNumber(kpis.newUsers)} new in selected period`} />
                <MetricCard icon={Activity} label="Active users" value={kpis.activeUsers} caption="Based on logged backend events" />
                <MetricCard icon={BrainCircuit} label="AI generations" value={kpis.aiGenerations} caption="Groq/research/content actions" />
                <MetricCard icon={CalendarDays} label="Calendar plans" value={kpis.calendarPlans} caption="New active plans in selected period" />
                <MetricCard icon={FileText} label="Research scans" value={kpis.researchQueries} caption="Research history rows created" />
                <MetricCard icon={Download} label="Media exports" value={kpis.mediaExports} caption="MP3/MP4 export records" />
                <MetricCard icon={Film} label="Trend searches" value={kpis.trendSearches} caption="Live trend lookup records" />
                <MetricCard icon={CheckCircle2} label="Saved ideas" value={kpis.savedIdeas} caption="Ideas saved by creators" />
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Top searched niches" description="Based on research queries in the selected period.">
                  {(overview?.topNiches || []).length ? (
                    <div className="divide-y divide-white/10">
                      {overview.topNiches.map((item, index) => (
                        <div key={item.niche} className="flex items-center justify-between gap-4 px-5 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-xs font-bold text-cyan-200">
                              {index + 1}
                            </span>
                            <p className="truncate text-sm font-medium text-white">{item.niche}</p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-zinc-300">
                            {formatNumber(item.count)} searches
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="No research queries in this range." />
                  )}
                </SectionCard>

                <SectionCard title="Feature usage" description="Tracked backend actions grouped by product module.">
                  {(visibleModules || []).length ? (
                    <div className="divide-y divide-white/10">
                      {visibleModules.map((item) => (
                        <div key={item.module} className="flex items-center justify-between gap-4 px-5 py-4">
                          <p className="text-sm font-medium text-white">{item.module.replaceAll("_", " ")}</p>
                          <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs font-semibold text-violet-200">
                            {formatNumber(item.count)} actions
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="No tracked actions in this range yet." />
                  )}
                </SectionCard>
              </div>

              <SectionCard title="Latest activity" description="Newest user and admin actions across the platform.">
                <div className="divide-y divide-white/10">
                  {(overview?.recentActivity || []).length ? (
                    overview.recentActivity.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => item.user_id && openUser(item.user_id)}
                        className="flex w-full items-start gap-3 p-5 text-left transition hover:bg-white/[0.035]"
                      >
                        <UserAvatar user={item.user} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">{getUserLabel(item.user)}</p>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusPillClass(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-300">
                            {String(item.event_type || "").replaceAll(".", " · ")}
                          </p>
                          {getActivityMessage(item) && (
                            <p className="mt-1 truncate text-xs text-zinc-500">{getActivityMessage(item)}</p>
                          )}
                        </div>
                        <p className="shrink-0 text-xs text-zinc-500">{formatDate(item.created_at)}</p>
                      </button>
                    ))
                  ) : (
                    <EmptyState text="No activity has been logged yet. New user actions will appear here." />
                  )}
                </div>
              </SectionCard>
            </section>
          )}

          {tab === "users" && (
            <section className="mt-5">
              <SectionCard
                title="Users"
                description="Identity comes from Firebase. Usage totals come from your Supabase product tables."
                action={
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      placeholder="Search name, email or UID"
                      className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] pl-9 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/40"
                    />
                  </div>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1060px] text-left text-sm">
                    <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-[0.14em] text-zinc-500">
                      <tr>
                        <th className="px-5 py-4 font-medium">User</th>
                        <th className="px-5 py-4 font-medium">Status</th>
                        <th className="px-5 py-4 font-medium">Research</th>
                        <th className="px-5 py-4 font-medium">Plans</th>
                        <th className="px-5 py-4 font-medium">Exports</th>
                        <th className="px-5 py-4 font-medium">Last active</th>
                        <th className="px-5 py-4 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {(usersData.items || []).map((user) => (
                        <tr key={user.uid} className="transition hover:bg-white/[0.035]">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <UserAvatar user={user} />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-white">{getUserLabel(user)}</p>
                                <p className="mt-1 max-w-56 truncate text-xs text-zinc-500">{user.email || user.uid}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${user.disabled
                              ? "border-red-300/20 bg-red-500/10 text-red-200"
                              : "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                              }`}>
                              {user.disabled ? "Disabled" : "Active"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-zinc-200">{formatNumber(user.totals?.research)}</td>
                          <td className="px-5 py-4 text-zinc-200">{formatNumber(user.totals?.calendarPlans)}</td>
                          <td className="px-5 py-4 text-zinc-200">{formatNumber(user.totals?.mediaExports)}</td>
                          <td className="px-5 py-4 text-xs text-zinc-500">{formatDate(user.lastActivityAt || user.lastLoginAt)}</td>
                          <td className="px-5 py-4">
                            <Button
                              type="button"
                              onClick={() => openUser(user.uid)}
                              className="h-8 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/20"
                            >
                              View user
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!usersData.items?.length && <EmptyState text="No users found." />}
                <Pagination pagination={usersData.pagination} onPageChange={loadUsers} />
              </SectionCard>
            </section>
          )}

          {tab === "activity" && (
            <section className="mt-5">
              <SectionCard
                title="Activity logs"
                description="Every tracked backend action is retained with a timestamp, module and status."
                action={
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <select
                      value={activityModule}
                      onChange={(event) => setActivityModule(event.target.value)}
                      className="h-10 rounded-full border border-white/10 bg-[#10131c] px-4 text-sm text-white outline-none"
                    >
                      <option value="">All modules</option>
                      <option value="ai">AI</option>
                      <option value="research">Research</option>
                      <option value="trends">Trends</option>
                      <option value="competitor">Competitor</option>
                      <option value="calendar">Calendar</option>
                      <option value="media">Media</option>
                      <option value="youtube">YouTube</option>
                      <option value="saved_ideas">Saved Ideas</option>
                      <option value="content_pack">Content Pack</option>
                      <option value="viral_check">Viral Check</option>
                      <option value="privacy">Privacy</option>
                      <option value="admin">Admin</option>
                    </select>
                    <select
                      value={activityStatus}
                      onChange={(event) => setActivityStatus(event.target.value)}
                      className="h-10 rounded-full border border-white/10 bg-[#10131c] px-4 text-sm text-white outline-none"
                    >
                      <option value="">All statuses</option>
                      <option value="success">Success</option>
                      <option value="failed">Failed</option>
                      <option value="info">Info</option>
                    </select>
                  </div>
                }
              >
                <div className="divide-y divide-white/10">
                  {(activityData.items || []).length ? (
                    activityData.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => item.user_id && openUser(item.user_id)}
                        className="flex w-full items-start gap-3 p-5 text-left transition hover:bg-white/[0.035]"
                      >
                        <UserAvatar user={item.user} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-white">{getUserLabel(item.user)}</p>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusPillClass(item.status)}`}>
                              {item.status}
                            </span>
                            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">
                              {item.module}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-200">{String(item.event_type || "").replaceAll(".", " · ")}</p>
                          {getActivityMessage(item) && <p className="mt-1 text-xs text-zinc-500">{getActivityMessage(item)}</p>}
                        </div>
                        <p className="shrink-0 text-xs text-zinc-500">{formatDate(item.created_at)}</p>
                      </button>
                    ))
                  ) : (
                    <EmptyState text="No activity logs match the selected filters." />
                  )}
                </div>
                <Pagination pagination={activityData.pagination} onPageChange={loadActivity} />
              </SectionCard>
            </section>
          )}

          {tab === "calendar" && (
            <section className="mt-5">
              <SectionCard title="Content calendar" description="All plans are now database-backed, including soft-deleted audit records.">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left text-sm">
                    <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-[0.14em] text-zinc-500">
                      <tr>
                        <th className="px-5 py-4 font-medium">Creator</th>
                        <th className="px-5 py-4 font-medium">Topic</th>
                        <th className="px-5 py-4 font-medium">Schedule</th>
                        <th className="px-5 py-4 font-medium">Platform</th>
                        <th className="px-5 py-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {(calendarData.items || []).map((item) => (
                        <tr key={item.id} className="transition hover:bg-white/[0.035]">
                          <td className="px-5 py-4">
                            <button type="button" onClick={() => openUser(item.user_id)} className="flex items-center gap-3 text-left">
                              <UserAvatar user={item.user} />
                              <span className="max-w-44 truncate font-medium text-white">{getUserLabel(item.user)}</span>
                            </button>
                          </td>
                          <td className="max-w-xs truncate px-5 py-4 font-medium text-white">{item.title}</td>
                          <td className="px-5 py-4 text-zinc-300">
                            {item.scheduled_date} · {String(item.scheduled_time || "").slice(0, 5)}
                          </td>
                          <td className="px-5 py-4 text-zinc-300">{item.platform}</td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.deleted_at
                              ? "border-red-300/20 bg-red-500/10 text-red-200"
                              : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                              }`}>
                              {item.deleted_at ? "Deleted" : item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!calendarData.items?.length && <EmptyState text="No calendar plans found." />}
                <Pagination pagination={calendarData.pagination} onPageChange={loadCalendar} />
              </SectionCard>
            </section>
          )}

          {tab === "exports" && (
            <section className="mt-5">
              <SectionCard title="Media exports" description="Server-side output history. Storage paths and download access remain private.">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1020px] text-left text-sm">
                    <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-[0.14em] text-zinc-500">
                      <tr>
                        <th className="px-5 py-4 font-medium">Creator</th>
                        <th className="px-5 py-4 font-medium">Source / output</th>
                        <th className="px-5 py-4 font-medium">Format</th>
                        <th className="px-5 py-4 font-medium">Size</th>
                        <th className="px-5 py-4 font-medium">Created</th>
                        <th className="px-5 py-4 font-medium">Expiry</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {(mediaData.items || []).map((item) => (
                        <tr key={item.id} className="transition hover:bg-white/[0.035]">
                          <td className="px-5 py-4">
                            <button type="button" onClick={() => openUser(item.user_id)} className="flex items-center gap-3 text-left">
                              <UserAvatar user={item.user} />
                              <span className="max-w-44 truncate font-medium text-white">{getUserLabel(item.user)}</span>
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <p className="max-w-xs truncate font-medium text-white">{item.youtube_title || item.original_name}</p>
                            <p className="mt-1 max-w-xs truncate text-xs text-zinc-500">{item.output_name}</p>
                          </td>
                          <td className="px-5 py-4 text-zinc-200">
                            {item.output_type} · {item.output_quality || "Original"}
                          </td>
                          <td className="px-5 py-4 text-zinc-200">{formatBytes(item.output_bytes)}</td>
                          <td className="px-5 py-4 text-xs text-zinc-500">{formatDate(item.created_at)}</td>
                          <td className="px-5 py-4 text-xs text-zinc-500">{formatDate(item.expires_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!mediaData.items?.length && <EmptyState text="No media exports found." />}
                <Pagination pagination={mediaData.pagination} onPageChange={loadMedia} />
              </SectionCard>
            </section>
          )}
          {tab === "contactMessages" && (
            <section className="mt-5">
              <AdminContactMessagesTab />
            </section>
          )}
        </>
      )}

      {userDrawer}
    </DashboardLayout>
  );
}
