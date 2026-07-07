import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  createProPaymentQuote,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../lib/paymentApi";
import { useAuth } from "../context/AuthContext";

function loadRazorpayCheckout() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Could not load secure checkout.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load secure checkout."));
    document.body.appendChild(script);
  });
}

function formatMinorAmount(amountMinor, currency) {
  const amount = Number(amountMinor || 0) / 100;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || ""} ${amount.toFixed(2)}`.trim();
  }
}

function formatFxRate(rate) {
  const numberRate = Number(rate);

  if (!Number.isFinite(numberRate) || numberRate <= 0) {
    return "Live rate unavailable";
  }

  return `1 USD = ₹${numberRate.toFixed(4)}`;
}

function formatExpiry(expiresAt) {
  const date = new Date(expiresAt || "");

  if (Number.isNaN(date.getTime())) {
    return "shortly";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isQuoteError(error) {
  return ["PAYMENT_QUOTE_EXPIRED", "PAYMENT_QUOTE_USED"].includes(
    error?.code
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isIndia = quote?.countryCode === "IN";
  const taxPercent = Number(quote?.taxBps || 0) / 100;

  const payLabel = useMemo(() => {
    if (!quote) return "Loading secure checkout...";

    return `Pay ${formatMinorAmount(quote.totalMinor, quote.currency)}`;
  }, [quote]);

  const loadQuote = useCallback(async () => {
    try {
      setLoadingQuote(true);
      setError("");
      setSuccess("");

      const nextQuote = await createProPaymentQuote();

      if (!nextQuote?.id) {
        throw new Error("A valid live payment quote was not returned.");
      }

      setQuote(nextQuote);
    } catch (quoteError) {
      setQuote(null);
      setError(quoteError.message || "Could not load live checkout price.");
    } finally {
      setLoadingQuote(false);
    }
  }, []);

  useEffect(() => {
    loadQuote();
  }, [loadQuote]);

  const handlePay = async () => {
    if (!quote?.id || processing) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      await loadRazorpayCheckout();

      const order = await createRazorpayOrder({
        quoteId: quote.id,
      });

      if (!order?.orderId || !order?.keyId || !window.Razorpay) {
        throw new Error("Payment checkout could not be initialized.");
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Viralo AI",
        description: "Pro unlimited access for 30 days",
        order_id: order.orderId,
        prefill: {
          email: user?.email || "",
          name: user?.displayName || "",
        },
        theme: {
          color: "#67e8f9",
        },
        handler: async (response) => {
          try {
            const verification = await verifyRazorpayPayment(response);

            setSuccess(
              verification?.message ||
                "Payment verified. Pro unlimited access is active."
            );

            window.setTimeout(() => {
              navigate("/dashboard", { replace: true });
            }, 900);
          } catch (verificationError) {
            setError(
              verificationError.message ||
                "Payment completed but verification is pending. Refresh after a moment."
            );
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
      });

      checkout.on("payment.failed", (response) => {
        setError(
          response?.error?.description ||
            "Payment was not completed. Please try again."
        );
        setProcessing(false);
      });

      checkout.open();
    } catch (paymentError) {
      if (isQuoteError(paymentError)) {
        setError(paymentError.message || "Your price quote expired. Refresh it and try again.");
        await loadQuote();
      } else {
        setError(paymentError.message || "Could not start secure payment.");
      }

      setProcessing(false);
    }
  };

  return (
    <DashboardLayout eyebrow="Checkout" title="Complete your Pro upgrade">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate("/payment", { state: location.state })}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to plans
          </button>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
            Review your secure checkout
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            The final amount below is created server-side and locked only for this
            secure checkout session.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-semibold text-emerald-100 sm:self-auto">
          <ShieldCheck className="h-4 w-4" />
          Secure checkout
        </div>
      </section>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">
          {success}
        </div>
      )}

      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-white/10 bg-white/[0.04]">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/15">
                <Sparkles className="h-6 w-6 text-cyan-200" />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white">Viralo AI Pro</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Unlimited creator research tools, complete history, and all current
                  Pro features for 30 days.
                </p>
              </div>
            </div>

            <div className="mt-7 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Base plan price
              </p>
              <p className="mt-2 text-4xl font-black tracking-tight text-white">
                $20.00
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                The product price is fixed in USD. The checkout total below is the
                live equivalent for your payment currency.
              </p>
            </div>

            <div className="mt-6 space-y-3 text-sm text-zinc-300">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                Unlimited dashboard, trend, competitor, and YouTube download access.
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                Complete research-history access during your active Pro period.
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                Payment activation occurs only after Razorpay verification.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-300/20 bg-white/[0.05] shadow-2xl shadow-cyan-950/20">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Order summary</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Live quote before payment
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={loadQuote}
                disabled={loadingQuote || processing}
                className="h-9 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs text-zinc-300 hover:bg-white/[0.09]"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingQuote ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {loadingQuote ? (
              <div className="flex min-h-[270px] items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
                  Loading live price...
                </div>
              </div>
            ) : quote ? (
              <>
                <div className="mt-7 space-y-4 border-y border-white/10 py-5 text-sm">
                  <SummaryRow label="Product price" value="$20.00" />

                  {/* {isIndia && (
                    <SummaryRow
                      label="Live exchange rate"
                      value={formatFxRate(quote.fxRate)}
                    />
                  )} */}

                  {!isIndia && (
                    <SummaryRow
                      label="Checkout currency"
                      value="USD"
                    />
                  )}

                  <SummaryRow
                    label="Plan value"
                    value={formatMinorAmount(quote.subtotalMinor, quote.currency)}
                  />

                  <SummaryRow
                    label={
                      quote.taxBps > 0
                        ? `Tax included (${taxPercent.toFixed(2)}%)`
                        : "Tax included"
                    }
                    value={formatMinorAmount(quote.taxMinor, quote.currency)}
                  />
                </div>

                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-400">Total payable</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Quote valid until {formatExpiry(quote.expiresAt)}
                    </p>
                  </div>

                  <p className="text-2xl font-black tracking-tight text-white">
                    {formatMinorAmount(quote.totalMinor, quote.currency)}
                  </p>
                </div>

                <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-zinc-400">
                  {isIndia
                    ? "This INR amount is calculated from the live USD to INR rate. Tax is included inside the final total."
                    : "International checkout is charged in USD. Your bank or card issuer may show the equivalent in your card billing currency."}
                </p>

                <Button
                  type="button"
                  onClick={handlePay}
                  disabled={processing}
                  className="mt-6 h-12 w-full rounded-full bg-cyan-300 px-5 text-sm font-semibold text-black shadow-lg shadow-cyan-500/15 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Opening secure checkout...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      {payLabel}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="mt-7 rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-sm text-red-100">
                The live price could not be loaded. Refresh to try again.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </DashboardLayout>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-medium text-zinc-200">{value}</span>
    </div>
  );
}
