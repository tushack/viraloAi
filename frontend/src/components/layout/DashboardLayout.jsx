import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function DashboardLayout({
  children,
  eyebrow = "Research Dashboard",
  title = "Discover your next viral video",
  onNewScan,
  customSidebar = null,
  headerActionLabel,
  headerActionIcon,
  hideHeaderAction = false,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { authLoading } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("viraloSidebarCollapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("viraloSidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const mainPaddingClass = customSidebar
    ? "lg:pl-72"
    : sidebarCollapsed
      ? "lg:pl-24"
      : "lg:pl-72";

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08090d] text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-white">
              Loading ViralMind...
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Checking your account session
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#08090d] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-12rem] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl sm:h-[34rem] sm:w-[34rem]" />
        <div className="absolute right-[-12rem] top-32 h-[20rem] w-[20rem] rounded-full bg-violet-500/10 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[-16rem] left-[-8rem] h-[22rem] w-[22rem] rounded-full bg-blue-500/10 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
      </div>

      {customSidebar ? (
        customSidebar({
          sidebarOpen,
          setSidebarOpen,
          sidebarCollapsed,
          setSidebarCollapsed,
        })
      ) : (
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />
      )}

      <main
        className={`relative z-10 min-w-0 transition-all duration-300 ${mainPaddingClass}`}
      >
        <Header
          setSidebarOpen={setSidebarOpen}
          eyebrow={eyebrow}
          title={title}
          onNewScan={onNewScan}
          actionLabel={headerActionLabel}
          actionIcon={headerActionIcon}
          hideAction={hideHeaderAction}
        />

        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}