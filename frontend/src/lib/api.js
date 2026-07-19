import { auth } from "./firebase";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function createApiError(data, statusCode, fallbackMessage) {
  const error = new Error(data?.message || fallbackMessage);

  error.statusCode = statusCode;
  error.code = data?.code || "";
  error.upgrade = data?.upgrade || null;

  return error;
}

async function getAuthHeaders() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Please login first.");
  }

  const token = await currentUser.getIdToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}


export async function getDailyNicheIdeas({
  niche = "",
  platform = "YouTube",
  audience = "New creators",
  limit = 20,
  forceRefresh = false,
} = {}) {
  const params = new URLSearchParams();

  if (niche) params.set("niche", niche);
  if (platform) params.set("platform", platform);
  if (audience) params.set("audience", audience);

  params.set("limit", String(limit));
  params.set("forceRefresh", forceRefresh ? "true" : "false");

  const response = await fetch(`${API_BASE_URL}/research/daily?${params}`, {
    headers: await getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createApiError(data, response.status, "Failed to fetch daily niche ideas");
  }

  return data;
}

export async function getTopYouTubeChannels({
  niche,
  limit = 4,
} = {}) {
  const cleanNiche = String(niche || "").trim();

  if (!cleanNiche) {
    throw new Error("Niche is required to load YouTube channels.");
  }

  const params = new URLSearchParams({
    niche: cleanNiche,
    limit: String(limit),
  });

  const response = await fetch(
    `${API_BASE_URL}/research/top-channels?${params.toString()}`,
    {
      headers: await getAuthHeaders(),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch YouTube channels.");
  }

  return data;
}

export async function generateResearch(payload) {
  const response = await fetch(`${API_BASE_URL}/research/generate`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to generate research");
  }

  return data;
}

export async function getSavedIdeas() {
  const response = await fetch(`${API_BASE_URL}/saved-ideas`, {
    headers: await getAuthHeaders(),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch saved ideas");
  }

  return data;
}

export async function saveIdea(payload) {
  const response = await fetch(`${API_BASE_URL}/saved-ideas`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to save idea");
  }

  return data;
}

export async function deleteSavedIdea(id) {
  const response = await fetch(`${API_BASE_URL}/saved-ideas/${id}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete idea");
  }

  return data;
}

export async function getResearchHistory() {
  const response = await fetch(`${API_BASE_URL}/research/history`, {
    headers: await getAuthHeaders(),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch research history");
  }

  return data;
}

export async function analyzeCompetitorChannel(payload) {
  const response = await fetch(`${API_BASE_URL}/research/analyze-channel`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, response.status, "Failed to analyze competitor channel");
  }

  return data;
}

export async function createContentPack(payload) {
  const response = await fetch(`${API_BASE_URL}/research/content-pack`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create content pack");
  }

  return data;
}

export async function generateAiThumbnail(payload) {
  const response = await fetch(`${API_BASE_URL}/research/thumbnail`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to generate AI thumbnail");
  }

  return data;
}

export async function deleteSelectedRecords(targets) {
  const response = await fetch(`${API_BASE_URL}/data-privacy/delete-records`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ targets }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete selected records");
  }

  return data;
}

export async function requestDeleteAccountOtp() {
  const response = await fetch(
    `${API_BASE_URL}/data-privacy/delete-account-code`,
    {
      method: "POST",
      headers: await getAuthHeaders(),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to send verification code");
  }

  return data;
}

export async function confirmDeleteAccount(code) {
  const response = await fetch(`${API_BASE_URL}/data-privacy/delete-account`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ code }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete account");
  }

  return data;
}

export async function getYoutubeAuthUrl() {
  const response = await fetch(`${API_BASE_URL}/youtube/auth-url`, {
    method: "GET",
    headers: await getAuthHeaders(),
    // Required for the short-lived HttpOnly OAuth browser-binding cookie.
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to start YouTube connect.");
  }

  return data;
}

export async function getYoutubeConnection() {
  const response = await fetch(`${API_BASE_URL}/youtube/connection`, {
    method: "GET",
    headers: await getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch YouTube connection.");
  }

  return data;
}

export async function disconnectYoutubeConnection() {
  const response = await fetch(`${API_BASE_URL}/youtube/connection`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to disconnect YouTube.");
  }

  return data;
}

export async function applyYoutubeReadyKit(payload) {
  const response = await fetch(`${API_BASE_URL}/youtube/apply-kit`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to apply YouTube Ready Kit.");
  }

  return data;
}

export async function analyzeViralPotential(payload) {
  const response = await fetch(`${API_BASE_URL}/viral-check/analyze`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to analyze viral potential");
  }

  return data;
}


export async function getTrendFeed(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  });

  const response = await fetch(`${API_BASE_URL}/trends/feed?${params}`, {
    headers: await getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to load live trends.");
  }

  return data;
}

export async function searchTrendTopics(payload) {
  const response = await fetch(`${API_BASE_URL}/trends/search`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createApiError(data, response.status, "Failed to search live trends.");
  }

  return data;
}


function getDownloadFileName(contentDisposition, fallbackName) {
  const encodedMatch = String(contentDisposition || "").match(
    /filename\*=UTF-8''([^;]+)/i
  );

  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch {
      return fallbackName;
    }
  }

  const normalMatch = String(contentDisposition || "").match(
    /filename="?([^";]+)"?/i
  );

  return normalMatch?.[1] || fallbackName;
}

export async function previewYoutubeVideo(payload) {
  const response = await fetch(`${API_BASE_URL}/media-exports/youtube-preview`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Could not load YouTube preview.");
  }

  return data;
}

export async function convertOwnedMedia({
  file,
  outputType,
  videoQuality,
  audioBitrate,
  rightsAcknowledged,
  youtubeUrl,
  youtubeVideoId,
  youtubeTitle,
  onUploadProgress,
}) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Please login first.");
  }
  const hasYoutubeSource =
    Boolean(String(youtubeUrl || "").trim()) ||
    Boolean(String(youtubeVideoId || "").trim());

  if (!file && !hasYoutubeSource) {
    throw new Error("Paste a YouTube link or upload an original video first.");
  }

  const token = await currentUser.getIdToken();
  const formData = new FormData();

  if (file) {
    formData.append("file", file);
  }
  formData.append("outputType", outputType || "video");
  formData.append("videoQuality", videoQuality || "original");
  formData.append("audioBitrate", String(audioBitrate || 192));
  formData.append("rightsAcknowledged", String(Boolean(rightsAcknowledged)));
  formData.append("youtubeUrl", youtubeUrl || "");
  formData.append("youtubeVideoId", youtubeVideoId || "");
  formData.append("youtubeTitle", youtubeTitle || "");

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("POST", `${API_BASE_URL}/media-exports/convert`);
    request.setRequestHeader("Authorization", `Bearer ${token}`);

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onUploadProgress !== "function") {
        return;
      }

      onUploadProgress(Math.round((event.loaded / event.total) * 100));
    };

    request.onerror = () => {
      reject(new Error("Network error while uploading your original video."));
    };

    request.onload = () => {
      let data = {};

      try {
        data = request.responseText ? JSON.parse(request.responseText) : {};
      } catch {
        data = {};
      }

      if (request.status < 200 || request.status >= 300) {
        reject(
          createApiError(
            data,
            request.status,
            "Could not export this media file."
          )
        ); return;
      }

      resolve(data);
    };

    request.send(formData);
  });
}

export async function getMediaExports() {
  const response = await fetch(`${API_BASE_URL}/media-exports`, {
    headers: await getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Could not load media export history.");
  }

  return data;
}

export async function submitContactMessage(payload) {
  const headers = {
    "Content-Type": "application/json",
  };

  // Contact form also works for visitors. For signed-in users, attach a fresh
  // Firebase token so the backend can securely link the support message to
  // their account UID without trusting any browser-provided UID field.
  const currentUser = auth.currentUser;

  if (currentUser) {
    const token = await currentUser.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/contact/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createApiError(
      data,
      response.status,
      "Could not send your message. Please try again shortly."
    );
  }

  return data;
}

export async function downloadMediaExport(item) {
  const response = await fetch(
    `${API_BASE_URL}/media-exports/${item.id}/download`,
    {
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Could not download this media export.");
  }

  const fileBlob = await response.blob();
  const objectUrl = URL.createObjectURL(fileBlob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = getDownloadFileName(
    response.headers.get("content-disposition"),
    item.outputName || "media-export"
  );

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function deleteMediaExport(exportId) {
  const response = await fetch(`${API_BASE_URL}/media-exports/${exportId}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Could not delete media export.");
  }

  return data;
}
// ---------------------------------------------------------------------------
// Content Calendar API
// ---------------------------------------------------------------------------
async function calendarRequest(path = "", { method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE_URL}/calendar${path}`, {
    method,
    headers: await getAuthHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Calendar request failed.");
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

export async function getCalendarEvents() {
  return calendarRequest("/");
}

export async function createCalendarEvent(payload) {
  return calendarRequest("/", {
    method: "POST",
    body: payload,
  });
}

export async function updateCalendarEvent(eventId, payload) {
  if (!eventId) {
    throw new Error("Calendar event ID is required.");
  }

  return calendarRequest(`/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteCalendarEvent(eventId) {
  if (!eventId) {
    throw new Error("Calendar event ID is required.");
  }

  return calendarRequest(`/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
}

export async function markCalendarReminderSent(
  eventId,
  channel = "browser"
) {
  if (!eventId) {
    throw new Error("Calendar event ID is required.");
  }

  return calendarRequest(`/${encodeURIComponent(eventId)}/reminder-sent`, {
    method: "PATCH",
    body: { channel },
  });
}

// ---------------------------------------------------------------------------
// Admin API
// Every request below is additionally protected by requireFirebaseAuth and
// requireAdmin on the backend. Do not rely on frontend route protection alone.
// ---------------------------------------------------------------------------
function buildQueryString(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      return;
    }

    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

async function adminRequest(path, { method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE_URL}/admin${path}`, {
    method,
    headers: await getAuthHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Admin request failed.");
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

export async function getAdminAccess() {
  return adminRequest("/access");
}

export async function getAdminOverview(days = 30) {
  return adminRequest(`/overview${buildQueryString({ days })}`);
}

export async function getAdminUsers({ search = "", page = 1, limit = 50 } = {}) {
  return adminRequest(`/users${buildQueryString({ search, page, limit })}`);
}

export async function getAdminUser(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  return adminRequest(`/users/${encodeURIComponent(userId)}`);
}


export async function updateAdminUserStatus(userId, disabled) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  return adminRequest(`/users/${encodeURIComponent(userId)}/status`, {
    method: "PATCH",
    body: { disabled: Boolean(disabled) },
  });
}

export async function addAdminUserNote(userId, note) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  return adminRequest(`/users/${encodeURIComponent(userId)}/notes`, {
    method: "POST",
    body: { note: String(note || "").trim() },
  });
}

export async function getAdminActivity({
  page = 1,
  limit = 50,
  module = "",
  status = "",
  userId = "",
} = {}) {
  return adminRequest(
    `/activity${buildQueryString({ page, limit, module, status, userId })}`
  );
}

export async function getAdminCalendarEvents({
  page = 1,
  limit = 50,
  status = "",
  userId = "",
} = {}) {
  return adminRequest(
    `/calendar-events${buildQueryString({ page, limit, status, userId })}`
  );
}

export async function getAdminMediaExports({
  page = 1,
  limit = 50,
  userId = "",
} = {}) {
  return adminRequest(
    `/media-exports${buildQueryString({ page, limit, userId })}`
  );
}


export async function getAdminPayments({
  page = 1,
  limit = 50,
  userId = "",
} = {}) {
  return adminRequest(
    `/payments${buildQueryString({
      page,
      limit,
      userId,
    })}`
  );
}

export async function getAdminAccounts() {
  return adminRequest("/admins");
}

export async function createAdminAccount(payload) {
  return adminRequest("/admins", {
    method: "POST",
    body: payload,
  });
}

export async function updateAdminAccount(adminId, payload) {
  if (!adminId) {
    throw new Error("Admin account ID is required.");
  }

  return adminRequest(`/admins/${encodeURIComponent(adminId)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteAdminAccount(adminId) {
  if (!adminId) {
    throw new Error("Admin account ID is required.");
  }

  return adminRequest(`/admins/${encodeURIComponent(adminId)}`, {
    method: "DELETE",
  });
}

export async function getAdminContactMessages({
  page = 1,
  limit = 25,
  status = "",
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (status) {
    params.set("status", status);
  }

  const response = await fetch(
    `${API_BASE_URL}/admin/contact-messages?${params.toString()}`,
    {
      headers: await getAuthHeaders(),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createApiError(
      data,
      response.status,
      "Could not load contact messages."
    );
  }

  return data;
}

export async function updateAdminContactMessageStatus(messageId, status) {
  const response = await fetch(
    `${API_BASE_URL}/admin/contact-messages/${encodeURIComponent(
      messageId
    )}/status`,
    {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ status }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createApiError(
      data,
      response.status,
      "Could not update contact message status."
    );
  }

  return data;
}