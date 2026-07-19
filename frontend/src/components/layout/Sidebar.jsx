// frontend/src/components/layout/Sidebar.jsx

import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import {
  Bookmark,
  CircleHelp,
  Clock,
  CreditCard,
  Download,
  Gauge,
  LayoutDashboard,
  LogOut,
  MoreVertical,
  PanelLeftClose,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { Button } from "../ui/button";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { getPaymentAccess } from "../../lib/paymentApi";
import {
  publishPlanAccess,
  readCachedActivePlan,
  subscribeToPlanAccess,
} from "../../lib/planAccessCache";

const publicNavItems = [];

const privateNavItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    label: "Trends",
    icon: TrendingUp,
    path: "/trends",
  },
  {
    label: "Viral Check",
    icon: Gauge,
    path: "/viral-check",
  },
  {
    label: "Competitors",
    icon: Users,
    path: "/competitors",
  },
  {
    label: "Saved Ideas",
    icon: Bookmark,
    path: "/saved-ideas",
  },
  {
    label: "History",
    icon: Clock,
    path: "/history",
  },
  {
    label: "Youtube Downloader",
    icon: Download,
    path: "/media-export",
  },
  {
    label: "Settings",
    icon: Settings,
    path: "/settings",
  },
];

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed = false,
  setSidebarCollapsed,
}) {
  const { user, setAuthModalOpen, signOut } = useAuth();

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  /*
   * Never default the plan to "free".
   * An active cached Pro/Admin access can render immediately.
   * Otherwise the plan badge stays hidden until the server responds.
   */
  const [planAccess, setPlanAccess] = useState(null);
  const [planResolved, setPlanResolved] = useState(false);

  const accountMenuRef = useRef(null);
  const navigate = useNavigate();

  const configuredAdminEmails = String(
    import.meta.env.VITE_ADMIN_EMAILS || ""
  )
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const showAdminNav = Boolean(
    user?.email &&
      configuredAdminEmails.includes(
        String(user.email).trim().toLowerCase()
      )
  );

  const navItems = user
    ? [
        ...privateNavItems,
        ...(showAdminNav
          ? [
              {
                label: "Admin Panel",
                icon: ShieldCheck,
                path: "/admin",
              },
            ]
          : []),
      ]
    : publicNavItems;

  useEffect(() => {
    if (!user?.uid) {
      setUserProfile(null);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, "app_users", user.uid),
      (snapshot) => {
        setUserProfile(
          snapshot.exists() ? snapshot.data() : null
        );
      },
      () => {
        setUserProfile(null);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;

    const handleClickOutside = (event) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target)
      ) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    let active = true;
    const userId = user?.uid || "";

    if (!userId) {
      setPlanAccess(null);
      setPlanResolved(false);
      return undefined;
    }

    const cachedAccess = readCachedActivePlan(userId);

    if (cachedAccess) {
      setPlanAccess(cachedAccess);
      setPlanResolved(true);
    } else {
      setPlanAccess(null);
      setPlanResolved(false);
    }

    const unsubscribePlanUpdates = subscribeToPlanAccess(
      ({ userId: updatedUserId, access }) => {
        if (
          active &&
          String(updatedUserId || "") === String(userId)
        ) {
          setPlanAccess(access || null);
          setPlanResolved(Boolean(access));
        }
      }
    );

    getPaymentAccess()
      .then((response) => {
        if (!active) return;

        const nextAccess = response?.access || null;

        setPlanAccess(nextAccess);
        setPlanResolved(Boolean(nextAccess));
        publishPlanAccess(userId, nextAccess);
      })
      .catch(() => {
        if (!active) return;

        /*
         * When the request fails and no valid paid cache exists,
         * keep the plan unresolved. Showing "Free" here would be a
         * false value and causes the Free -> Pro flicker.
         */
        if (!cachedAccess) {
          setPlanAccess(null);
          setPlanResolved(false);
        }
      });

    return () => {
      active = false;
      unsubscribePlanUpdates();
    };
  }, [user?.uid]);

  const displayName =
    userProfile?.name ||
    userProfile?.fullName ||
    userProfile?.displayName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Creator";

  const displayEmail =
    userProfile?.email || user?.email || "";

  const displayPhoto =
    userProfile?.photoURL ||
    userProfile?.photoUrl ||
    userProfile?.image ||
    userProfile?.avatar ||
    user?.photoURL ||
    "";

  const displayPlan = String(
    planAccess?.plan || ""
  )
    .trim()
    .toLowerCase();

  const displayPlanLabel =
    displayPlan === "pro"
      ? "Pro"
      : displayPlan === "admin"
        ? "Admin"
        : displayPlan === "free"
          ? "Free"
          : "";

  const hasFullAccess =
    planResolved && planAccess?.isPaid === true;

  const handleToggleSidebarCollapse = () => {
    if (
      typeof window !== "undefined" &&
      window.innerWidth < 1024
    ) {
      return;
    }

    setSidebarCollapsed?.(!sidebarCollapsed);
    setAccountMenuOpen(false);
  };

  const handleConfirmLogout = async () => {
    await signOut();
    setLogoutModalOpen(false);
    setAccountMenuOpen(false);
  };

  const handleUpgradeClick = () => {
    setAccountMenuOpen(false);
    setSidebarOpen(false);
    navigate("/payment");
  };

  const handleHelpClick = () => {
    setAccountMenuOpen(false);
    setSidebarOpen(false);
    navigate("/help");
  };

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-[#070910]/95 p-4 backdrop-blur-2xl sm:p-5 lg:translate-x-0 ${
          sidebarCollapsed ? "lg:w-24" : "lg:w-72"
        } ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div
          className={`relative mb-7 flex items-center sm:mb-9 ${
            sidebarCollapsed
              ? "lg:justify-center"
              : "justify-between"
          }`}
        >
          <button
            type="button"
            onClick={() => {
              if (sidebarCollapsed) {
                handleToggleSidebarCollapse();
              }
            }}
            className={`flex min-w-0 items-center bg-transparent p-0 text-left ${
              sidebarCollapsed
                ? "cursor-pointer lg:justify-center"
                : "cursor-default"
            } ${sidebarCollapsed ? "" : "gap-3"}`}
            aria-label={
              sidebarCollapsed
                ? "Expand sidebar"
                : "Viralo AI"
            }
          >
            <div
              className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-transparent ${
                sidebarCollapsed
                  ? "h-11 w-11 sm:h-12 sm:w-12"
                  : "h-12 w-12 sm:h-[52px] sm:w-[52px]"
              }`}
            >
              <video
                src="/logo.mp4"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[135%] w-[135%] -translate-x-1/2 -translate-y-1/2 object-cover"
                autoPlay
                muted
                loop
                playsInline
                controls={false}
                disablePictureInPicture
                disableRemotePlayback
                controlsList="nodownload noplaybackrate noremoteplayback"
                onContextMenu={(event) =>
                  event.preventDefault()
                }
                aria-label="Viralo AI"
              />
            </div>

            <div
              className={`min-w-0 text-left ${
                sidebarCollapsed ? "lg:hidden" : ""
              }`}
            >
              <h1 className="truncate text-base font-semibold tracking-tight text-white">
                Viralo AI
              </h1>

              <p className="truncate text-xs text-zinc-500">
                AI Social Media Research
              </p>
            </div>
          </button>

          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={handleToggleSidebarCollapse}
              className="hidden h-9 w-9 items-center justify-center p-0 text-zinc-400 transition hover:text-cyan-200 lg:flex"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-xl p-2 text-zinc-400 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={
                  sidebarCollapsed
                    ? item.label
                    : undefined
                }
                onClick={() => {
                  setSidebarOpen(false);
                  setAccountMenuOpen(false);
                }}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-2xl py-3 text-sm ${
                    sidebarCollapsed
                      ? "px-4 lg:justify-center lg:px-3"
                      : "px-4"
                  } ${
                    isActive
                      ? "bg-white/[0.08] text-white shadow-inner shadow-white/5"
                      : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />

                <span
                  className={`truncate ${
                    sidebarCollapsed ? "lg:hidden" : ""
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div
          className={`mt-auto rounded-3xl border border-white/10 bg-white/[0.04] ${
            sidebarCollapsed
              ? "p-4 lg:mx-auto lg:w-fit lg:p-2"
              : "p-4"
          }`}
        >
          {!user ? (
            <>
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 ${
                  sidebarCollapsed ? "lg:mx-auto" : ""
                }`}
              >
                <Sparkles className="h-5 w-5 text-cyan-300" />
              </div>

              <div
                className={
                  sidebarCollapsed ? "lg:hidden" : ""
                }
              >
                <p className="text-sm font-medium text-white">
                  Create your account
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Sign up to scan viral ideas, save research,
                  and access your history.
                </p>

                <Button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="mt-4 h-9 w-full rounded-2xl bg-white text-sm font-medium text-black hover:bg-zinc-200"
                >
                  Sign up
                </Button>
              </div>
            </>
          ) : (
            <div
              className="relative"
              ref={accountMenuRef}
            >
              <div
                className={`flex ${
                  sidebarCollapsed
                    ? "items-center gap-3 lg:flex-col lg:gap-2"
                    : "items-center gap-3"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (sidebarCollapsed) {
                      setAccountMenuOpen(
                        (current) => !current
                      );
                    }
                  }}
                  className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] ${
                    sidebarCollapsed
                      ? "h-12 w-12 lg:h-10 lg:w-10"
                      : "h-12 w-12"
                  } ${
                    sidebarCollapsed
                      ? "cursor-pointer hover:border-cyan-300/40 hover:bg-cyan-300/10"
                      : "cursor-default"
                  }`}
                  aria-label="Open account menu"
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  title={
                    sidebarCollapsed
                      ? "Account menu"
                      : displayName
                  }
                >
                  {displayPhoto ? (
                    <img
                      src={displayPhoto}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound className="h-5 w-5 text-zinc-400" />
                  )}
                </button>

                <div
                  className={`min-w-0 flex-1 ${
                    sidebarCollapsed ? "lg:hidden" : ""
                  }`}
                >
                  <p className="truncate text-sm font-semibold text-white">
                    {displayName}
                  </p>

                  <p className="truncate text-xs text-zinc-500">
                    {displayEmail}
                  </p>

                  {planResolved && displayPlanLabel ? (
                    <span className="mt-1 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                      {displayPlanLabel} plan
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAccountMenuOpen(
                      (current) => !current
                    )
                  }
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white ${
                    sidebarCollapsed ? "lg:hidden" : ""
                  }`}
                  aria-label="Account menu"
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  title="Account menu"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>

              {accountMenuOpen && (
                <div
                  className={`absolute z-[9999] w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#11131b]/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-2xl ${
                    sidebarCollapsed
                      ? "bottom-[calc(100%+0.6rem)] right-0 lg:bottom-0 lg:left-[calc(100%+0.75rem)] lg:right-auto"
                      : "bottom-[calc(100%+0.6rem)] right-0"
                  }`}
                >
                  {planResolved && !hasFullAccess && (
                    <button
                      type="button"
                      onClick={handleUpgradeClick}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/[0.07] hover:text-white"
                      role="menuitem"
                    >
                      <CreditCard className="h-4 w-4 text-cyan-300" />
                      <span>Upgrade Plan</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleHelpClick}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/[0.07] hover:text-white"
                    role="menuitem"
                  >
                    <CircleHelp className="h-4 w-4 text-cyan-300" />
                    <span>Help & Legal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setLogoutModalOpen(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-200 hover:bg-red-500/10 hover:text-red-100"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {logoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0b0c11] p-6 shadow-2xl shadow-black/50">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
              <LogOut className="h-5 w-5 text-red-300" />
            </div>

            <h2 className="text-xl font-semibold text-white">
              Are you sure?
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Are you sure you want to logout from your
              account?
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-zinc-200 hover:bg-white/[0.08]"
              >
                No
              </Button>

              <Button
                type="button"
                onClick={handleConfirmLogout}
                className="h-11 rounded-2xl bg-red-500 px-4 text-sm font-semibold text-white hover:bg-red-400"
              >
                Yes, Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
