import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileVideo,
  Link2,
  Loader2,
  Music2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Video,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  convertOwnedMedia,
  deleteMediaExport,
  downloadMediaExport,
  getMediaExports,
  previewYoutubeVideo,
} from "../lib/api";

const VIDEO_QUALITIES = [
  { value: "original", label: "Original" },
  { value: "1080p", label: "1080p" },
  { value: "720p", label: "720p" },
  { value: "480p", label: "480p" },
  { value: "360p", label: "360p" },
];

const AUDIO_BITRATES = [128, 192, 320];

function formatBytes(bytes) {
  const value = Number(bytes || 0);

  if (!Number.isFinite(value) || value <= 0) return "—";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  );

  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value) {
  const date = new Date(value || "");

  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getFileLabel(file) {
  if (!file) return "";

  return `${file.name} • ${formatBytes(file.size)}`;
}

export default function MediaExport() {
  const fileInputRef = useRef(null);
  const previewCardRef = useRef(null);
  const navigate = useNavigate();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubePreview, setYoutubePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [outputType, setOutputType] = useState("video");
  const [videoQuality, setVideoQuality] = useState("720p");
  const [audioBitrate, setAudioBitrate] = useState(192);
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [downloadingId, setDownloadingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const hasYoutubeLink = Boolean(youtubeUrl.trim());
  const hasUploadedFile = Boolean(selectedFile);
  const hasAnySource = hasYoutubeLink || hasUploadedFile;

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const data = await getMediaExports();
      setHistory(Array.isArray(data.items) ? data.items : []);
    } catch (requestError) {
      setError(requestError.message || "Could not load recent exports.");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const acceptSelectedFile = (file) => {
    if (!file) return;

    setSelectedFile(file);
    setError("");
    setSuccess("");
  };

  const handleFileInputChange = (event) => {
    acceptSelectedFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handlePreview = async () => {
    const link = youtubeUrl.trim();

    if (!link) {
      setYoutubePreview(null);
      setError("Paste a YouTube link first.");
      return;
    }

    try {
      setPreviewLoading(true);
      setError("");
      setSuccess("");

      const data = await previewYoutubeVideo({
        videoUrl: link,
      });

      const preview = data?.preview;

      if (!preview?.videoId || !preview?.url) {
        throw new Error("A valid preview was not returned for this link.");
      }

      setYoutubePreview(preview);

      setSuccess(
        preview.isLimitedPreview
          ? "Basic preview loaded. Select MP4 or MP3 and click Download to start the export."
          : "Preview loaded. Select MP4 or MP3 and click Download to start the export."
      );

      window.setTimeout(() => {
        previewCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    } catch (requestError) {
      setYoutubePreview(null);
      setError(
        requestError.message ||
        "Could not load the YouTube preview. Check the video link."
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePrimaryAction = async () => {
    if (!hasAnySource) {
      setError("Paste a YouTube link or upload a video file first.");
      return;
    }

    if (!rightsAccepted) {
      setError("Confirm that you own this media or have permission to download and export it.");
      return;
    }

    try {
      setExporting(true);
      setUploadProgress(0);
      setError("");
      setSuccess("");

      const data = await convertOwnedMedia({
        file: selectedFile,
        outputType,
        videoQuality,
        audioBitrate,
        rightsAcknowledged: rightsAccepted,
        youtubeUrl: youtubePreview?.url || youtubeUrl.trim(),
        youtubeVideoId: youtubePreview?.videoId || "",
        youtubeTitle: youtubePreview?.title || "",
        onUploadProgress: (progress) => {
          setUploadProgress(Math.min(95, Math.max(0, progress)));
        },
      });

      setUploadProgress(100);
      setHistory((current) => [
        data.exportItem,
        ...current.filter((item) => item.id !== data.exportItem.id),
      ]);
      setSuccess("Your file is ready. The download has started.");

      try {
        setDownloadingId(data.exportItem.id);
        await downloadMediaExport(data.exportItem);
      } catch (downloadError) {
        setSuccess(
          "Your file is ready. Use the Download button below if the browser did not start it automatically."
        );
      } finally {
        setDownloadingId("");
      }
    } catch (requestError) {
      setError(requestError.message || "Could not export this media file.");
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async (item) => {
    try {
      setDownloadingId(item.id);
      setError("");
      await downloadMediaExport(item);
    } catch (requestError) {
      setError(requestError.message || "Could not download this export.");
    } finally {
      setDownloadingId("");
    }
  };

  const handleDelete = async (item) => {
    const approved = window.confirm(`Delete ${item.outputName}?`);

    if (!approved) return;

    try {
      setDeletingId(item.id);
      setError("");
      await deleteMediaExport(item.id);
      setHistory((current) => current.filter((entry) => entry.id !== item.id));
    } catch (requestError) {
      setError(requestError.message || "Could not delete this export.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <DashboardLayout
      eyebrow="Creator utilities"
      title="YouTube Media Export"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="relative overflow-hidden border-white/10 bg-[#0b0d16]/90 shadow-2xl shadow-black/30">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-16 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl" />

          <CardContent className="relative p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Authorized media only
                </div>

                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Export your YouTube-ready media
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  Paste a YouTube link or upload a video, choose MP4 or MP3 and quality, then download the converted file. Use only media you own or are authorized to download.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-5 text-zinc-400 sm:max-w-52">
                {hasAnySource
                  ? hasUploadedFile
                    ? "Original video selected. You can export it after confirming permission."
                    : "YouTube link is ready. Choose MP4 or MP3 and click Download."
                  : "Choose a YouTube link or an original video file to begin."}
              </div>
            </div>

            <div className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-200">
                    YouTube link <span className="text-cyan-300/80">(download or preview source)</span>
                  </label>

                  <p className="mb-3 text-xs leading-5 text-zinc-500">
                    Paste a valid YouTube link. Preview is optional; the Download button converts the selected MP4 or MP3 format.
                  </p>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        value={youtubeUrl}
                        onChange={(event) => {
                          setYoutubeUrl(event.target.value);
                          setYoutubePreview(null);
                          setError("");
                          setSuccess("");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handlePreview();
                          }
                        }}
                        placeholder="Paste YouTube video link here..."
                        className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/40"
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={handlePreview}
                      disabled={previewLoading}
                      className="h-12 rounded-2xl bg-gradient-to-r from-cyan-300 to-blue-400 px-5 text-sm font-semibold text-slate-950 hover:from-cyan-200 hover:to-blue-300"
                    >
                      {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                      Preview
                    </Button>
                  </div>
                </div>

                {youtubePreview && (
                  <div
                    ref={previewCardRef}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                  >
                    <div className="flex gap-3">
                      <img
                        src={youtubePreview.thumbnail}
                        alt="YouTube preview"
                        className="h-20 w-32 rounded-xl object-cover"
                      />

                      <div className="min-w-0 flex-1 py-0.5">
                        <p className="line-clamp-2 text-sm font-semibold leading-5 text-white">
                          {youtubePreview.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-zinc-400">
                          {youtubePreview.channelTitle}
                        </p>
                        <p className="mt-1.5 text-xs text-zinc-500">
                          {youtubePreview.views} views • {youtubePreview.duration}
                        </p>
                      </div>

                      <a
                        href={youtubePreview.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.09] hover:text-white"
                        aria-label="Open YouTube video"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    or
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-200">
                    Original video file <span className="text-cyan-300/80">(export source)</span>
                  </label>

                  <p className="mb-3 text-xs leading-5 text-zinc-500">
                    Upload your own video to create an MP4 or MP3. A YouTube link is not required for this flow.
                  </p>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      acceptSelectedFile(event.dataTransfer.files?.[0]);
                    }}
                    className="flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-300/[0.035] px-5 text-center transition hover:border-cyan-300/45 hover:bg-cyan-300/[0.06]"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
                      <UploadCloud className="h-6 w-6" />
                    </span>
                    <span className="mt-3 text-sm font-semibold text-white">
                      {selectedFile ? "Change original video" : "Upload original video"}
                    </span>
                    <span className="mt-1 text-xs leading-5 text-zinc-500">
                      MP4, MOV, MKV, WEBM, AVI, or M4V • up to 1 GB
                    </span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo,.mp4,.mov,.mkv,.webm,.avi,.m4v"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />

                  {selectedFile && (
                    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-200">
                        <FileVideo className="h-5 w-5" />
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                        {getFileLabel(selectedFile)}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-white/[0.06] hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
                <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.035] p-1">
                  <button
                    type="button"
                    onClick={() => setOutputType("video")}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition ${outputType === "video" ? "bg-blue-500/20 text-cyan-100 shadow-inner shadow-blue-400/10" : "text-zinc-500 hover:text-zinc-200"}`}
                  >
                    <Video className="h-4 w-4" />
                    Video
                  </button>

                  <button
                    type="button"
                    onClick={() => setOutputType("audio")}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition ${outputType === "audio" ? "bg-violet-500/20 text-violet-100 shadow-inner shadow-violet-400/10" : "text-zinc-500 hover:text-zinc-200"}`}
                  >
                    <Music2 className="h-4 w-4" />
                    Audio / MP3
                  </button>
                </div>

                {outputType === "video" ? (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-zinc-200">Video quality</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {VIDEO_QUALITIES.map((quality) => (
                        <button
                          key={quality.value}
                          type="button"
                          onClick={() => setVideoQuality(quality.value)}
                          className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${videoQuality === quality.value ? "border-blue-300/40 bg-blue-500/30 text-white" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-100"}`}
                        >
                          {quality.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-5 text-zinc-500">
                      Original keeps the current dimensions. Other choices only scale down; this tool never upscales.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-zinc-200">Audio quality</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {AUDIO_BITRATES.map((bitrate) => (
                        <button
                          key={bitrate}
                          type="button"
                          onClick={() => setAudioBitrate(bitrate)}
                          className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${audioBitrate === bitrate ? "border-violet-300/40 bg-violet-500/30 text-white" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-100"}`}
                        >
                          {bitrate} kbps
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {hasAnySource ? (
                  <label className="mt-6 flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3.5 text-left">
                    <input
                      type="checkbox"
                      checked={rightsAccepted}
                      onChange={(event) => setRightsAccepted(event.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-cyan-300"
                    />
                    <span className="text-xs leading-5 text-zinc-400">
                      I own this media or have permission to download, convert, and export it.
                    </span>
                  </label>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-3.5 py-3 text-xs leading-5 text-zinc-500">
                    Paste a YouTube link or upload a video file to activate MP4 and MP3 download.
                  </div>
                )}

                <Button
                  type="button"
                  disabled={exporting || previewLoading}
                  onClick={handlePrimaryAction}
                  className={`mt-5 h-12 w-full rounded-2xl px-4 text-sm font-semibold text-white shadow-lg transition ${hasUploadedFile
                    ? outputType === "audio"
                      ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-violet-500/15 hover:from-violet-400 hover:to-fuchsia-400"
                      : "bg-gradient-to-r from-cyan-400 to-blue-500 shadow-blue-500/15 hover:from-cyan-300 hover:to-blue-400"
                    : "bg-gradient-to-r from-cyan-400 to-blue-500 shadow-blue-500/15 hover:from-cyan-300 hover:to-blue-400"
                    }`}
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : hasAnySource ? (
                    <Download className="h-4 w-4" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}

                  {exporting
                    ? hasUploadedFile && uploadProgress < 95
                      ? `Uploading ${uploadProgress}%`
                      : hasYoutubeLink && !hasUploadedFile
                        ? "Preparing YouTube download..."
                        : "Converting media..."
                    : hasAnySource
                      ? outputType === "audio"
                        ? `Download MP3 (${audioBitrate} kbps)`
                        : `Download MP4 (${videoQuality})`
                      : "Choose a source first"}
                </Button>

                <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-zinc-500">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                  <span>
                    YouTube link or uploaded file both support MP4/MP3 export. Preview only loads title and thumbnail; Download starts the file conversion.
                  </span>
                </div>
              </div>
            </div>

            {(error || success) && (
              <div className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${error ? "border-red-400/20 bg-red-500/10 text-red-100" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"}`}>
                {error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{error || success}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#0b0d16]/80">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Recent Exports</h3>
                <p className="mt-1 text-sm text-zinc-500">Your completed MP4 and MP3 files.</p>
              </div>

              <Button
                type="button"
                onClick={loadHistory}
                disabled={historyLoading}
                className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-xs text-zinc-200 hover:bg-white/[0.08] hover:text-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              {historyLoading ? (
                <div className="flex min-h-36 items-center justify-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading recent exports...
                </div>
              ) : history.length ? (
                <div className="divide-y divide-white/10">
                  {history.map((item) => {
                    const isAudio = item.outputType === "audio";
                    const isDownloading = downloadingId === item.id;
                    const isDeleting = deletingId === item.id;

                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 sm:p-4">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isAudio ? "bg-violet-400/10 text-violet-200" : "bg-cyan-400/10 text-cyan-200"}`}>
                          {isAudio ? <Music2 className="h-5 w-5" /> : <FileVideo className="h-5 w-5" />}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-100">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {item.outputQuality} • {formatBytes(item.outputBytes)} • {formatDate(item.createdAt)}
                          </p>
                        </div>

                        <span className="hidden rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold text-emerald-200 sm:inline-flex">
                          Ready
                        </span>

                        <Button
                          type="button"
                          disabled={isDownloading || isDeleting}
                          onClick={() => handleDownload(item)}
                          className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                          aria-label={`Download ${item.outputName}`}
                        >
                          {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </Button>

                        <Button
                          type="button"
                          disabled={isDownloading || isDeleting}
                          onClick={() => handleDelete(item)}
                          className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.04] text-zinc-500 hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200"
                          aria-label={`Delete ${item.outputName}`}
                        >
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-36 flex-col items-center justify-center px-5 text-center">
                  <Clock3 className="h-6 w-6 text-zinc-600" />
                  <p className="mt-3 text-sm font-medium text-zinc-300">No exports yet</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">Paste a YouTube link or upload a video above to create your first MP4 or MP3 export.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}