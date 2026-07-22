import {
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

const LAST_UPDATED = "July 21, 2026";

const POLICY_SECTIONS = [
  {
    title: "1. Current plan and cancellation",
    paragraphs: [
      "The current Viralo AI Pro plan is offered as a one-time, fixed-duration digital access purchase. Unless a checkout page expressly states otherwise, the plan does not automatically renew and Viralo AI does not automatically charge users again after the active access period ends.",
      "Because the current plan does not automatically renew, no separate cancellation is required to prevent a future payment. Users may stop using the service at any time, while their existing access will normally remain available until the displayed expiry date.",
    ],
  },
  {
    title: "2. Refund request window",
    paragraphs: [
      "A refund request should be submitted within 7 calendar days from the date of successful payment.",
      "Submitting a request does not automatically guarantee a refund. Each request is reviewed according to payment status, service usage, technical circumstances, and applicable law.",
    ],
  },
  {
    title: "3. When a refund may be approved",
    bullets: [
      "The same Viralo AI purchase was charged more than once.",
      "Payment was successfully captured but paid access was not activated because of a Viralo AI technical issue that could not be resolved within a reasonable period.",
      "The purchase was accidental, the request was submitted within the refund window, and the paid service has not been substantially used.",
      "The payment amount was incorrect because of a verified Viralo AI checkout or server error.",
      "A refund is otherwise required under applicable law.",
    ],
  },
  {
    title: "4. When a refund will normally not be approved",
    bullets: [
      "The request is submitted more than 7 calendar days after successful payment.",
      "The user has substantially used Pro features, including repeated AI generations, content-pack generation, competitor analysis, thumbnail generation, media export, or other paid creator tools.",
      "The user has downloaded, exported, published, or commercially used digital output produced through paid features.",
      "The request is based only on personal preference, expected views, expected revenue, expected followers, or an expectation that content would become viral.",
      "The account was restricted because of fraud, abuse, security violations, unlawful conduct, or a violation of the Terms of Service.",
      "A third-party platform, API, bank, payment provider, browser, device, or internet service caused an issue outside Viralo AI's reasonable control.",
    ],
  },
  {
    title: "5. How to request a refund",
    paragraphs: [
      `Send the refund request to ${SUPPORT_EMAIL} from the email address associated with your Viralo AI account.`,
    ],
    bullets: [
      "Your registered Viralo AI email address.",
      "Razorpay payment ID or order ID.",
      "Payment date and paid amount.",
      "A clear explanation of the refund reason.",
      "Relevant screenshots where a technical or duplicate-payment issue occurred.",
    ],
  },
  {
    title: "6. Do not send sensitive payment information",
    paragraphs: [
      "Do not send card numbers, CVV details, bank passwords, UPI PINs, OTPs, authentication codes, or account passwords. Viralo AI does not require these details to review a refund request.",
    ],
  },
  {
    title: "7. Review and verification",
    paragraphs: [
      "Viralo AI may review account usage, payment records, access activation, generated outputs, exports, technical logs, and communication history when evaluating a refund request.",
      "Additional information may be requested to verify the payment owner or understand the reported problem. A refund request may be declined when the supplied information is incomplete, misleading, or cannot be verified.",
      "We aim to provide an initial response to a complete refund request within 5 business days.",
    ],
  },
  {
    title: "8. Refund method and processing time",
    paragraphs: [
      "Approved refunds are returned to the original payment method used for the purchase. Viralo AI does not normally issue a refund to a different card, bank account, UPI ID, wallet, or person.",
      "After an approved refund is initiated, the payment provider and the customer's bank may require additional time for the amount to appear in the original payment account.",
      "Normal refund processing commonly takes approximately 5 to 10 working days after initiation, although the exact time can vary by payment method, bank, payment network, and payment-provider processing.",
    ],
  },
  {
    title: "9. Failed, pending, or debited payments",
    paragraphs: [
      "A payment that appears debited but is marked unsuccessful or pending is not always a completed Viralo AI purchase. The bank or payment provider may automatically reverse an unsuccessful transaction.",
      "If the amount is not automatically reversed within the period communicated by the bank or payment provider, contact Viralo AI support with the payment ID, order ID, date, amount, and a screenshot that does not expose sensitive financial information.",
    ],
  },
  {
    title: "10. Partial refunds",
    paragraphs: [
      "Where appropriate and technically available, Viralo AI may approve a full or partial refund. The final amount depends on the reason for the request, verified service usage, payment status, and applicable requirements.",
    ],
  },
  {
    title: "11. Changes to this policy",
    paragraphs: [
      "Viralo AI may update this Refund and Cancellation Policy when the product, pricing, payment method, applicable requirements, or operating model changes.",
      "The policy displayed at the time of purchase will normally apply to that purchase, except where a later change is required by law or is more favourable to the user.",
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
            This policy explains the current cancellation process,
            refund-request window, eligibility conditions, review
            process, and expected payment-provider timelines for
            Viralo AI purchases.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-xs text-zinc-300">
              <Clock3 className="h-3.5 w-3.5 text-cyan-200" />
              Last updated: {LAST_UPDATED}
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-xs text-zinc-300">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-200" />
              Original payment method only
            </span>
          </div>
        </header>

        <div className="mt-6 rounded-3xl border border-amber-300/20 bg-amber-300/[0.07] p-5 text-sm leading-7 text-amber-50">
          <p className="font-semibold text-amber-100">
            Current operating status
          </p>

          <p className="mt-2 text-amber-50/80">
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
            Request billing or refund support
          </h2>

          <p className="mt-2 text-sm leading-7 text-zinc-300">
            Send the request from your registered account email and
            include the Razorpay payment ID or order ID.
          </p>

          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Viralo AI Refund Request`}
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