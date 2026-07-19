import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Onboarding from "./pages/Onboarding";
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
import HelpCenter from "./pages/HelpCenter";
import LegalInfoPage from "./pages/LegalInfoPage";
import ContactUs from "./pages/ContactUs";


function DashboardRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const onboardingCompleted =
    localStorage.getItem(
      `viraloOnboardingCompleted:${user.uid}`
    ) === "true";

  if (!onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

/**
 * Firebase authentication status check hote time
 * white/blank screen ki jagah loader show karega.
 */
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

/**
 * Root route handling:
 *
 * Logged-out user  -> Landing Page
 * Logged-in user   -> Dashboard
 */
function HomeRoute() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <PageLoader />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Landing />;
}

/**
 * Protected pages ko sirf logged-in users access kar sakte hain.
 */
function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * Admin page ke liye normal login ke saath
 * backend admin access bhi verify karega.
 */
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

    if (!user) {
      setAccessStatus("denied");

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
  }, [authLoading, user?.uid]);

  if (authLoading || accessStatus === "checking") {
    return <PageLoader message="Checking admin access..." />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
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

      <Routes>
        {/* Public root route */}
        <Route path="/" element={<HomeRoute />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* Protected Dashboard */}
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

        {/* Public informational pages */}
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/about" element={<LegalInfoPage pageKey="about" />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/terms" element={<LegalInfoPage pageKey="terms" />} />
        <Route path="/privacy" element={<LegalInfoPage pageKey="privacy" />} />

        {/* Unknown URL */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;