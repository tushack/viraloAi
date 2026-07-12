import React from "react";
import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try Viralo AI with lifetime starter limits.",
    badge: "Starter",
    icon: Sparkles,
    highlighted: false,
    features: [
      "5 dashboard searches",
      "5 trend searches",
      "5 competitor analyses",
      "3 YouTube downloads",
      "Latest 3 research-history items",
    ],
    buttonText: "Your Current Plan",
  },
  {
    name: "Pro",
    price: "$9",
    period: "for 30 days",
    description:
      "Unlock unlimited research, trends, competitor analysis, downloads, and creator tools.",
    badge: "Unlimited access",
    icon: Crown,
    highlighted: true,
    features: [
      "Unlimited dashboard searches",
      "Unlimited trend searches",
      "Unlimited competitor analyses",
      "Unlimited YouTube downloads",
      "Complete research history",
      "All current creator tools",
    ],
    buttonText: "Continue to Secure Checkout",
  },
];

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const upgradeDetails = location.state?.upgrade || null;

  const handlePlanAction = (planName) => {
    if (planName === "Free") return;

    navigate("/checkout", {
      state: {
        upgrade: upgradeDetails,
      },
    });
  };

  return (
    <DashboardLayout eyebrow="Billing" title="Choose your creator plan">
      <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-medium text-cyan-200">
              <Zap className="h-4 w-4" />
              Upgrade your research power
            </div>

            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Go Pro for $20. Create without limits.
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
              Choose the plan that fits your workflow. Pay securely in your
              supported currency, and review the final tax-inclusive amount
              clearly before checkout.
            </p>

            {upgradeDetails?.label && (
              <p className="mt-4 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-100">
                Your free {upgradeDetails.label} limit has been reached.
              </p>
            )}
          </div>

          <Button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="h-11 rounded-full border border-white/10 bg-white/[0.05] px-5 text-sm font-medium text-zinc-200 hover:bg-white/[0.1]"
          >
            Back to Dashboard
          </Button>
        </div>
      </section>

      <section className="grid items-stretch gap-5 lg:grid-cols-2">
        {plans.map((plan) => {
          const Icon = plan.icon;

          return (
            <Card
              key={plan.name}
              className={`relative flex h-full overflow-hidden border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:bg-white/[0.06] ${
                plan.highlighted
                  ? "ring-1 ring-cyan-300/30 shadow-cyan-950/30"
                  : ""
              }`}
            >
              {plan.highlighted && (
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 to-violet-400" />
              )}

              <CardContent className="relative flex h-full w-full flex-col p-6 sm:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 ${
                        plan.highlighted
                          ? "bg-cyan-300/15 text-cyan-300 ring-cyan-300/20"
                          : "bg-white/[0.06] text-zinc-300 ring-white/10"
                      }`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold text-white">
                        {plan.name}
                      </h2>

                      <p className="mt-1 max-w-md text-sm leading-6 text-zinc-500">
                        {plan.description}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      plan.highlighted
                        ? "bg-cyan-300/10 text-cyan-200"
                        : "bg-white/[0.06] text-zinc-300"
                    }`}
                  >
                    {plan.badge}
                  </span>
                </div>

                <div className="mb-7 flex items-end gap-2">
                  <span className="text-5xl font-black tracking-tight text-white">
                    {plan.price}
                  </span>

                  <span className="pb-2 text-sm text-zinc-500">
                    / {plan.period}
                  </span>
                </div>

                <div className="flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex gap-3">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-300/10">
                        <Check className="h-3.5 w-3.5 text-cyan-300" />
                      </div>

                      <p className="text-sm leading-6 text-zinc-300">
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-8">
                  <Button
                    type="button"
                    onClick={() => handlePlanAction(plan.name)}
                    disabled={plan.name === "Free"}
                    className={`h-14 w-full rounded-full px-5 text-sm font-semibold ${
                      plan.highlighted
                        ? "bg-cyan-300 text-black shadow-lg shadow-cyan-500/20 hover:bg-cyan-200"
                        : "border border-white/10 bg-white/[0.05] text-zinc-400 opacity-100 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-100"
                    }`}
                  >
                    {plan.buttonText}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </DashboardLayout>
  );
}