import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Mail,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

import { Link } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";

const SUPPORT_EMAIL =
  String(import.meta.env.VITE_SUPPORT_EMAIL || "").trim() ||
  "support@viraloai.com";

const LAST_UPDATED = "July 22, 2026";

const POLICY_SECTIONS = [
  {
    title: "1. One-time 30-day Pro access",
    paragraphs: [
      "Viralo AI Pro is sold as a one-time digital access purchase for a fixed period of 30 days.",
      "The 30-day access period begins after the payment is successfully verified and Pro access is activated on the user's account.",
      "The current Pro purchase does not automatically renew. Viralo AI will not automatically charge the user again after the 30-day access period ends.",
      "A user who wishes to continue after expiry must make a new purchase.",
    ],
  },
  {
    title: "2. Cancellation policy",
    paragraphs: [
      "A successfully activated Pro purchase cannot be cancelled, paused, transferred, exchanged, or ended early.",
      "Users may stop using Viralo AI at any time, but stopping use does not cancel the purchase and does not create a right to a refund for unused days.",
      "Pro access will remain available until the displayed expiry date unless the account is restricted for fraud, abuse, unlawful activity, a security risk, or a violation of the Terms of Service.",
    ],
  },
  {
    title: "3. No-refund policy",
    paragraphs: [
      "Once payment has been successfully verified and Pro access has been activated, the purchase is final and non-refundable, except where a refund or other remedy is required by applicable law.",
      "Viralo AI does not provide refunds because a user changes their mind, does not use the service, uses the service only partially, forgets to use the service, or no longer requires the service.",
    ],
    bullets: [
      "No refund for unused or partially used days.",
      "No refund because the user expected different features or results.",
      "No refund because generated content did not achieve expected views, followers, engagement, income, or virality.",
      "No refund because the user stopped creating content or changed their niche, platform, device, browser, or workflow.",
      "No refund after account suspension caused by fraud, abuse, unlawful conduct, security violations, or a breach of the Terms of Service.",
      "No refund for temporary issues caused entirely by a third-party platform, bank, payment network, API provider, internet service, browser, or device outside Viralo AI's reasonable control.",
    ],
  },
  {
    title: "4. Money debited but Pro access not activated",
    paragraphs: [
      "If money is debited from the user's payment account but Viralo AI Pro is not activated, the user must contact Viralo AI support with valid payment evidence.",
      "Viralo AI will review the payment order, Razorpay payment status, transaction records, account details, and activation logs.",
      "Where the payment is verified as successfully captured for Viralo AI, the issue will be resolved by activating or restoring the applicable 30-day Pro access.",
      "Submitting a payment issue does not automatically create a refund request. The first resolution for a successfully captured payment is activation or restoration of the purchased Pro access.",
    ],
  },
  {
    title: "5. Information required for payment support",
    paragraphs: [
      `Contact ${SUPPORT_EMAIL} from the email address associated with your Viralo AI account, or use the Contact Us form.`,
    ],
    bullets: [
      "The email address registered with the Viralo AI account.",
      "Razorpay payment ID, order ID, or transaction reference.",
      "Payment date, approximate time, currency, and amount.",
      "A screenshot or statement showing the debit and transaction reference.",
      "A short explanation of what happened during or after checkout.",
      "A screenshot showing that Pro access is not active, where available.",
    ],
  },
  {
    title: "6. Pending, failed, reversed, or duplicate transactions",
    paragraphs: [
      "A bank debit does not always mean that Viralo AI received a successfully captured payment. A transaction may remain pending, fail, be reversed, or complete later because of bank, network, or payment-provider processing.",
      "Pro access will remain inactive until the payment provider confirms that the payment was successfully captured for the correct Viralo AI order.",
      "Where a transaction is failed or reversed, any automatic reversal timeline is controlled by the bank, payment method, payment network, and payment provider.",
      "Verified duplicate or incorrect charges will be reviewed as payment-processing corrections and handled according to the payment-provider records and applicable requirements.",
    ],
  },
  {
    title: "7. Investigation and account verification",
    paragraphs: [
      "Viralo AI may review payment records, order records, activation logs, account usage, support communication, and relevant technical logs when investigating a payment issue.",
      "Viralo AI may request additional evidence when the supplied information is incomplete, inconsistent, misleading, or insufficient to identify the transaction.",
      "Support can only apply access or transaction corrections after the payment and account ownership have been reasonably verified.",
    ],
  },
  {
    title: "8. Protect your payment information",
    paragraphs: [
      "Do not send full card numbers, CVV details, UPI PINs, OTPs, bank passwords, Firebase passwords, account passwords, or authentication codes.",
      "Viralo AI only requires non-sensitive transaction references and reasonable payment evidence to investigate an activation issue.",
    ],
  },
  {
    title: "9. Mandatory legal rights",
    paragraphs: [
      "Nothing in this policy excludes or limits any consumer right, remedy, refund, replacement, correction, or other obligation that cannot lawfully be excluded under applicable law.",
      "Where applicable law requires a different outcome, Viralo AI will follow that requirement.",
    ],
  },
  {
    title: "10. Policy updates",
    paragraphs: [
      "Viralo AI may update this policy when the product, pricing, payment provider, access model, legal requirements, or operating model changes.",
      "The policy displayed at the time of purchase will normally apply to that purchase, subject to any mandatory legal requirement.",
    ],
  },
];

export default function RefundCancellation() {
  return (
    <DashboardLayout
      eyebrow="Billing Policy"
      title="Refund & Cancellation Policy"
      hideHeaderAction
    >
      <article className="mx-auto max-w-4xl">
        <Link
          to="/help"
          className="inline-flex items-center gap-2 rounded-xl px-1 py-2 text-sm font-medium text-zinc-400 transition hover:text-cyan-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Help & Legal
        </Link>

        <header className="mt-3 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] via-cyan-300/[0.07] to-violet-500/[0.06] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
            <RefreshCcw className="h-6 w-6 text-cyan-200" />
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
            Viralo AI Billing Policy
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
            Refund & Cancellation Policy
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
            This policy explains the fixed 30-day Pro access period,
            non-refundable purchase terms, and the support process when
            a payment is debited but Pro access is not activated.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-xs text-zinc-300">
              <Clock3 className="h-3.5 w-3.5 text-cyan-200" />
              30-day fixed access
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-xs text-zinc-300">
              <RefreshCcw className="h-3.5 w-3.5 text-cyan-200" />
              No automatic renewal
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-xs text-zinc-300">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-200" />
              Non-refundable after activation
            </span>
          </div>

          <p className="mt-5 text-xs text-zinc-500">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        <div className="mt-6 rounded-3xl border border-amber-300/20 bg-amber-300/[0.07] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />

            <div>
              <p className="text-sm font-semibold text-amber-100">
                Important purchase notice
              </p>

              <p className="mt-2 text-sm leading-7 text-amber-50/80">
                After a payment is successfully verified and Pro access
                is activated, the purchase cannot be cancelled and is
                non-refundable. Pro access remains active for the full
                30-day period.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-sm leading-7 text-zinc-300">
          <p className="font-semibold text-white">
            Current operating status
          </p>

          <p className="mt-2">
            Viralo AI is currently operated as an independent remote
            software project. It is not presently incorporated or
            registered as a company and does not operate a public
            office.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {POLICY_SECTIONS.map((section) => (
            <section
              key={section.title}
              className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6"
            >
              <h2 className="text-base font-semibold text-white sm:text-lg">
                {section.title}
              </h2>

              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-3 text-sm leading-7 text-zinc-300"
                >
                  {paragraph}
                </p>
              ))}

              {section.bullets?.length ? (
                <ul className="mt-4 space-y-3">
                  {section.bullets.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-sm leading-6 text-zinc-300"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.07] p-5 sm:p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
            <Mail className="h-5 w-5 text-cyan-200" />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-white">
            Report a payment activation issue
          </h2>

          <p className="mt-2 text-sm leading-7 text-zinc-300">
            Contact support from your registered account email and
            include the payment ID, order ID, paid amount, payment date,
            and proof showing the debit.
          </p>

          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Viralo AI Payment Activation Issue`}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
          >
            <Mail className="h-4 w-4" />
            {SUPPORT_EMAIL}
          </a>
        </section>

        <footer className="mt-8 border-t border-white/10 py-7">
          <p className="text-sm font-semibold text-white">
            Related policies
          </p>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <Link
              to="/terms"
              className="text-sm text-zinc-400 transition hover:text-cyan-200"
            >
              Terms of Service
            </Link>

            <Link
              to="/privacy"
              className="text-sm text-zinc-400 transition hover:text-cyan-200"
            >
              Privacy Policy
            </Link>

            <Link
              to="/contact"
              className="text-sm text-zinc-400 transition hover:text-cyan-200"
            >
              Contact Us
            </Link>

            <Link
              to="/help"
              className="text-sm text-zinc-400 transition hover:text-cyan-200"
            >
              Help & Legal
            </Link>
          </div>
        </footer>
      </article>
    </DashboardLayout>
  );
}