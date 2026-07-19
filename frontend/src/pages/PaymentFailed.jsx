import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  Headphones,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { getPaymentAccess } from "../lib/paymentApi";

function maskReference(value) {
  const text = String(value || "").trim();

  if (!text) return "";

  if (text.length <= 10) {
    return text;
  }

  return `${text.slice(0, 6)}••••${text.slice(-4)}`;
}

export default function PaymentFailed() {
  const location = useLocation();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const stage = location.state?.stage || "payment";
  const title =
    location.state?.title ||
    (stage === "verification"
      ? "Payment confirmation pending"
      : "Payment unsuccessful");

  const description =
    location.state?.message ||
    (stage === "verification"
      ? "Viralo AI received the payment response but could not confirm Pro access yet."
      : "The secure checkout did not complete successfully.");

  const paymentId = useMemo(
    () => location.state?.paymentId || "",
    [location.state?.paymentId]
  );

  const orderId = useMemo(
    () => location.state?.orderId || "",
    [location.state?.orderId]
  );

  const errorCode = location.state?.code || "";
  const upgradeDetails = location.state?.upgrade || null;

  const checkCurrentAccess = useCallback(
    async ({ automatic = false } = {}) => {
      try {
        setChecking(true);

        if (!automatic) {
          setStatusMessage("");
        }

        const response = await getPaymentAccess();
        const access = response?.access || null;

        if (access?.isPaid) {
          navigate("/payment/success", {
            replace: true,
            state: {
              message:
                "Your payment is confirmed and Pro access is active.",
              access,
              paymentId,
              orderId,
            },
          });
          return;
        }

        if (!automatic) {
          setStatusMessage(
            "Pro access is not active yet. You can retry checkout or contact support with the payment reference."
          );
        }
      } catch (error) {
        if (!automatic) {
          setStatusMessage(
            error.message ||
              "Could not check your current payment status."
          );
        }
      } finally {
        setChecking(false);
      }
    },
    [navigate, orderId, paymentId]
  );

  useEffect(() => {
    if (stage === "verification") {
      checkCurrentAccess({ automatic: true });
    }
  }, [checkCurrentAccess, stage]);

  const handleRetry = () => {
    navigate("/checkout", {
      replace: true,
      state: {
        upgrade: upgradeDetails,
      },
    });
  };

  return (
    <DashboardLayout
      eyebrow="Payment"
      title={
        stage === "verification"
          ? "Check your payment status"
          : "Try your upgrade again"
      }
    >
      <section className="mx-auto max-w-4xl">
        <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.12),transparent_38%),rgba(255,255,255,0.04)] shadow-2xl shadow-black/30">
          <CardContent className="p-5 sm:p-8 lg:p-10">
            <div className="text-center">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-red-300/20 bg-red-400/10 text-red-200">
                {stage === "verification" ? (
                  <ShieldAlert className="h-10 w-10" />
                ) : (
                  <AlertTriangle className="h-10 w-10" />
                )}
              </span>

              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-200">
                {stage === "verification"
                  ? "Confirmation required"
                  : "Payment not completed"}
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                {title}
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                {description}
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <ActionInfo
                icon={RefreshCw}
                title="Check status"
                description="Confirm whether Pro access became active."
              />
              <ActionInfo
                icon={CreditCard}
                title="Retry checkout"
                description="Create a fresh secure payment session."
              />
              <ActionInfo
                icon={Headphones}
                title="Get support"
                description="Share your payment reference if needed."
              />
            </div>

            {(paymentId || orderId || errorCode) && (
              <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
                  Reference details
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
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

                  {errorCode && (
                    <ReferenceRow
                      label="Error code"
                      value={errorCode}
                    />
                  )}
                </div>
              </div>
            )}

            {statusMessage && (
              <p className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                {statusMessage}
              </p>
            )}

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Button
                type="button"
                onClick={() => checkCurrentAccess()}
                disabled={checking}
                className="h-12 rounded-2xl bg-cyan-300 px-5 text-sm font-semibold text-black hover:bg-cyan-200 disabled:opacity-60"
              >
                {checking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Check status
              </Button>

              <Button
                type="button"
                onClick={handleRetry}
                className="h-12 rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-sm font-semibold text-white hover:bg-white/[0.1]"
              >
                <CreditCard className="h-4 w-4" />
                Retry payment
              </Button>

              <Button
                type="button"
                onClick={() => navigate("/payment")}
                className="h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-5 text-sm font-semibold text-zinc-300 hover:bg-white/[0.08]"
              >
                <ArrowLeft className="h-4 w-4" />
                View plans
              </Button>

              <Button
                type="button"
                onClick={() => navigate("/contact")}
                className="h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-5 text-sm font-semibold text-zinc-300 hover:bg-white/[0.08]"
              >
                <Headphones className="h-4 w-4" />
                Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </DashboardLayout>
  );
}

function ActionInfo({ icon: Icon, title, description }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
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
