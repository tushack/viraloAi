import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { AppAlertProvider } from "./components/ui/AppAlertProvider.jsx";
import AppErrorBoundary from "./components/ui/AppErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <AppAlertProvider>
          <App />
        </AppAlertProvider>
      </AuthProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);