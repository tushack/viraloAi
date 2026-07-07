import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
} from "lucide-react";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  getAdminContactMessages,
  updateAdminContactMessageStatus,
} from "../../lib/api";

const STATUS_LABELS = {
  new: "New",
  in_progress: "In Progress",
  resolved: "Resolved",
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClass(status) {
  if (status === "resolved") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  }

  if (status === "in_progress") {
    return "border-amber-300/20 bg-amber-300/10 text-amber-100";
  }

  return "border-cyan-300/20 bg-cyan-300/10 text-cyan-100";
}

function SummaryCard({ label, value, className = "" }) {
  return (
    <div className={`rounded-2xl border p-4 ${className}`}>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value || 0}</p>
    </div>
  );
}

export default function AdminContactMessagesTab() {
  const [data, setData] = useState({
    items: [],
    summary: { total: 0, new: 0, inProgress: 0, resolved: 0 },
    pagination: null,
  });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");

  const loadMessages = async (page = 1, nextStatus = status) => {
    setLoading(true);
    setError("");

    try {
      const result = await getAdminContactMessages({
        page,
        limit: 25,
        status: nextStatus,
      });
      setData(result);
    } catch (requestError) {
      setError(requestError.message || "Could not load contact messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages(1, status);
    // Load whenever the selected status changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleStatusChange = async (message, nextStatus) => {
    if (!message?.id || nextStatus === message.status) return;

    setUpdatingId(message.id);
    setError("");

    try {
      const response = await updateAdminContactMessageStatus(
        message.id,
        nextStatus
      );

      setData((current) => ({
        ...current,
        items: (current.items || []).map((item) =>
          item.id === message.id ? response.message : item
        ),
        summary: response.summary || current.summary,
      }));

      // Reload to keep counts, pagination and active filters accurate.
      await loadMessages(data.pagination?.page || 1, status);
    } catch (requestError) {
      setError(requestError.message || "Could not update message status.");
    } finally {
      setUpdatingId("");
    }
  };

  const pagination = data.pagination;

  return (
    <section className="mt-5">
      <Card className="border-white/10 bg-white/[0.04]">
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-cyan-300" />
                <h2 className="text-lg font-semibold text-white">
                  Contact Messages
                </h2>
              </div>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Messages submitted from the public Contact Us form. Only authorised admins can view or update them.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 rounded-full border border-white/10 bg-[#10131c] px-4 text-sm text-white outline-none"
                aria-label="Filter contact messages by status"
              >
                <option value="">All statuses</option>
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>

              <Button
                type="button"
                onClick={() => loadMessages(pagination?.page || 1, status)}
                disabled={loading}
                className="h-10 rounded-full border border-white/10 bg-white/[0.07] px-4 text-sm text-zinc-100 hover:bg-white/[0.12]"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-3 border-b border-white/10 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total messages" value={data.summary?.total} className="border-white/10 bg-white/[0.035]" />
            <SummaryCard label="New" value={data.summary?.new} className="border-cyan-300/20 bg-cyan-300/10" />
            <SummaryCard label="In progress" value={data.summary?.inProgress} className="border-amber-300/20 bg-amber-300/10" />
            <SummaryCard label="Resolved" value={data.summary?.resolved} className="border-emerald-300/20 bg-emerald-300/10" />
          </div>

          {error && (
            <div className="mx-5 mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
              Loading contact messages...
            </div>
          ) : data.items?.length ? (
            <div className="divide-y divide-white/10">
              {data.items.map((message) => (
                <article key={message.id} className="p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">
                          {message.fullName || "Unknown sender"}
                        </p>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClass(message.status)}`}>
                          {STATUS_LABELS[message.status] || "New"}
                        </span>
                        {message.accountUid ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] text-zinc-400">
                            Registered user
                          </span>
                        ) : (
                          <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] text-zinc-500">
                            Guest visitor
                          </span>
                        )}
                      </div>

                      <a
                        href={`mailto:${message.email}`}
                        className="mt-2 inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100"
                      >
                        <Mail className="h-4 w-4" />
                        {message.email || "Email unavailable"}
                      </a>

                      <p className="mt-4 max-w-4xl whitespace-pre-wrap text-sm leading-7 text-zinc-300">
                        {message.message}
                      </p>

                      <p className="mt-3 text-xs text-zinc-500">
                        Received {formatDate(message.createdAt || message.createdAtMs)}
                        {message.statusUpdatedByEmail
                          ? ` · Last updated by ${message.statusUpdatedByEmail}`
                          : ""}
                      </p>
                    </div>

                    <div className="w-full shrink-0 xl:w-48">
                      <label className="mb-2 block text-xs font-medium text-zinc-500">
                        Update status
                      </label>
                      <select
                        value={message.status || "new"}
                        disabled={updatingId === message.id}
                        onChange={(event) =>
                          handleStatusChange(message, event.target.value)
                        }
                        className="h-10 w-full rounded-xl border border-white/10 bg-[#10131c] px-3 text-sm text-white outline-none disabled:opacity-60"
                      >
                        <option value="new">New</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      {updatingId === message.id && (
                        <p className="mt-2 flex items-center gap-2 text-xs text-cyan-200">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving...
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-zinc-500">
              No contact messages found for this status.
            </div>
          )}

          {pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
              <p className="text-xs text-zinc-500">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} messages
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => loadMessages(pagination.page - 1, status)}
                  className="h-8 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs text-zinc-200 hover:bg-white/[0.1] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => loadMessages(pagination.page + 1, status)}
                  className="h-8 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs text-zinc-200 hover:bg-white/[0.1] disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
