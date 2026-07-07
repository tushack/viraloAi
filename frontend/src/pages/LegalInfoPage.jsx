import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileText,
  Mail,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";

const SUPPORT_EMAIL =
  String(import.meta.env.VITE_SUPPORT_EMAIL || "").trim() ||
  "support@viraloai.com";

const BUSINESS_NAME =
  String(import.meta.env.VITE_BUSINESS_LEGAL_NAME || "").trim() ||
  "Viralo AI";

const BUSINESS_ADDRESS = String(
  import.meta.env.VITE_BUSINESS_ADDRESS || ""
).trim();

const LAST_UPDATED = "July 5, 2026";

const PAGE_CONTENT = {
  about: {
    eyebrow: "Company Information",
    title: "About Viralo AI",
    description:
      "Viralo AI is a SaaS platform built to help creators and social-media teams research public trends, develop content ideas, plan content, and improve their creator workflow.",
    icon: Building2,
    sections: [
      {
        title: "What we provide",
        paragraphs: [
          "Viralo AI provides software tools for public social-media trend research, content planning, content-idea generation, thumbnail workflows, and creator productivity.",
          "Our product is designed to help users make better content decisions with organised research and AI-assisted workflows.",
        ],
      },
      {
        title: "What Viralo AI is not",
        paragraphs: [
          "Viralo AI does not operate or facilitate gambling, betting, fantasy sports, real-money gaming, paid contests, prize payouts, virtual currency, wallets, or gaming credits.",
        ],
      },
      {
        title: "Our purpose",
        paragraphs: [
          "We focus on practical tools that help creators and teams move from an idea to a clearer content plan. We aim to provide a reliable, easy-to-use platform with transparent policies and support.",
        ],
      },
    ],
  },

  contact: {
    eyebrow: "Support & Business Contact",
    title: "Contact Us",
    description:
      "For product support, billing questions, account help, privacy requests, or business enquiries, contact the Viralo AI team using the details below.",
    icon: Mail,
    sections: [
      {
        title: "Support email",
        paragraphs: [
          "For account and product support, email us at the address below. Please include the email address registered with your Viralo AI account so that we can assist you faster.",
        ],
        contactType: "email",
      },
      {
        title: "Business information",
        paragraphs: [
          "Business and compliance enquiries are handled through the same support channel. We reply during our normal business working hours.",
        ],
        contactType: "address",
      },
      {
        title: "Typical support topics",
        bullets: [
          "Account access and profile support",
          "Subscription, billing, cancellation, and refund enquiries",
          "Product feedback and feature requests",
          "Privacy, data export, and account-deletion requests",
          "Business, compliance, and partnership enquiries",
        ],
      },
    ],
  },

  terms: {
    eyebrow: "Legal",
    title: "Terms of Service",
    description:
      "These Terms of Service explain the rules for using Viralo AI and the responsibilities of users who access the platform.",
    icon: FileText,
    sections: [
      {
        title: "1. Acceptance of these terms",
        paragraphs: [
          "By creating an account, subscribing to a plan, or using Viralo AI, you agree to these Terms of Service and our Privacy Policy. Do not use the platform if you do not agree with them.",
        ],
      },
      {
        title: "2. Our service",
        paragraphs: [
          "Viralo AI is a software-as-a-service platform for social-media research, content planning, AI-assisted content workflows, and creator productivity. Features may change, improve, or be retired as the product evolves.",
        ],
      },
      {
        title: "3. Accounts and security",
        paragraphs: [
          "You are responsible for keeping your sign-in credentials secure and for activity performed through your account. You must provide accurate information and notify us promptly if you believe your account has been accessed without permission.",
        ],
      },
      {
        title: "4. Paid plans, cancellation, and refunds",
        paragraphs: [
          "Where a paid plan is available, the applicable price, billing cycle, and included features are shown before checkout. You may request cancellation or billing support by contacting us at the support email shown on this website.",
          "Refund eligibility, where applicable, is assessed according to the plan purchased, usage of the service, and applicable law. We do not provide refunds for services already substantially used except where required by law.",
        ],
      },
      {
        title: "5. Acceptable use",
        bullets: [
          "Use Viralo AI only for lawful purposes and in compliance with applicable platform rules.",
          "Do not use the service to create, promote, facilitate, or process gambling, betting, fantasy sports, real-money gaming, paid contests, prize payouts, virtual wallets, or gaming credits.",
          "Do not attempt to bypass security controls, access another user’s data, overload the platform, or reverse engineer protected parts of the service.",
          "Do not upload illegal, malicious, infringing, or harmful content.",
        ],
      },
      {
        title: "6. Content and third-party platforms",
        paragraphs: [
          "You remain responsible for the content you create, publish, upload, or use. Viralo AI may use public information and third-party services to provide features, but users must comply with the terms of every platform they connect to or use.",
        ],
      },
      {
        title: "7. Suspension or termination",
        paragraphs: [
          "We may restrict or suspend access where we reasonably believe there is fraud, abuse, a security risk, unlawful conduct, or a breach of these Terms.",
        ],
      },
      {
        title: "8. Changes and contact",
        paragraphs: [
          "We may update these Terms when our product, legal requirements, or operations change. The latest version will be published on this page. For questions, contact the support team.",
        ],
      },
    ],
  },

  privacy: {
    eyebrow: "Legal",
    title: "Privacy Policy",
    description:
      "This Privacy Policy explains how Viralo AI collects, uses, stores, and protects personal information when you use the platform.",
    icon: ShieldCheck,
    sections: [
      {
        title: "1. Information we collect",
        bullets: [
          "Account details such as name, email address, profile information, and authentication identifiers.",
          "Service data such as saved ideas, research history, content plans, uploaded files, and account preferences.",
          "Technical data such as browser/device information, IP-related security signals, and product usage events.",
          "Payment-related status information supplied by our payment providers. We do not store full card details on our own servers.",
        ],
      },
      {
        title: "2. How we use information",
        bullets: [
          "To create and secure your account.",
          "To provide, maintain, and improve Viralo AI features.",
          "To process subscriptions and respond to support requests.",
          "To prevent fraud, abuse, and unauthorised access.",
          "To meet legal obligations and enforce our Terms of Service.",
        ],
      },
      {
        title: "3. When we share information",
        paragraphs: [
          "We use trusted service providers for services such as authentication, cloud storage, hosting, AI functionality, analytics, customer support, and payment processing. We share only the information needed for them to provide those services.",
          "We may also disclose information where required by law, to protect users and the platform, or in connection with a business transfer.",
        ],
      },
      {
        title: "4. Data retention and deletion",
        paragraphs: [
          "We retain data only for as long as necessary to provide the service, meet legal obligations, resolve disputes, and enforce agreements. You may request access, correction, export, or deletion of your account data through our support channel, subject to applicable law and security checks.",
        ],
      },
      {
        title: "5. Security",
        paragraphs: [
          "We use reasonable technical and organisational safeguards to protect information. No online service can guarantee absolute security, so users should also protect their credentials and avoid sharing access to their account.",
        ],
      },
      {
        title: "6. Policy updates",
        paragraphs: [
          "We may update this Privacy Policy from time to time. The latest version and update date will always appear on this page.",
        ],
      },
    ],
  },
};

const RELATED_PAGES = [
  { label: "About Us", path: "/about" },
  { label: "Contact Us", path: "/contact" },
  { label: "Terms of Service", path: "/terms" },
  { label: "Privacy Policy", path: "/privacy" },
];

export default function LegalInfoPage({ pageKey }) {
  const page = PAGE_CONTENT[pageKey] || PAGE_CONTENT.about;
  const Icon = page.icon;

  return (
    <DashboardLayout
      eyebrow={page.eyebrow}
      title={page.title}
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

        <header className="mt-3 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] via-cyan-300/[0.07] to-blue-500/[0.06] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
            <Icon className="h-6 w-6 text-cyan-200" />
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
            {page.eyebrow}
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
            {page.title}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
            {page.description}
          </p>

          <p className="mt-5 text-xs text-zinc-500">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        <div className="mt-6 space-y-4">
          {page.sections.map((section) => (
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

              {section.contactType === "email" ? (
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
                >
                  <Mail className="h-4 w-4" />
                  {SUPPORT_EMAIL}
                </a>
              ) : null}

              {section.contactType === "address" ? (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-zinc-300">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                  <span>
                    <strong className="font-semibold text-white">
                      {BUSINESS_NAME}
                    </strong>
                    <br />
                    {BUSINESS_ADDRESS ||
                      "Add your registered business address through VITE_BUSINESS_ADDRESS before production deployment."}
                  </span>
                </div>
              ) : null}
            </section>
          ))}
        </div>

        <footer className="mt-8 border-t border-white/10 py-7">
          <p className="text-sm font-semibold text-white">Explore Viralo AI</p>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {RELATED_PAGES.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-sm text-zinc-400 transition hover:text-cyan-200"
              >
                {item.label}
              </Link>
            ))}

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
