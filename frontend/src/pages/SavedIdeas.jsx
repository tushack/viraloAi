import React, { useEffect, useState } from "react";
import { Copy, Loader2, Search, Trash2 } from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { deleteSavedIdea, getSavedIdeas } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function SavedIdeas() {
  const [query, setQuery] = useState("");
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  const { user, authLoading, setAuthModalOpen } = useAuth();

  const fetchIdeas = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getSavedIdeas();

      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];

      setIdeas(list);
    } catch (err) {
      setError(err.message || "Failed to load saved ideas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      setAuthModalOpen(true);
      return;
    }

    fetchIdeas();
  }, [user, authLoading]);

  const handleCopy = async (content) => {
    try {
      await navigator.clipboard.writeText(content || "");
    } catch {
      alert("Copy failed");
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = await window.appConfirm({
      type: "delete",
      title: "Delete saved idea?",
      message: "Are you sure you want to delete this saved idea? This action cannot be undone.",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
    });



    if (!confirmDelete) return;

    try {
      setDeletingId(id);

      await deleteSavedIdea(id);

      setIdeas((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert(err.message || "Failed to delete idea");
    } finally {
      setDeletingId("");
    }
  };

  const filteredIdeas = ideas.filter((item) => {
    const searchText = `${item.type || ""} ${item.content || ""} ${item.platform || ""
      } ${item.niche || ""}`.toLowerCase();

    return searchText.includes(query.toLowerCase());
  });

  return (
    <DashboardLayout eyebrow="Saved Ideas" title="Your saved research library">
      <section className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
          Saved Ideas
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Save topics, hooks, titles, and competitor insights in one clean
          workspace.
        </p>
      </section>

      <Card className="mb-6 border-white/10 bg-white/[0.04]">
        <CardContent className="flex h-14 items-center gap-3 px-4">
          <Search className="h-5 w-5 shrink-0 text-zinc-500" />

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search saved ideas..."
            className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </CardContent>
      </Card>

      {(loading || authLoading) && (
        <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
            Loading saved ideas...
          </div>
        </div>
      )}

      {!loading && !authLoading && !user && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <h3 className="text-lg font-semibold text-white">
            Login required
          </h3>

          <p className="mt-2 text-sm text-zinc-500">
            Please login to view your saved ideas.
          </p>

          <Button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="mt-5 rounded-full bg-cyan-300 px-6 text-sm font-semibold text-black hover:bg-cyan-200"
          >
            Login
          </Button>
        </div>
      )}

      {!loading && !authLoading && user && error && (
        <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !authLoading && user && !error && filteredIdeas.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <h3 className="text-lg font-semibold text-white">
            No saved ideas found
          </h3>

          <p className="mt-2 text-sm text-zinc-500">
            Save topics, hooks, or titles from the dashboard and they will
            appear here.
          </p>
        </div>
      )}

      {!loading && !authLoading && user && !error && filteredIdeas.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredIdeas.map((item) => (
            <Card
              key={item.id}
              className="border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-cyan-950/20"
            >
              <CardContent className="flex h-full flex-col p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                    {item.type || "Idea"}
                  </span>

                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                    {item.platform || "YouTube"}
                  </span>
                </div>

                <p className="flex-1 text-sm leading-7 text-zinc-100">
                  {item.content}
                </p>

                {item.niche && (
                  <p className="mt-4 text-xs text-zinc-500">
                    Niche:{" "}
                    <span className="font-medium text-zinc-300">
                      {item.niche}
                    </span>
                  </p>
                )}

                <div className="mt-5 flex gap-2">
                  <Button
                    type="button"
                    onClick={() => handleCopy(item.content)}
                    className="h-10 flex-1 rounded-full border border-white/10 bg-white/[0.05] px-4 text-xs font-medium text-zinc-200 hover:bg-white/[0.1]"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="h-10 rounded-full border border-red-400/20 bg-red-500/10 px-4 text-xs font-medium text-red-200 hover:bg-red-500/20"
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </DashboardLayout>
  );
}