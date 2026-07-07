import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db } from "./firebase";

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uploadDataUrlToCloudinary(imageDataUrl) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary env missing. Add cloud name and upload preset.");
  }

  console.log("Uploading image to Cloudinary...", {
    cloudName,
    uploadPreset,
  });

  const formData = new FormData();
  formData.append("file", imageDataUrl);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "viral-mind-thumbnails");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json().catch(() => ({}));

  console.log("Cloudinary upload response:", data);

  if (!response.ok) {
    throw new Error(data?.error?.message || "Cloudinary upload failed");
  }

  if (!data.secure_url) {
    throw new Error("Cloudinary uploaded but secure_url not returned.");
  }

  return {
    imageUrl: data.secure_url,
    publicId: data.public_id,
  };
}

export async function saveGeneratedThumbnail({
  userId,
  topic,
  imageDataUrl,
  prompt = "",
  model = "",
  videoTitle = "",
}) {
  if (!userId) {
    throw new Error("User not found. Login required.");
  }

  if (!imageDataUrl) {
    throw new Error("Generated image not found.");
  }

  const topicKey = slugify(topic || "thumbnail");
  const createdAtMs = Date.now();

  const uploaded = await uploadDataUrlToCloudinary(imageDataUrl);

  const payload = {
    userId,
    topic: topic || "",
    topicKey,
    videoTitle: videoTitle || "",
    prompt: prompt || "",
    model: model || "",
    imageUrl: uploaded.imageUrl,
    publicId: uploaded.publicId,
    provider: "cloudinary",
    createdAt: serverTimestamp(),
    createdAtMs,
  };

  console.log("Saving thumbnail metadata to Firestore...", payload);

  const docRef = await addDoc(
    collection(db, "content_pack_thumbnails"),
    payload
  );

  console.log("Firestore thumbnail saved:", docRef.id);

  return {
    id: docRef.id,
    ...payload,
  };
}

export async function getSavedThumbnailsByTopic({ userId, topic }) {
  if (!userId || !topic) {
    return [];
  }

  const topicKey = slugify(topic);

  console.log("Fetching saved thumbnails from Firestore...", {
    userId,
    topic,
    topicKey,
  });

  const q = query(
    collection(db, "content_pack_thumbnails"),
    where("userId", "==", userId)
  );

  const snapshot = await getDocs(q);

  const items = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  console.log("Firestore thumbnails found:", items);

  return items
    .filter((item) => item.topicKey === topicKey)
    .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
}