import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { AppAlertProvider } from "./components/ui/AppAlertProvider.jsx";
import AppErrorBoundary from "./components/ui/AppErrorBoundary";
import GlobalSeo from "./components/system/GlobalSeo";
import NetworkGate from "./components/system/NetworkGate";
import { registerServiceWorker } from "./lib/registerServiceWorker";

registerServiceWorker();

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <GlobalSeo />

      <NetworkGate>
        <AuthProvider>
          <AppAlertProvider>
            <App />
          </AppAlertProvider>
        </AuthProvider>
      </NetworkGate>
    </AppErrorBoundary>
  </React.StrictMode>
);
