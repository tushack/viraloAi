import React from "react";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App crashed:", error);
    console.error("Error details:", errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoDashboard = () => {
    window.location.href = "/dashboard";
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const errorMessage =
      this.state.error?.message || "Unexpected app error occurred.";

    return (
      <div className="min-h-screen bg-[#050711] px-4 py-8 text-white">
        <div className="mx-auto flex min-h-[85vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-[2rem] border border-red-300/20 bg-white/[0.04] p-6 shadow-2xl shadow-red-950/30 backdrop-blur-2xl sm:p-8">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-300/20 bg-red-500/10">
              <AlertTriangle className="h-7 w-7 text-red-300" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Something went wrong
            </h1>

        

            <div className="mt-5 rounded-2xl border border-red-300/15 bg-red-500/10 px-4 py-3">
              <p className="text-sm font-medium text-red-100">
                {errorMessage}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                <RefreshCcw className="h-4 w-4" />
                Reload App
              </button>

              <button
                type="button"
                onClick={this.handleGoDashboard}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.1]"
              >
                <Home className="h-4 w-4" />
                Go to Dashboard
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                this.setState((current) => ({
                  showDetails: !current.showDetails,
                }))
              }
              className="mt-5 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            >
              {this.state.showDetails ? "Hide Error Details" : "Show Error Details"}
            </button>

            {this.state.showDetails && (
              <pre className="mt-4 max-h-72 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-6 text-zinc-300">
                {String(errorMessage)}
                {"\n\n"}
                {this.state.errorInfo?.componentStack || ""}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }
}