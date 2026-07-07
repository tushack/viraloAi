const { google } = require("googleapis");

function cleanString(value, maxLength = 1000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function clampInteger(value, fallback, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(number)));
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

function buildChannelUrl(channel) {
  const customUrl = cleanString(channel?.snippet?.customUrl, 300);

  if (customUrl.startsWith("@")) {
    return `https://www.youtube.com/${customUrl}`;
  }

  return channel?.id
    ? `https://www.youtube.com/channel/${channel.id}`
    : "";
}

function getThumbnail(channel) {
  return (
    cleanString(channel?.snippet?.thumbnails?.high?.url, 1000) ||
    cleanString(channel?.snippet?.thumbnails?.medium?.url, 1000) ||
    cleanString(channel?.snippet?.thumbnails?.default?.url, 1000)
  );
}

function makeYoutubeApiError(requestError, fallbackMessage) {
  const statusCode = Number(
    requestError?.response?.status || requestError?.code || 502
  );

  const message = cleanString(
    requestError?.response?.data?.error?.message ||
    requestError?.message ||
    fallbackMessage,
    600
  );

  const error = new Error(message || fallbackMessage);
  error.statusCode = statusCode;
  return error;
}

/**
 * Returns real public YouTube channels relevant to a niche.
 * Names and counters are always read from YouTube Data API v3, never AI.
 */
async function getTopYouTubeChannelsForNiche({ niche, limit = 6 }) {
  const cleanNiche = cleanString(niche, 180);
  const maxResults = clampInteger(limit, 6, 1, 10);

  if (!cleanNiche) {
    const error = new Error("Niche is required to find YouTube channels.");
    error.statusCode = 400;
    throw error;
  }

  const youtube = createPublicYouTubeClient();

  try {
    const searchResponse = await youtube.search.list({
      part: ["snippet"],
      q: cleanNiche,
      type: ["channel"],
      order: "relevance",
      maxResults,
      safeSearch: "moderate",
    });

    const orderedChannelIds = (searchResponse.data.items || [])
      .map((item) => item?.id?.channelId)
      .filter(Boolean)
      .filter((id, index, list) => list.indexOf(id) === index)
      .slice(0, maxResults);

    if (!orderedChannelIds.length) {
      return {
        niche: cleanNiche,
        source: "youtube-data-api",
        fetchedAt: new Date().toISOString(),
        channels: [],
      };
    }

    const channelsResponse = await youtube.channels.list({
      part: ["snippet", "statistics"],
      id: orderedChannelIds.join(","),
      maxResults: orderedChannelIds.length,
    });

    const channelById = new Map(
      (channelsResponse.data.items || []).map((channel) => [channel.id, channel])
    );

    const channels = orderedChannelIds
      .map((channelId) => channelById.get(channelId))
      .filter(Boolean)
      .map((channel) => {
        const subscriberCountHidden = Boolean(
          channel?.statistics?.hiddenSubscriberCount
        );

        const realChannelName =
          cleanString(channel?.snippet?.title, 300) || "Unknown Channel";

        const customUrl = cleanString(channel?.snippet?.customUrl, 300);

        return {
          source: "youtube-data-api",

          channelId: cleanString(channel?.id, 100),

          // Real YouTube channel title
          channel: realChannelName,
          channelName: realChannelName,
          channelTitle: realChannelName,
          name: realChannelName,

          // Optional YouTube handle, for example @MrBeast
          channelHandle: customUrl
            ? customUrl.startsWith("@")
              ? customUrl
              : `@${customUrl}`
            : "",

          channelUrl: buildChannelUrl(channel),
          channelThumbnail: getThumbnail(channel),
          description: cleanString(channel?.snippet?.description, 500),

          subscribers: subscriberCountHidden
            ? "Hidden"
            : formatCount(channel?.statistics?.subscriberCount),

          channelViews: formatCount(channel?.statistics?.viewCount),
          videoCount: formatCount(channel?.statistics?.videoCount),

          subscriberCountHidden,
        };
      });

    return {
      niche: cleanNiche,
      source: "youtube-data-api",
      fetchedAt: new Date().toISOString(),
      channels,
    };
  } catch (error) {
    throw makeYoutubeApiError(
      error,
      "Failed to load public YouTube channel data."
    );
  }
}

module.exports = {
  getTopYouTubeChannelsForNiche,
};
