import {
  CheckCircle2,
  CloudOff,
  Loader2,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from "lucide-react";

function BrandLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-950 shadow-lg shadow-cyan-950/30 sm:h-12 sm:w-12">
        <video
          src="/logo.mp4"
          autoPlay
          muted
          loop
          playsInline
          controls={false}
          disablePictureInPicture
          className="pointer-events-none absolute left-1/2 top-1/2 h-[138%] w-[138%] -translate-x-1/2 -translate-y-1/2 object-cover"
          aria-label="Viralo AI"
        />
      </div>

      <div>
        <p className="text-base font-bold tracking-tight text-white sm:text-lg">
          Viralo AI
        </p>

        <p className="text-[10px] font-medium text-zinc-500 sm:text-[11px]">
          Creator Intelligence
        </p>
      </div>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <Icon className="h-5 w-5 text-cyan-200" />

      <p className="mt-3 text-sm font-semibold text-white">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-zinc-600">
        {description}
      </p>
    </div>
  );
}

export default function OfflinePage({
  status,
  onRetry,
}) {
  const checking = status === "checking";
  const restored = status === "restored";

  const Icon = restored
    ? CheckCircle2
    : checking
      ? RadioTower
      : WifiOff;

  const title = restored
    ? "Connection restored"
    : checking
      ? "Checking your connection"
      : "You’re offline";

  const description = restored
    ? "Viralo AI is reconnecting your workspace."
    : checking
      ? "Please wait while we confirm that the internet is available."
      : "Viralo AI cannot reach the internet right now. Keep this tab open—we’ll automatically reconnect when your connection returns.";

  return (
    <div
      className="fixed inset-0 z-[10000] overflow-y-auto bg-[#050711] text-white"
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      aria-label={title}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_90%_12%,rgba(139,92,246,0.14),transparent_30%),linear-gradient(180deg,#050711_0%,#070a13_100%)]" />

      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:46px_46px]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1320px] flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <header className="flex min-h-16 items-center border-b border-white/10 pb-4">
          <BrandLogo />
        </header>

        <main className="flex flex-1 items-center py-7 sm:py-10">
          <section className="mx-auto w-full max-w-5xl">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0d16]/95 shadow-2xl shadow-black/35 backdrop-blur-2xl">
              <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
                <div className="p-6 sm:p-9 lg:p-11">
                  <span
                    className={`flex h-20 w-20 items-center justify-center rounded-[1.75rem] border ${
                      restored
                        ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
                        : "border-cyan-300/20 bg-cyan-300/10 text-cyan-200"
                    }`}
                  >
                    <Icon
                      className={`h-9 w-9 ${
                        checking ? "animate-pulse" : ""
                      }`}
                    />
                  </span>

                  <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                    Network status
                  </p>

                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                    {title}
                  </h1>

                  <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
                    {description}
                  </p>

                  {!restored ? (
                    <button
                      type="button"
                      onClick={onRetry}
                      disabled={checking}
                      className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-500 px-6 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {checking ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Checking connection...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Try again
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="mt-7 inline-flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-5 py-3 text-sm font-semibold text-emerald-100">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Reopening your workspace...
                    </div>
                  )}

                  <p className="mt-5 text-xs leading-6 text-zinc-600">
                    Tip: check Wi-Fi or mobile data, disable airplane mode,
                    and confirm that your network allows secure HTTPS access.
                  </p>
                </div>

                <div className="border-t border-white/10 bg-white/[0.025] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-9">
                  <div className="relative mx-auto flex min-h-[220px] max-w-sm items-center justify-center">
                    <div className="absolute h-48 w-48 rounded-full border border-cyan-300/10" />
                    <div className="absolute h-36 w-36 rounded-full border border-violet-300/10" />
                    <div className="absolute h-24 w-24 rounded-full border border-cyan-300/15 bg-cyan-300/[0.04]" />

                    <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-[#0b0f19] shadow-2xl shadow-cyan-950/35">
                      {restored ? (
                        <CheckCircle2 className="h-8 w-8 text-emerald-200" />
                      ) : (
                        <CloudOff className="h-8 w-8 text-cyan-200" />
                      )}
                    </div>

                    <span className="absolute left-[8%] top-[24%] h-3 w-3 rounded-full bg-cyan-300/60 shadow-[0_0_18px_rgba(103,232,249,0.7)]" />
                    <span className="absolute bottom-[22%] right-[10%] h-3 w-3 rounded-full bg-violet-400/60 shadow-[0_0_18px_rgba(167,139,250,0.7)]" />
                    <span className="absolute right-[18%] top-[17%] h-2 w-2 rounded-full bg-blue-300/60" />
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <StatusCard
                      icon={RadioTower}
                      title="Automatic detection"
                      description="Viralo AI watches browser network events and verifies internet access in the background."
                    />

                    <StatusCard
                      icon={ShieldCheck}
                      title="Safe reconnect"
                      description="The website remains blocked until a working internet connection is confirmed."
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
