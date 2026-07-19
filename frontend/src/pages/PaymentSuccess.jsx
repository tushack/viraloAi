import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Crown,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { getPaymentAccess } from "../lib/paymentApi";

const MAX_AUTO_CHECKS = 4;
const AUTO_CHECK_DELAY_MS = 1200;

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function formatDate(value) {
  const date = new Date(value || "");

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function maskReference(value) {
  const text = String(value || "").trim();

  if (!text) return "";

  if (text.length <= 10) {
    return text;
  }

  return `${text.slice(0, 6)}••••${text.slice(-4)}`;
}

export default function PaymentSuccess() {
  const location = useLocation();
  const navigate = useNavigate();

  const [status, setStatus] = useState("checking");
  const [access, setAccess] = useState(
    location.state?.access || null
  );
  const [error, setError] = useState("");

  const paymentId = useMemo(
    () => location.state?.paymentId || "",
    [location.state?.paymentId]
  );

  const orderId = useMemo(
    () => location.state?.orderId || "",
    [location.state?.orderId]
  );

  const checkAccess = useCallback(
    async ({ retry = false } = {}) => {
      try {
        setStatus("checking");
        setError("");

        const totalChecks = retry ? 1 : MAX_AUTO_CHECKS;
        let latestAccess = null;

        for (let index = 0; index < totalChecks; index += 1) {
          const response = await getPaymentAccess();
          latestAccess = response?.access || null;

          if (latestAccess?.isPaid) {
            setAccess(latestAccess);
            setStatus("active");
            return;
          }

          if (index < totalChecks - 1) {
            await wait(AUTO_CHECK_DELAY_MS);
          }
        }

        setAccess(latestAccess);
        setStatus("pending");
      } catch (accessError) {
        setStatus("pending");
        setError(
          accessError.message ||
            "Could not confirm your current plan. Please check again."
        );
      }
    },
    []
  );

  useEffect(() => {
    if (access?.isPaid) {
      setStatus("active");
      return;
    }

    checkAccess();
  }, [access?.isPaid, checkAccess]);

  const periodEnd = formatDate(access?.currentPeriodEnd);
  const isActive = status === "active";

  return (
    <DashboardLayout
      eyebrow="Payment"
      title={
        isActive
          ? "Your Pro upgrade is active"
          : "Confirming your Pro upgrade"
      }
    >
      <section className="mx-auto max-w-4xl">
        <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.15),transparent_38%),rgba(255,255,255,0.04)] shadow-2xl shadow-black/30">
          <CardContent className="p-5 sm:p-8 lg:p-10">
            <div className="text-center">
              <span
                className={`mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] border ${
                  isActive
                    ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
                    : "border-cyan-300/20 bg-cyan-300/10 text-cyan-200"
                }`}
              >
                {status === "checking" ? (
                  <Loader2 className="h-9 w-9 animate-spin" />
                ) : isActive ? (
                  <CheckCircle2 className="h-10 w-10" />
                ) : (
                  <RefreshCw className="h-9 w-9" />
                )}
              </span>

              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                {isActive
                  ? "Payment verified"
                  : "Verification in progress"}
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                {isActive
                  ? "Welcome to Viralo AI Pro"
                  : "We are checking your Pro access"}
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                {isActive
                  ? location.state?.message ||
                    "Your payment was verified and unlimited Pro creator tools are now available."
                  : "The payment result was received. Viralo AI is checking your current plan with the server before showing it as active."}
              </p>
            </div>

            {isActive ? (
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <InfoCard
                  icon={Crown}
                  label="Current plan"
                  value="Viralo AI Pro"
                />
                <InfoCard
                  icon={CalendarDays}
                  label="Access valid until"
                  value={periodEnd || "Active"}
                />
                <InfoCard
                  icon={ShieldCheck}
                  label="Payment status"
                  value="Verified"
                />
              </div>
            ) : (
              <div className="mt-8 rounded-3xl border border-amber-300/15 bg-amber-300/[0.055] p-5 text-center">
                <p className="text-sm leading-6 text-amber-100">
                  Pro access is not visible yet. Do not start a
                  second payment before checking the status again.
                </p>
              </div>
            )}

            {(paymentId || orderId) && (
              <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
                  Payment reference
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {paymentId && (
                    <ReferenceRow
                      label="Payment ID"
                      value={maskReference(paymentId)}
                    />
                  )}

                  {orderId && (
                    <ReferenceRow
                      label="Order ID"
                      value={maskReference(orderId)}
                    />
                  )}
                </div>
              </div>
            )}

            {error && (
              <p className="mt-5 rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                {error}
              </p>
            )}

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {isActive ? (
                <>
                  <Button
                    type="button"
                    onClick={() =>
                      navigate("/dashboard", {
                        replace: true,
                      })
                    }
                    className="h-12 rounded-2xl bg-cyan-300 px-5 text-sm font-semibold text-black hover:bg-cyan-200"
                  >
                    Open Pro dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    onClick={() => navigate("/trends")}
                    className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-zinc-200 hover:bg-white/[0.08]"
                  >
                    <Sparkles className="h-4 w-4" />
                    Explore creator tools
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={() =>
                      checkAccess({ retry: true })
                    }
                    disabled={status === "checking"}
                    className="h-12 rounded-2xl bg-cyan-300 px-5 text-sm font-semibold text-black hover:bg-cyan-200 disabled:opacity-60"
                  >
                    {status === "checking" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Check payment status
                  </Button>

                  <Button
                    type="button"
                    onClick={() => navigate("/contact")}
                    className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-zinc-200 hover:bg-white/[0.08]"
                  >
                    Contact support
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </DashboardLayout>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <Icon className="h-5 w-5 text-cyan-200" />
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function ReferenceRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-zinc-600">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-zinc-300">
        {value}
      </p>
    </div>
  );
}
