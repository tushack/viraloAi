const APIFY_API_BASE_URL = "https://api.apify.com/v2";

function getApifyToken() {
  const token = process.env.APIFY_TOKEN;

  if (!token) {
    throw new Error("APIFY_TOKEN is missing in backend .env");
  }

  return token;
}

function getYouTubeActorId() {
  return process.env.APIFY_YOUTUBE_ACTOR_ID || "solidcode/youtube-scraper";
}

function getApifyActorPath(actorId) {
  return actorId.replace("/", "~");
}

function buildYouTubeSearchUrl(query) {
  const cleanQuery = String(query || "").trim();
  const encodedQuery = encodeURIComponent(cleanQuery).replace(/%20/g, "+");

  return `https://www.youtube.com/results?search_query=${encodedQuery}`;
}

function extractYouTubeHandle(value) {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) return "";

  if (cleanValue.startsWith("@")) {
    return cleanValue;
  }

  const handleMatch = cleanValue.match(/youtube\.com\/@([^/?#]+)/i);

  if (handleMatch?.[1]) {
    return `@${handleMatch[1]}`;
  }

  return "";
}

async function runApifyYouTubeSearch({
  query,
  maxResults = 10,
  country = "in",
  language = "en",
  sortBy = "relevance",
  uploadDate = "any",
  includeShorts = false,
}) {
  const token = getApifyToken();
  const actorId = getYouTubeActorId();
  const actorPath = getApifyActorPath(actorId);

  const input = {
    searchQueries: [query],
    startUrls: [],
    youtubeHandles: [],
    getTrending: false,
    maxResults,
    includeShorts,
    fetchChannelInfo: false,
    country,
    language,
    sortBy,
    uploadDate,
  };

  const url = `${APIFY_API_BASE_URL}/acts/${actorPath}/run-sync-get-dataset-items?timeout=180&memory=1024&clean=true`;

  console.log("Running Apify actor:", actorId);
  console.log("Apify search input:", JSON.stringify(input, null, 2));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Apify API error:", JSON.stringify(data, null, 2));

    throw new Error(
      data?.error?.message || "Failed to fetch data from Apify YouTube scraper"
    );
  }

  console.log("Apify items found:", Array.isArray(data) ? data.length : 0);

  if (Array.isArray(data) && data.length > 0) {
    console.log("First Apify search item:", JSON.stringify(data[0], null, 2));
  }

  return Array.isArray(data) ? data : [];
}

async function runApifyYouTubeTrending({
  maxResults = 36,
  country = "in",
  language = "en",
}) {
  const token = getApifyToken();
  const actorId = getYouTubeActorId();
  const actorPath = getApifyActorPath(actorId);

  const input = {
    searchQueries: [],
    startUrls: [],
    youtubeHandles: [],
    getTrending: true,
    maxResults,
    includeShorts: false,
    fetchChannelInfo: false,
    country,
    language,
  };

  const url = `${APIFY_API_BASE_URL}/acts/${actorPath}/run-sync-get-dataset-items?timeout=180&memory=1024&clean=true`;

  console.log("Running Apify trending actor:", actorId);
  console.log("Apify trending input:", JSON.stringify(input, null, 2));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Apify trending API error:", JSON.stringify(data, null, 2));

    throw new Error(
      data?.error?.message ||
        "Failed to fetch live YouTube trending data from Apify."
    );
  }

  console.log(
    "Apify trending items found:",
    Array.isArray(data) ? data.length : 0
  );

  return Array.isArray(data) ? data : [];
}

async function runApifyYouTubeChannelAnalysis({ channelUrl, maxResults = 30 }) {
  const token = getApifyToken();
  const actorId = getYouTubeActorId();
  const actorPath = getApifyActorPath(actorId);

  const cleanChannelUrl = String(channelUrl || "").trim();
  const handle = extractYouTubeHandle(cleanChannelUrl);

  const input = {
    searchQueries: [],
    startUrls: cleanChannelUrl.startsWith("http") ? [cleanChannelUrl] : [],
    youtubeHandles: handle ? [handle] : [],
    getTrending: false,
    maxResults,
    includeShorts: false,
    fetchChannelInfo: true,
    country: "in",
    language: "en",
  };

  if (!input.startUrls.length && !input.youtubeHandles.length) {
    throw new Error("Please enter a valid YouTube channel URL or @handle");
  }

  const url = `${APIFY_API_BASE_URL}/acts/${actorPath}/run-sync-get-dataset-items?timeout=180&memory=1024&clean=true`;

  console.log("Running Apify channel analysis actor:", actorId);
  console.log("Apify channel input:", JSON.stringify(input, null, 2));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Apify channel API error:", JSON.stringify(data, null, 2));

    throw new Error(
      data?.error?.message || "Failed to analyze YouTube channel"
    );
  }

  console.log("Apify channel items found:", Array.isArray(data) ? data.length : 0);

  if (Array.isArray(data) && data.length > 0) {
    console.log("First channel item:", JSON.stringify(data[0], null, 2));
    console.log("All channel items:", JSON.stringify(data.slice(0, 3), null, 2));
  }

  return Array.isArray(data) ? data : [];
}

module.exports = {
  runApifyYouTubeSearch,
  runApifyYouTubeTrending,
  runApifyYouTubeChannelAnalysis,
};