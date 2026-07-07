import React, { useEffect, useState } from "react";
import { ArrowLeft, Image, Loader2, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import { getSavedThumbnailsByTopic } from "../lib/thumbnailStore";

export default function SavedThumbnails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const topic = searchParams.get("topic") || "";

  const { user, authLoading, setAuthModalOpen } = useAuth();

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullscreenImage, setFullscreenImage] = useState("");

  const loadImages = async () => {
    if (!user?.uid || !topic) {
      setImages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const items = await getSavedThumbnailsByTopic({
        userId: user.uid,
        topic,
      });

      setImages(items);
    } catch (err) {
      setError(err.message || "Failed to load saved images");
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

    loadImages();
  }, [user, authLoading, topic]);

  return (
    <DashboardLayout eyebrow="Saved Images" title="All saved thumbnails">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          onClick={() => navigate(-1)}
          className="h-10 w-fit rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm text-zinc-200 hover:bg-white/[0.1]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {topic && (
          <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-200">
            Topic: {topic}
          </div>
        )}
      </div>

      <section className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
          Saved Thumbnail Images
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          All thumbnails saved for this content pack.
        </p>
      </section>

      {(loading || authLoading) && (
        <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
            Loading saved images...
          </div>
        </div>
      )}

      {!loading && !authLoading && !user && (
        <Card className="border-white/10 bg-white/[0.04]">
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold text-white">
              Login required
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Please login to view your saved images.
            </p>

            <Button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="mt-5 rounded-full bg-cyan-300 px-6 text-sm font-semibold text-black hover:bg-cyan-200"
            >
              Login
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !authLoading && user && error && (
        <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !authLoading && user && !error && images.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300/10">
            <Image className="h-7 w-7 text-cyan-300" />
          </div>

          <h3 className="text-lg font-semibold text-white">
            No saved images found
          </h3>

          <p className="mt-2 text-sm text-zinc-500">
            Save thumbnails from the Content Pack page and they will appear
            here.
          </p>
        </div>
      )}

      {!loading && !authLoading && user && !error && images.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((item, index) => (
            <button
              key={item.id || index}
              type="button"
              onClick={() => setFullscreenImage(item.imageUrl)}
              className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[0.06]"
            >
              <img
                src={item.imageUrl}
                alt={`Saved thumbnail ${index + 1}`}
                className="aspect-video w-full rounded-2xl object-cover"
              />

              <div className="mt-3 flex items-center justify-between gap-3 px-1">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {index === 0
                      ? "Latest saved thumbnail"
                      : `Saved thumbnail ${index + 1}`}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Click to open full screen
                  </p>
                </div>

                <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                  Open
                </span>
              </div>
            </button>
          ))}
        </section>
      )}

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setFullscreenImage("")}
        >
          <button
            type="button"
            onClick={() => setFullscreenImage("")}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="max-h-[92vh] max-w-[96vw] overflow-hidden rounded-3xl border border-white/10 bg-black"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={fullscreenImage}
              alt="Full screen saved thumbnail"
              className="max-h-[92vh] max-w-[96vw] object-contain"
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}