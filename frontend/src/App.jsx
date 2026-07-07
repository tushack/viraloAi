import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

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

function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/dashboard" replace />;
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

    // Not logged in = admin page should look unavailable.
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
        // Backend returns 401/403 for non-admin users.
        // Frontend intentionally shows the normal 404 page.
        if (active) {
          setAccessStatus("denied");
        }
      });

    return () => {
      active = false;
    };
  }, [authLoading, user?.uid]);

  if (authLoading || accessStatus === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050711] px-4 text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-zinc-300 shadow-xl shadow-black/20">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
          Checking admin access...
        </div>
      </main>
    );
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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={<Dashboard />} />

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
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/about" element={<LegalInfoPage pageKey="about" />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/terms" element={<LegalInfoPage pageKey="terms" />} />
        <Route path="/privacy" element={<LegalInfoPage pageKey="privacy" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;