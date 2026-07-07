const { google } = require("googleapis");

function getYouTubeDataApiKey() {
  const apiKey = String(
    process.env.YOUTUBE_DATA_API_KEY ||
      process.env.YOUTUBE_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ""
  ).trim();

  if (!apiKey) {
    const error = new Error(
      "YOUTUBE_DATA_API_KEY is missing in backend .env."
    );

    error.statusCode = 500;
    throw error;
  }

  return apiKey;
}

async function getMostPopularYouTubeVideos({
  regionCode = "IN",
  maxResults = 24,
}) {
  const youtube = google.youtube({
    version: "v3",
    auth: getYouTubeDataApiKey(),
  });

  try {
    const response = await youtube.videos.list({
      part: ["snippet", "statistics", "contentDetails"],
      chart: "mostPopular",
      regionCode: String(regionCode || "IN").toUpperCase(),
      maxResults: Math.max(1, Math.min(Number(maxResults) || 24, 50)),
    });

    const items = response.data.items || [];

    console.log("YouTube most-popular items found:", items.length);

    return items.map((video) => ({
      title: video.snippet?.title || "",
      channelTitle: video.snippet?.channelTitle || "",
      url: video.id
        ? `https://www.youtube.com/watch?v=${video.id}`
        : "",
      thumbnailUrl:
        video.snippet?.thumbnails?.high?.url ||
        video.snippet?.thumbnails?.medium?.url ||
        video.snippet?.thumbnails?.default?.url ||
        "",
      publishedAt: video.snippet?.publishedAt || "",
      duration: video.contentDetails?.duration || "",
      viewCount: video.statistics?.viewCount || 0,
    }));
  } catch (requestError) {
    const apiMessage =
      requestError?.response?.data?.error?.message ||
      requestError?.message ||
      "Failed to fetch YouTube popular videos.";

    const error = new Error(apiMessage);
    error.statusCode =
      requestError?.response?.status ||
      requestError?.code ||
      502;

    throw error;
  }
}

module.exports = {
  getMostPopularYouTubeVideos,
};