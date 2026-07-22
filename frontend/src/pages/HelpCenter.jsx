import {
  ArrowRight,
  Building2,
  CircleHelp,
  FileText,
  Mail,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

import { Link } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";

const SUPPORT_EMAIL =
  String(import.meta.env.VITE_SUPPORT_EMAIL || "").trim() ||
  "support@viraloai.com";

const helpItems = [
  {
    title: "About Viralo AI",
    description:
      "Learn what Viralo AI does and how this independent remote software project supports creators.",
    path: "/about",
    icon: Building2,
  },
  {
    title: "Contact Us",
    description:
      "Reach our support team for account, billing, product, refund, or project enquiries.",
    path: "/contact",
    icon: Mail,
  },
  {
    title: "Terms of Service",
    description:
      "Read the rules, subscription conditions, acceptable-use standards, and service terms.",
    path: "/terms",
    icon: FileText,
  },
  {
    title: "Privacy Policy",
    description:
      "Understand what information we collect, why we use it, and the choices available to users.",
    path: "/privacy",
    icon: ShieldCheck,
  },
  {
    title: "Refund & Cancellation",
    description:
      "Review the refund window, eligibility conditions, cancellation process, and expected timelines.",
    path: "/refund-cancellation",
    icon: RefreshCcw,
  },
];

export default function HelpCenter() {
  return (
    <DashboardLayout
      eyebrow="Support Center"
      title="Help & Legal"
      hideHeaderAction
    >
      <section className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-cyan-300/15 bg-gradient-to-br from-cyan-300/10 via-blue-500/[0.06] to-violet-500/[0.08] p-6 shadow-2xl shadow-cyan-950/20 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10">
            <CircleHelp className="h-6 w-6 text-cyan-200" />
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
            Viralo AI Support
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
            Everything you need in one place.
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
            Access project information, support details, billing
            policies, and the terms that govern use of Viralo AI.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {helpItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className="group rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/10">
                    <Icon className="h-5 w-5 text-cyan-200" />
                  </div>

                  <ArrowRight className="h-5 w-5 text-zinc-500 transition group-hover:translate-x-1 group-hover:text-cyan-200" />
                </div>

                <h2 className="mt-5 text-base font-semibold text-white">
                  {item.title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-sm font-semibold text-white">
              Need direct support?
            </p>

            <p className="mt-1 text-sm text-zinc-400">
              Email our team and include your registered account
              email for a faster response.
            </p>
          </div>

          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-4 inline-flex shrink-0 items-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15 sm:mt-0"
          >
            <Mail className="h-4 w-4" />
            {SUPPORT_EMAIL}
          </a>
        </div>
      </section>
    </DashboardLayout>
  );
}