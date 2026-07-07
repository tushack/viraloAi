import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  Loader2,
  Mail,
  MapPin,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { submitContactMessage } from "../lib/api";

const SUPPORT_EMAIL =
  String(import.meta.env.VITE_SUPPORT_EMAIL || "").trim() ||
  "support@viraloai.com";

const BUSINESS_NAME =
  String(import.meta.env.VITE_BUSINESS_LEGAL_NAME || "").trim() ||
  "Viralo AI";

const BUSINESS_ADDRESS = String(
  import.meta.env.VITE_BUSINESS_ADDRESS || ""
).trim();

const EMPTY_FORM = {
  fullName: "",
  email: "",
  message: "",
  // Honeypot: real users never see or fill this field.
  website: "",
};

function getDisplayName(user) {
  return String(user?.displayName || "").trim();
}

export default function ContactUs() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setForm((current) => ({
      ...current,
      fullName: current.fullName || getDisplayName(user),
      email: current.email || String(user?.email || "").trim(),
    }));
  }, [user?.displayName, user?.email, user?.uid]);

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      message: form.message.trim(),
      website: form.website,
    };

    if (payload.fullName.length < 2) {
      setFormError("Please enter your full name.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(payload.email)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    if (payload.message.length < 10) {
      setFormError("Please write a message of at least 10 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await submitContactMessage(payload);

      setSuccessMessage(
        result?.message ||
          "Thanks for contacting us. Our team will get back to you soon."
      );

      setForm((current) => ({
        ...EMPTY_FORM,
        fullName: current.fullName,
        email: current.email,
      }));
    } catch (error) {
      setFormError(
        error?.message ||
          "We could not send your message. Please try again shortly."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      eyebrow="Support & Business Contact"
      title="Contact Us"
      hideHeaderAction
    >
      <section className="mx-auto max-w-5xl">
        <Link
          to="/help"
          className="inline-flex items-center gap-2 rounded-xl px-1 py-2 text-sm font-medium text-zinc-400 transition hover:text-cyan-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Help & Legal
        </Link>

        <div className="mt-3 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-300/10 via-blue-500/[0.06] to-violet-500/[0.08] p-6 shadow-2xl shadow-cyan-950/20 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10">
              <CircleHelp className="h-6 w-6 text-cyan-200" />
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
              Viralo AI Support
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
              We are here to help.
            </h1>

            <p className="mt-3 text-sm leading-7 text-zinc-300 sm:text-base">
              Send your question, feedback, billing enquiry, privacy request, or
              business enquiry. Our support team will review your message and
              reply to the email you provide.
            </p>

            <div className="mt-7 space-y-4">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 transition hover:border-cyan-300/25 hover:bg-white/[0.04]"
              >
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                <span>
                  <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Support email
                  </span>
                  <span className="mt-1 block text-sm font-medium text-white">
                    {SUPPORT_EMAIL}
                  </span>
                </span>
              </a>

              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/10 p-4">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                <span>
                  <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Business details
                  </span>
                  <span className="mt-1 block text-sm font-medium text-white">
                    {BUSINESS_NAME}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-zinc-400">
                    {BUSINESS_ADDRESS ||
                      "Add your registered business address before production deployment."}
                  </span>
                </span>
              </div>

              <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/10 p-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                <p className="text-sm leading-6 text-zinc-400">
                  Your message is stored securely for support handling. Please do
                  not send passwords, card numbers, OTPs, or other highly
                  sensitive information in this form.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/10">
              <Send className="h-5 w-5 text-cyan-200" />
            </div>

            <h2 className="mt-5 text-xl font-semibold text-white">
              Send us a message
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Fields marked with * are required.
            </p>

            {successMessage ? (
              <div
                role="status"
                className="mt-5 flex gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{successMessage}</span>
              </div>
            ) : null}

            {formError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm leading-6 text-red-100"
              >
                {formError}
              </div>
            ) : null}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label
                  htmlFor="contact-full-name"
                  className="mb-2 block text-sm font-medium text-zinc-200"
                >
                  Full Name *
                </label>
                <input
                  id="contact-full-name"
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={updateField}
                  maxLength={120}
                  autoComplete="name"
                  placeholder="Enter your full name"
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/10"
                  disabled={submitting}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="mb-2 block text-sm font-medium text-zinc-200"
                >
                  Email Address *
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField}
                  maxLength={320}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/10"
                  disabled={submitting}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="mb-2 block text-sm font-medium text-zinc-200"
                >
                  Message *
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={form.message}
                  onChange={updateField}
                  minLength={10}
                  maxLength={5000}
                  rows={7}
                  placeholder="Tell us how we can help you..."
                  className="w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/10"
                  disabled={submitting}
                  required
                />
                <p className="mt-1.5 text-right text-xs text-zinc-500">
                  {form.message.length}/5000
                </p>
              </div>

              <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  name="website"
                  type="text"
                  value={form.website}
                  onChange={updateField}
                  tabIndex="-1"
                  autoComplete="off"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-blue-400 px-4 text-sm font-semibold text-slate-950 hover:from-cyan-200 hover:to-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending message...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
