import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Onboarding from "./pages/Onboarding";
import VerifyEmail from "./pages/VerifyEmail";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import FreshTopics from "./pages/FreshTopics";
import Trends from "./pages/Trends";
import Competitors from "./pages/Competitors";
import SavedIdeas from "./pages/SavedIdeas";
import History from "./pages/History";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AuthModal from "./components/auth/AuthModal";
import { useAuth } from "./context/AuthContext";
import Payment from "./pages/Payment";
import ContentPack from "./pages/ContentPack";
import SavedThumbnails from "./pages/SavedThumbnails";
import Profile from "./pages/Profile";
import DataPrivacy from "./pages/DataPrivacy";
import ViralCheck from "./pages/ViralCheck";
import MediaExport from "./pages/MediaExport";
import AdminPanel from "./pages/AdminPanel";
import AdminAccessDenied from "./pages/AdminAccessDenied";
import { getAdminAccess } from "./lib/api";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import HelpCenter from "./pages/HelpCenter";
import LegalInfoPage from "./pages/LegalInfoPage";
import ContactUs from "./pages/ContactUs";
import { restorePaymentAccess } from "./lib/paymentApi";
import RefundCancellation from "./pages/RefundCancellation";
import BackgroundTaskCenter from "./components/background/BackgroundTaskCenter";

function PageLoader({ message = "Loading Viralo AI..." }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050711] px-4 text-white">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-zinc-300 shadow-xl shadow-black/20">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
        <span>{message}</span>
      </div>
    </main>
  );
}


function PurchaseRestoreGate({ children }) {
  const { user } = useAuth();
  const [restoreStatus, setRestoreStatus] =
    useState("checking");

  useEffect(() => {
    let active = true;

    if (!user?.uid || !user.emailVerified) {
      setRestoreStatus("ready");

      return () => {
        active = false;
      };
    }

    const sessionKey =
      `viraloPurchaseRestoreChecked:${user.uid}`;

    if (sessionStorage.getItem(sessionKey) === "true") {
      setRestoreStatus("ready");

      return () => {
        active = false;
      };
    }

    setRestoreStatus("checking");

    restorePaymentAccess()
      .then((result) => {
        if (!active) return;

        sessionStorage.setItem(sessionKey, "true");

        if (result?.restored) {
          localStorage.setItem(
            `viraloPurchaseRestored:${user.uid}`,
            JSON.stringify({
              restored: true,
              currentPeriodEnd:
                result?.access?.currentPeriodEnd || null,
              restoredAt: new Date().toISOString(),
            })
          );
        }

        setRestoreStatus("ready");
      })
      .catch((error) => {
        if (!active) return;

        /*
         * Do not lock the whole application when the restore check is
         * temporarily unavailable. Payment pages can check access again.
         */
        console.error(
          "Purchase restore check failed:",
          error
        );

        setRestoreStatus("ready");
      });

    return () => {
      active = false;
    };
  }, [user?.emailVerified, user?.uid]);

  if (restoreStatus === "checking") {
    return (
      <PageLoader message="Checking existing Pro access..." />
    );
  }

  return children;
}

function HomeRoute() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Landing />;
  }

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function VerifyEmailRoute() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <PageLoader message="Checking your account..." />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.emailVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  return <VerifyEmail />;
}

function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return (
    <PurchaseRestoreGate>
      {children}
    </PurchaseRestoreGate>
  );
}

function DashboardRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return (
    <PurchaseRestoreGate>
      <DashboardOnboardingGate user={user}>
        {children}
      </DashboardOnboardingGate>
    </PurchaseRestoreGate>
  );
}

function DashboardOnboardingGate({ user, children }) {
  const onboardingCompleted =
    localStorage.getItem(
      `viraloOnboardingCompleted:${user.uid}`
    ) === "true";

  if (!onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { user, authLoading } = useAuth();
  const [accessStatus, setAccessStatus] = useState("checking");

  useEffect(() => {
    let active = true;

    if (authLoading) {
      return () => {
        active = false;
      };
    }

    if (!user || !user.emailVerified) {
      setAccessStatus("checking");

      return () => {
        active = false;
      };
    }

    setAccessStatus("checking");

    getAdminAccess()
      .then(() => {
        if (active) {
          setAccessStatus("allowed");
        }
      })
      .catch(() => {
        if (active) {
          setAccessStatus("denied");
        }
      });

    return () => {
      active = false;
    };
  }, [authLoading, user?.emailVerified, user?.uid]);

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (accessStatus === "checking") {
    return <PageLoader message="Checking admin access..." />;
  }

  if (accessStatus !== "allowed") {
    return <AdminAccessDenied />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthModal />
      <BackgroundTaskCenter />

      <Routes>
        <Route path="/" element={<HomeRoute />} />

        <Route path="/verify-email" element={<VerifyEmailRoute />} />

        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <DashboardRoute>
              <Dashboard />
            </DashboardRoute>
          }
        />

        <Route
          path="/fresh-topics"
          element={
            <ProtectedRoute>
              <FreshTopics />
            </ProtectedRoute>
          }
        />

        <Route
          path="/trends"
          element={
            <ProtectedRoute>
              <Trends />
            </ProtectedRoute>
          }
        />

        <Route
          path="/competitors"
          element={
            <ProtectedRoute>
              <Competitors />
            </ProtectedRoute>
          }
        />

        <Route
          path="/saved-ideas"
          element={
            <ProtectedRoute>
              <SavedIdeas />
            </ProtectedRoute>
          }
        />

        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/data-privacy"
          element={
            <ProtectedRoute>
              <DataPrivacy />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute>
              <Payment />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payment/success"
          element={
            <ProtectedRoute>
              <PaymentSuccess />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payment/failed"
          element={
            <ProtectedRoute>
              <PaymentFailed />
            </ProtectedRoute>
          }
        />

        <Route
          path="/content-pack"
          element={
            <ProtectedRoute>
              <ContentPack />
            </ProtectedRoute>
          }
        />

        <Route
          path="/saved-thumbnails"
          element={
            <ProtectedRoute>
              <SavedThumbnails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/viral-check"
          element={
            <ProtectedRoute>
              <ViralCheck />
            </ProtectedRoute>
          }
        />

        <Route
          path="/media-export"
          element={
            <ProtectedRoute>
              <MediaExport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />

        <Route path="/help" element={<HelpCenter />} />
        <Route path="/about" element={<LegalInfoPage pageKey="about" />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/terms" element={<LegalInfoPage pageKey="terms" />} />
        <Route path="/privacy" element={<LegalInfoPage pageKey="privacy" />} />
        <Route
          path="/refund-cancellation"
          element={<RefundCancellation />}
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
