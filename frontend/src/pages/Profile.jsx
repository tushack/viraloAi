import React, { useEffect, useState } from "react";
import {
  Camera,
  Loader2,
  Mail,
  Save,
  Sparkles,
  User,
} from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import {
  getUserProfile,
  updateUserProfile,
  upsertUserProfile,
} from "../lib/profileStore";

export default function Settings() {
  const { user, authLoading, setAuthModalOpen } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    bio: "",
    creatorNiche: "",
    defaultPlatform: "YouTube",
    defaultAudience: "New creators",
    website: "",
    company: "",
    photoURL: "",
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const loadProfile = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      await upsertUserProfile(user);

      const profile = await getUserProfile(user.uid);

      setForm({
        name: profile?.name || user.displayName || "",
        email: profile?.email || user.email || "",
        bio: profile?.bio || "",
        creatorNiche: profile?.creatorNiche || "",
        defaultPlatform: profile?.defaultPlatform || "YouTube",
        defaultAudience: profile?.defaultAudience || "New creators",
        website: profile?.website || "",
        company: profile?.company || "",
        photoURL: profile?.photoURL || user.photoURL || "",
      });

      setPreviewImage(profile?.photoURL || user.photoURL || "");
    } catch (err) {
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      setAuthModalOpen(true);
      return;
    }

    loadProfile();
  }, [user, authLoading]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size should be less than 2MB.");
      return;
    }

    setPhotoFile(file);
    setPreviewImage(URL.createObjectURL(file));
    setError("");
  };

  const handleSave = async () => {
    if (!user?.uid) {
      setAuthModalOpen(true);
      return;
    }

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const updatedProfile = await updateUserProfile({
        userId: user.uid,
        name: form.name.trim(),
        bio: form.bio,
        creatorNiche: form.creatorNiche,
        defaultPlatform: form.defaultPlatform,
        defaultAudience: form.defaultAudience,
        website: form.website,
        company: form.company,
        photoFile,
      });

      setForm((current) => ({
        ...current,
        ...updatedProfile,
      }));

      setPreviewImage(updatedProfile.photoURL || "");
      setPhotoFile(null);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout eyebrow="Settings" title="Profile">
        <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
            Loading profile...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout eyebrow="Settings" title="Profile">
        <Card className="border-white/10 bg-white/[0.04]">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-white">
              Login required
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Please login to manage your profile.
            </p>

            <Button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="mt-6 rounded-full bg-cyan-300 px-6 text-sm font-semibold text-black hover:bg-cyan-200"
            >
              Login
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout eyebrow="Settings" title="Profile & preferences">
      <section className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
          Profile Settings
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Manage your creator profile, default research preferences, and account
          details.
        </p>
      </section>

      {message && (
        <p className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </p>
      )}

      {error && (
        <p className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05]">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt={form.name || "Profile"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-14 w-14 text-zinc-500" />
                  )}
                </div>

                <label className="absolute -bottom-3 -right-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300 text-black shadow-xl shadow-cyan-950/40 hover:bg-cyan-200">
                  <Camera className="h-5 w-5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>

              <h2 className="mt-6 text-xl font-semibold text-white">
                {form.name || "Your Name"}
              </h2>

              <p className="mt-1 text-sm text-zinc-500">{form.email}</p>

              <div className="mt-5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-200">
                Free Plan
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-cyan-300" />

                <div>
                  <p className="text-sm font-semibold text-white">
                    Creator Pro
                  </p>

                  <p className="text-xs leading-5 text-zinc-500">
                    Unlock YouTube analytics, saved image library and higher AI
                    limits.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                className="mt-4 h-10 w-full rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-zinc-200"
              >
                Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20">
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full Name">
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Enter your name"
                  className="profile-input"
                />
              </Field>

              <Field label="Email">
                <div className="profile-input flex items-center gap-3 text-zinc-400">
                  <Mail className="h-4 w-4 text-zinc-500" />
                  <span className="truncate">{form.email}</span>
                </div>
              </Field>
            </div>

            <Field label="Creator Bio">
              <textarea
                value={form.bio}
                onChange={(event) => updateField("bio", event.target.value)}
                placeholder="Write a short creator bio..."
                className="profile-input min-h-28 resize-none leading-6"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Creator Niche">
                <input
                  value={form.creatorNiche}
                  onChange={(event) =>
                    updateField("creatorNiche", event.target.value)
                  }
                  placeholder="AI tools, education, finance..."
                  className="profile-input"
                />
              </Field>

              <Field label="Company / Brand">
                <input
                  value={form.company}
                  onChange={(event) =>
                    updateField("company", event.target.value)
                  }
                  placeholder="Your brand name"
                  className="profile-input"
                />
              </Field>
            </div>

      

            <Field label="Website / Portfolio">
              <input
                value={form.website}
                onChange={(event) => updateField("website", event.target.value)}
                placeholder="https://yourwebsite.com"
                className="profile-input"
              />
            </Field>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="h-12 rounded-full bg-cyan-300 px-6 text-sm font-semibold text-black hover:bg-cyan-200"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>

      {children}
    </label>
  );
}