import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";

import { auth, db } from "./firebase";

async function uploadProfileImageToCloudinary(imageFile) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary env missing.");
  }

  const formData = new FormData();
  formData.append("file", imageFile);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "viral-mind-profile-images");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || "Profile image upload failed");
  }

  return {
    imageUrl: data.secure_url,
    publicId: data.public_id,
  };
}

export async function getUserProfile(userId) {
  if (!userId) return null;

  const ref = doc(db, "app_users", userId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function upsertUserProfile(user, extraData = {}) {
  if (!user?.uid) {
    throw new Error("User not found");
  }

  const ref = doc(db, "app_users", user.uid);

  const payload = {
    uid: user.uid,
    email: user.email || "",
    name: user.displayName || "",
    photoURL: user.photoURL || "",
    plan: "free",
    status: "active",
    updatedAt: serverTimestamp(),
    ...extraData,
  };

  await setDoc(
    ref,
    {
      createdAt: serverTimestamp(),
      ...payload,
    },
    { merge: true }
  );

  return payload;
}

export async function updateUserProfile({
  userId,
  name,
  bio,
  creatorNiche,
  defaultPlatform,
  defaultAudience,
  website,
  company,
  photoFile,
}) {
  const currentUser = auth.currentUser;

  if (!currentUser || currentUser.uid !== userId) {
    throw new Error("Unauthorized user");
  }

  let uploadedPhoto = null;

  if (photoFile) {
    uploadedPhoto = await uploadProfileImageToCloudinary(photoFile);
  }

  const finalPhotoURL = uploadedPhoto?.imageUrl || currentUser.photoURL || "";

  await updateProfile(currentUser, {
    displayName: name || "",
    photoURL: finalPhotoURL,
  });

  const payload = {
    uid: userId,
    email: currentUser.email || "",
    name: name || "",
    bio: bio || "",
    creatorNiche: creatorNiche || "",
    defaultPlatform: defaultPlatform || "YouTube",
    defaultAudience: defaultAudience || "New creators",
    website: website || "",
    company: company || "",
    photoURL: finalPhotoURL,
    photoPublicId: uploadedPhoto?.publicId || "",
    plan: "free",
    status: "active",
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "app_users", userId), payload, { merge: true });

  return payload;
}