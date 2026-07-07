const { google } = require("googleapis");

const DEFAULT_RECENT_VIDEO_LIMIT = 30;
const MAX_RECENT_VIDEO_LIMIT = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

function cleanString(value, maxLength = 1000) {
  return String(value || "").trim().slice(0, maxLength);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getYouTubeDataApiKey() {
  const apiKey = cleanString(
    process.env.YOUTUBE_DATA_API_KEY ||
      process.env.YOUTUBE_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      "",
    500
  );

  if (!apiKey) {
    const error = new Error(
      "YOUTUBE_DATA_API_KEY is missing in backend/.env."
    );
    error.statusCode = 500;
    throw error;
  }

  return apiKey;
}

function createPublicYouTubeClient() {
  return google.youtube({
    version: "v3",
    auth: getYouTubeDataApiKey(),
  });
}

function toCount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

function formatCount(value) {
  const number = toCount(value);

  if (number >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toFixed(1)}B`;
  }

  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(1)}M`;
  }

  if (number >= 1_000) {
    return `${Math.round(number / 1_000)}K`;
  }

  return String(number);
}

function parseIsoDurationToSeconds(value) {
  const match = cleanString(value, 100).match(
    /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i
  );

  if (!match) return 0;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = Math.floor(total % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function toDate(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? null : date;
}

function getAgeDays(value) {
  const date = toDate(value);

  if (!date) return null;

  return Math.max(0, (Date.now() - date.getTime()) / DAY_MS);
}

function formatPublishedLabel(value) {
  const ageDays = getAgeDays(value);

  if (ageDays === null) return "Date unavailable";
  if (ageDays < 1) return "Today";
  if (ageDays < 2) return "1 day ago";
  if (ageDays < 7) return `${Math.round(ageDays)} days ago`;
  if (ageDays < 30) return `${Math.round(ageDays / 7)} weeks ago`;
  if (ageDays < 365) return `${Math.round(ageDays / 30)} months ago`;

  return `${Math.round(ageDays / 365)} years ago`;
}

function makeYoutubeApiError(requestError, fallbackMessage) {
  const statusCode = Number(
    requestError?.response?.status || requestError?.code || 502
  );

  const apiMessage = cleanString(
    requestError?.response?.data?.error?.message ||
      requestError?.message ||
      fallbackMessage,
    600
  );

  const error = new Error(apiMessage || fallbackMessage);
  error.statusCode = statusCode;
  return error;
}

function getChannelInputType(channelInput) {
  const raw = cleanString(channelInput, 1500);

  if (!raw) {
    const error = new Error("Paste a YouTube channel URL, channel ID, or @handle.");
    error.statusCode = 400;
    throw error;
  }

  if (/^UC[a-zA-Z0-9_-]{20,}$/.test(raw)) {
    return { type: "id", value: raw };
  }

  if (/^@[a-zA-Z0-9._-]{3,}$/.test(raw)) {
    return { type: "handle", value: raw };
  }

  let url;

  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    const error = new Error("Enter a valid YouTube channel URL or @handle.");
    error.statusCode = 400;
    throw error;
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

  if (
    hostname !== "youtube.com" &&
    hostname !== "m.youtube.com" &&
    hostname !== "music.youtube.com"
  ) {
    const error = new Error(
      "Please paste a YouTube channel URL, not a video or another website."
    );
    error.statusCode = 400;
    throw error;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const firstPart = cleanString(parts[0], 200);

  if (!firstPart) {
    const error = new Error("The YouTube channel URL is incomplete.");
    error.statusCode = 400;
    throw error;
  }

  if (firstPart.startsWith("@")) {
    return { type: "handle", value: firstPart };
  }

  if (firstPart === "channel" && parts[1]) {
    return { type: "id", value: cleanString(parts[1], 200) };
  }

  if (firstPart === "user" && parts[1]) {
    return { type: "username", value: cleanString(parts[1], 200) };
  }

  if (firstPart === "c" && parts[1]) {
    return { type: "query", value: cleanString(parts[1], 200) };
  }

  if (
    ["watch", "shorts", "playlist", "live", "feed", "results"].includes(
      firstPart
    )
  ) {
    const error = new Error(
      "Paste a YouTube channel URL or @handle. Video and playlist URLs cannot be analyzed as channels."
    );
    error.statusCode = 400;
    throw error;
  }

  // Covers older/custom YouTube channel URLs that do not contain /@, /channel, /user, or /c.
  return { type: "query", value: firstPart };
}

async function fetchChannelByFilter(youtube, filter) {
  const response = await youtube.channels.list({
    part: ["snippet", "statistics", "contentDetails"],
    ...filter,
    maxResults: 1,
  });

  return response.data.items?.[0] || null;
}

async function resolveYouTubeChannel(youtube, channelInput) {
  const parsed = getChannelInputType(channelInput);

  try {
    if (parsed.type === "id") {
      const channel = await fetchChannelByFilter(youtube, { id: parsed.value });

      if (!channel) {
        const error = new Error("No public YouTube channel was found for this channel ID.");
        error.statusCode = 404;
        throw error;
      }

      return channel;
    }

    if (parsed.type === "handle") {
      const channel = await fetchChannelByFilter(youtube, {
        forHandle: parsed.value,
      });

      if (!channel) {
        const error = new Error("No public YouTube channel was found for this @handle.");
        error.statusCode = 404;
        throw error;
      }

      return channel;
    }

    if (parsed.type === "username") {
      const channel = await fetchChannelByFilter(youtube, {
        forUsername: parsed.value,
      });

      if (!channel) {
        const error = new Error("No public YouTube channel was found for this username.");
        error.statusCode = 404;
        throw error;
      }

      return channel;
    }

    const searchResponse = await youtube.search.list({
      part: ["snippet"],
      q: parsed.value,
      type: ["channel"],
      maxResults: 5,
      safeSearch: "moderate",
    });

    const channelIds = (searchResponse.data.items || [])
      .map((item) => item?.id?.channelId)
      .filter(Boolean);

    if (!channelIds.length) {
      const error = new Error(
        "No public YouTube channel matched this URL. Paste the channel's @handle or /channel/UC... URL for the most reliable result."
      );
      error.statusCode = 404;
      throw error;
    }

    const detailsResponse = await youtube.channels.list({
      part: ["snippet", "statistics", "contentDetails"],
      id: channelIds.join(","),
      maxResults: Math.min(channelIds.length, 5),
    });

    const channels = detailsResponse.data.items || [];
    const normalizedQuery = parsed.value.toLowerCase().replace(/^@/, "");

    const exactMatch =
      channels.find((channel) => {
        const customUrl = cleanString(channel?.snippet?.customUrl, 300)
          .toLowerCase()
          .replace(/^@/, "");

        const title = cleanString(channel?.snippet?.title, 300)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        const queryWithoutSymbols = normalizedQuery.replace(/[^a-z0-9]/g, "");

        return (
          customUrl === normalizedQuery ||
          title === queryWithoutSymbols
        );
      }) || channels[0];

    if (!exactMatch) {
      const error = new Error(
        "No public YouTube channel matched this URL. Paste the channel's @handle or /channel/UC... URL."
      );
      error.statusCode = 404;
      throw error;
    }

    return exactMatch;
  } catch (error) {
    if (error?.statusCode) throw error;
    throw makeYoutubeApiError(error, "Failed to resolve the YouTube channel.");
  }
}

async function fetchChannelVideos(youtube, uploadsPlaylistId, maxResults) {
  if (!uploadsPlaylistId) return [];

  try {
    const playlistResponse = await youtube.playlistItems.list({
      part: ["snippet", "contentDetails"],
      playlistId: uploadsPlaylistId,
      maxResults: clamp(
        Number(maxResults) || DEFAULT_RECENT_VIDEO_LIMIT,
        1,
        MAX_RECENT_VIDEO_LIMIT
      ),
    });

    const orderedIds = (playlistResponse.data.items || [])
      .map((item) => item?.contentDetails?.videoId)
      .filter(Boolean);

    if (!orderedIds.length) return [];

    const detailsResponse = await youtube.videos.list({
      part: ["snippet", "statistics", "contentDetails"],
      id: orderedIds.join(","),
      maxResults: orderedIds.length,
    });

    const byId = new Map(
      (detailsResponse.data.items || []).map((video) => [video.id, video])
    );

    return orderedIds.map((videoId) => byId.get(videoId)).filter(Boolean);
  } catch (error) {
    throw makeYoutubeApiError(
      error,
      "Failed to retrieve public uploads for this YouTube channel."
    );
  }
}

function normalizePublicVideo(video) {
  const views = toCount(video?.statistics?.viewCount);
  const likes = toCount(video?.statistics?.likeCount);
  const comments = toCount(video?.statistics?.commentCount);
  const publishedAt = cleanString(video?.snippet?.publishedAt, 100);
  const durationSeconds = parseIsoDurationToSeconds(video?.contentDetails?.duration);

  return {
    id: cleanString(video?.id, 100),
    title: cleanString(video?.snippet?.title, 300) || "Untitled video",
    url: video?.id ? `https://www.youtube.com/watch?v=${video.id}` : "",
    thumbnail:
      cleanString(video?.snippet?.thumbnails?.maxres?.url, 1000) ||
      cleanString(video?.snippet?.thumbnails?.standard?.url, 1000) ||
      cleanString(video?.snippet?.thumbnails?.high?.url, 1000) ||
      cleanString(video?.snippet?.thumbnails?.medium?.url, 1000) ||
      cleanString(video?.snippet?.thumbnails?.default?.url, 1000),
    publishedAt,
    publishedLabel: formatPublishedLabel(publishedAt),
    durationSeconds,
    durationLabel: formatDuration(durationSeconds),
    views: formatCount(views),
    viewsRaw: views,
    likes: formatCount(likes),
    likesRaw: likes,
    comments: formatCount(comments),
    commentsRaw: comments,
    viewVelocity: Math.round(
      views / Math.max(1, getAgeDays(publishedAt) || 1)
    ),
  };
}

function calculateAverage(values) {
  const usable = (values || [])
    .map((value) => Number(value || 0))
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (!usable.length) return 0;

  return Math.round(
    usable.reduce((sum, value) => sum + value, 0) / usable.length
  );
}

function getUploadRatePerWeek(videos) {
  const dates = (videos || [])
    .map((video) => toDate(video.publishedAt))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime());

  if (dates.length < 2) {
    return dates.length ? 0.25 : 0;
  }

  const newest = dates[0].getTime();
  const oldest = dates[dates.length - 1].getTime();
  const spanDays = Math.max(7, (newest - oldest) / DAY_MS);

  return Number(((dates.length / spanDays) * 7).toFixed(1));
}

function calculateRecentMomentum(videos) {
  const ordered = [...(videos || [])].sort((first, second) => {
    return (
      (toDate(second.publishedAt)?.getTime() || 0) -
      (toDate(first.publishedAt)?.getTime() || 0)
    );
  });

  const groupSize = Math.min(10, Math.floor(ordered.length / 2));

  if (groupSize < 3) {
    return {
      percentage: null,
      label: "Not enough upload history",
      recentAverageDailyViews: 0,
      earlierAverageDailyViews: 0,
    };
  }

  const recent = ordered.slice(0, groupSize);
  const earlier = ordered.slice(groupSize, groupSize * 2);

  const recentAverageDailyViews = calculateAverage(
    recent.map((video) => video.viewVelocity)
  );

  const earlierAverageDailyViews = calculateAverage(
    earlier.map((video) => video.viewVelocity)
  );

  if (!earlierAverageDailyViews) {
    return {
      percentage: null,
      label: "Not enough public view history",
      recentAverageDailyViews,
      earlierAverageDailyViews,
    };
  }

  const percentage = clamp(
    Math.round(
      ((recentAverageDailyViews - earlierAverageDailyViews) /
        earlierAverageDailyViews) *
        100
    ),
    -99,
    999
  );

  return {
    percentage,
    label: `${percentage >= 0 ? "+" : ""}${percentage}%`,
    recentAverageDailyViews,
    earlierAverageDailyViews,
  };
}

function calculateOpportunityScore({
  avgViews,
  subscribers,
  uploadRatePerWeek,
  momentumPercentage,
  analyzedVideos,
}) {
  if (!analyzedVideos) return 0;

  const viewToSubscriberRatio =
    subscribers > 0 ? avgViews / subscribers : 0;

  const reachScore = clamp(viewToSubscriberRatio * 100, 0, 45);
  const consistencyScore = clamp(uploadRatePerWeek * 8, 0, 20);
  const coverageScore = clamp(analyzedVideos * 1.2, 0, 20);
  const momentumScore =
    momentumPercentage === null
      ? 7
      : clamp((momentumPercentage + 50) / 10, 0, 15);

  return Math.round(
    clamp(10 + reachScore + consistencyScore + coverageScore + momentumScore, 1, 100)
  );
}

function getOpportunityLabel(score) {
  if (score >= 75) return "Strong public performance";
  if (score >= 55) return "Steady public performance";
  if (score > 0) return "Emerging public performance";
  return "Not enough public data";
}

function buildChannelUrl(channel) {
  const customUrl = cleanString(channel?.snippet?.customUrl, 300);

  if (customUrl.startsWith("@")) {
    return `https://www.youtube.com/${customUrl}`;
  }

  return channel?.id
    ? `https://www.youtube.com/channel/${channel.id}`
    : "";
}

function buildCompetitorSummary({
  channel,
  subscribersLabel,
  totalViewsLabel,
  analyzedVideos,
  avgViewsLabel,
  recentMomentum,
  uploadRate,
}) {
  const channelName = cleanString(channel?.snippet?.title, "This channel");
  const hiddenSubscribers = Boolean(channel?.statistics?.hiddenSubscriberCount);

  const subscriberText = hiddenSubscribers
    ? "its subscriber count hidden"
    : `${subscribersLabel} subscribers`;

  const momentumText =
    recentMomentum?.percentage === null
      ? "There is not enough upload history yet to calculate a recent momentum signal."
      : `Recent daily-view velocity is ${recentMomentum.label} versus the earlier uploads in this public sample.`;

  return `${channelName} has ${subscriberText} and ${totalViewsLabel} public channel views. This analysis uses ${analyzedVideos} recent public uploads, with an average of ${avgViewsLabel} views per upload and an estimated upload rate of ${uploadRate}. ${momentumText}`;
}

async function analyzePublicYouTubeCompetitor({
  channelInput,
  maxResults = DEFAULT_RECENT_VIDEO_LIMIT,
}) {
  const youtube = createPublicYouTubeClient();
  const channel = await resolveYouTubeChannel(youtube, channelInput);

  const uploadPlaylistId =
    channel?.contentDetails?.relatedPlaylists?.uploads || "";

  const rawVideos = await fetchChannelVideos(
    youtube,
    uploadPlaylistId,
    maxResults
  );

  const recentVideos = rawVideos
    .map(normalizePublicVideo)
    .sort((first, second) => {
      return (
        (toDate(second.publishedAt)?.getTime() || 0) -
        (toDate(first.publishedAt)?.getTime() || 0)
      );
    });

  const topVideos = [...recentVideos]
    .sort((first, second) => second.viewsRaw - first.viewsRaw)
    .slice(0, 6);

  const subscribersRaw = toCount(channel?.statistics?.subscriberCount);
  const subscriberCountHidden = Boolean(
    channel?.statistics?.hiddenSubscriberCount
  );
  const totalChannelViewsRaw = toCount(channel?.statistics?.viewCount);
  const totalChannelVideos = toCount(channel?.statistics?.videoCount);
  const avgViewsRaw = calculateAverage(
    recentVideos.map((video) => video.viewsRaw)
  );
  const highestViewsRaw = Math.max(
    0,
    ...recentVideos.map((video) => video.viewsRaw)
  );
  const avgLikesRaw = calculateAverage(
    recentVideos.map((video) => video.likesRaw)
  );
  const engagementRate =
    avgViewsRaw > 0 && avgLikesRaw > 0
      ? Number(((avgLikesRaw / avgViewsRaw) * 100).toFixed(2))
      : null;
  const uploadRatePerWeek = getUploadRatePerWeek(recentVideos);
  const recentMomentum = calculateRecentMomentum(recentVideos);
  const opportunityScoreRaw = calculateOpportunityScore({
    avgViews: avgViewsRaw,
    subscribers: subscribersRaw,
    uploadRatePerWeek,
    momentumPercentage: recentMomentum.percentage,
    analyzedVideos: recentVideos.length,
  });

  const subscribers = subscriberCountHidden
    ? "Hidden"
    : formatCount(subscribersRaw);

  const avgViews = formatCount(avgViewsRaw);
  const totalChannelViews = formatCount(totalChannelViewsRaw);
  const highestViews = formatCount(highestViewsRaw);
  const avgLikes = formatCount(avgLikesRaw);
  const uploadRate =
    uploadRatePerWeek > 0
      ? `${uploadRatePerWeek.toFixed(1)}/week`
      : "Not enough upload history";

  const lastUploadLabel = recentVideos[0]?.publishedLabel || "No public uploads found";

  return {
    source: "youtube-data-api",
    analyzedAt: new Date().toISOString(),
    channelId: cleanString(channel?.id, 100),
    channel: cleanString(channel?.snippet?.title, "Unknown Channel"),
    channelUrl: buildChannelUrl(channel),
    channelThumbnail:
      cleanString(channel?.snippet?.thumbnails?.high?.url, 1000) ||
      cleanString(channel?.snippet?.thumbnails?.medium?.url, 1000) ||
      cleanString(channel?.snippet?.thumbnails?.default?.url, 1000),
    description: cleanString(channel?.snippet?.description, 1600),
    subscriberCountHidden,
    subscribers,
    subscribersRaw,
    totalChannelViews,
    totalChannelViewsRaw,
    totalChannelVideos,
    totalVideosAnalyzed: recentVideos.length,
    avgViews,
    avgViewsRaw,
    highestViews,
    highestViewsRaw,
    avgLikes,
    avgLikesRaw,
    engagementRate,
    uploadRate,
    uploadRatePerWeek,
    lastUploadLabel,
    growth: recentMomentum.label,
    recentMomentumPercent: recentMomentum.percentage,
    recentAverageDailyViews: formatCount(
      recentMomentum.recentAverageDailyViews
    ),
    earlierAverageDailyViews: formatCount(
      recentMomentum.earlierAverageDailyViews
    ),
    opportunityScore: String(opportunityScoreRaw),
    opportunityScoreRaw,
    opportunityLabel: getOpportunityLabel(opportunityScoreRaw),
    summary: buildCompetitorSummary({
      channel,
      subscribersLabel: subscribers,
      totalViewsLabel: totalChannelViews,
      analyzedVideos: recentVideos.length,
      avgViewsLabel: avgViews,
      recentMomentum,
      uploadRate,
    }),
    topVideos,
    recentVideos: recentVideos.slice(0, 12),
  };
}

module.exports = {
  analyzePublicYouTubeCompetitor,
};