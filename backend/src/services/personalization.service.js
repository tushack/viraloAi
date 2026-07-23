const supabase = require("../config/supabase");

const {
  getAuthorizedYoutubeClient,
} = require("./youtube.service");

const YOUTUBE_CACHE = new Map();

const YOUTUBE_CACHE_MS = Math.max(
  5 * 60 * 1000,
  Number(
    process.env.YOUTUBE_PERSONALIZATION_CACHE_MINUTES ||
      30
  ) *
    60 *
    1000
);

const STOP_WORDS = new Set([
  "about",
  "after",
  "all",
  "and",
  "are",
  "best",
  "but",
  "channel",
  "content",
  "for",
  "from",
  "guide",
  "how",
  "into",
  "latest",
  "new",
  "official",
  "short",
  "shorts",
  "the",
  "this",
  "top",
  "trending",
  "video",
  "videos",
  "viral",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "you",
  "your",
  "youtube",
]);

function cleanString(value, maxLength = 500) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function parseMetadata(value) {
  if (!value) {
    return {};
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    const parsed = JSON.parse(value);

    return parsed &&
      typeof parsed === "object"
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function getSignalKey(value) {
  return cleanString(value, 180)
    .toLowerCase()
    .replace(/[^a-z0-9+#\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addSignal(
  map,
  value,
  weight,
  source
) {
  const query = cleanString(value, 180);
  const key = getSignalKey(query);

  if (
    !key ||
    key.length < 2
  ) {
    return;
  }

  const current =
    map.get(key) || {
      query,
      score: 0,
      sources: new Set(),
    };

  current.score += Number(weight || 0);
  current.sources.add(source);

  map.set(key, current);
}

function getTokens(value) {
  return cleanString(value, 2500)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9+#\s-]/g, " ")
    .split(/\s+/)
    .map((item) =>
      item.replace(/^-+|-+$/g, "")
    )
    .filter(
      (item) =>
        item.length >= 3 &&
        item.length <= 32 &&
        !STOP_WORDS.has(item) &&
        !/^\d+$/.test(item)
    )
    .slice(0, 60);
}

function addTextSignals(
  map,
  value,
  weight,
  source
) {
  const tokens = getTokens(value);

  if (!tokens.length) {
    return;
  }

  const unique = [...new Set(tokens)];

  if (
    unique.length >= 2 &&
    unique.length <= 5
  ) {
    addSignal(
      map,
      unique.join(" "),
      weight * 1.5,
      source
    );
  }

  for (
    let index = 0;
    index < tokens.length - 1;
    index += 1
  ) {
    if (
      tokens[index] !==
      tokens[index + 1]
    ) {
      addSignal(
        map,
        `${tokens[index]} ${
          tokens[index + 1]
        }`,
        weight * 1.2,
        source
      );
    }
  }

  unique.forEach((token) => {
    addSignal(
      map,
      token,
      weight,
      source
    );
  });
}

function getSortedSignals(
  map,
  limit = 6
) {
  return [...map.values()]
    .map((item) => ({
      query: item.query,

      score:
        Math.round(
          item.score * 100
        ) / 100,

      sources: [
        ...item.sources,
      ],
    }))
    .sort(
      (first, second) =>
        second.score -
        first.score
    )
    .slice(0, limit);
}

function getTopicLabel(value) {
  const text = cleanString(
    value,
    500
  );

  if (!text) {
    return "";
  }

  try {
    const url = new URL(text);

    const part =
      url.pathname
        .split("/")
        .filter(Boolean)
        .pop() || "";

    return decodeURIComponent(part)
      .replace(/[_-]+/g, " ");
  } catch {
    return text;
  }
}

async function getPlaylistItems(
  youtube,
  playlistId,
  source
) {
  if (!playlistId) {
    return [];
  }

  try {
    const response =
      await youtube.playlistItems.list({
        part: ["snippet"],
        playlistId,
        maxResults: 20,
      });

    return (
      response.data.items || []
    ).map((item) => ({
      title: cleanString(
        item?.snippet?.title,
        300
      ),

      description: cleanString(
        item?.snippet?.description,
        1200
      ),

      source,
    }));
  } catch (error) {
    console.warn(
      `YouTube ${source} personalization skipped:`,
      error?.message || error
    );

    return [];
  }
}

async function loadYoutubeSignals(
  userId
) {
  const {
    youtube,
    connection,
  } =
    await getAuthorizedYoutubeClient(
      userId
    );

  const channelResponse =
    await youtube.channels.list({
      part: [
        "snippet",
        "contentDetails",
        "topicDetails",
      ],

      mine: true,
      maxResults: 1,
    });

  const channel =
    channelResponse.data.items?.[0];

  if (!channel?.id) {
    return {
      connected: Boolean(
        connection?.channelId
      ),

      signals: [],
    };
  }

  const subscriptionsPromise =
    youtube.subscriptions
      .list({
        part: ["snippet"],
        mine: true,
        maxResults: 30,
        order: "relevance",
      })
      .catch((error) => {
        console.warn(
          "YouTube subscriptions personalization skipped:",
          error?.message || error
        );

        return {
          data: {
            items: [],
          },
        };
      });

  const uploadsId = cleanString(
    channel?.contentDetails
      ?.relatedPlaylists?.uploads,
    200
  );

  const likesId = cleanString(
    channel?.contentDetails
      ?.relatedPlaylists?.likes,
    200
  );

  const [
    subscriptions,
    uploads,
    likes,
  ] = await Promise.all([
    subscriptionsPromise,

    getPlaylistItems(
      youtube,
      uploadsId,
      "youtube_upload"
    ),

    getPlaylistItems(
      youtube,
      likesId,
      "youtube_like"
    ),
  ]);

  const scores = new Map();

  addTextSignals(
    scores,
    channel?.snippet?.title,
    5,
    "youtube_channel"
  );

  addTextSignals(
    scores,
    channel?.snippet?.description,
    8,
    "youtube_channel"
  );

  (
    channel?.topicDetails
      ?.topicCategories || []
  ).forEach((item) => {
    addSignal(
      scores,
      getTopicLabel(item),
      14,
      "youtube_channel_topic"
    );
  });

  (
    subscriptions?.data?.items ||
    []
  ).forEach((item) => {
    addTextSignals(
      scores,
      item?.snippet?.title,
      5,
      "youtube_subscription"
    );

    addTextSignals(
      scores,
      item?.snippet?.description,
      3,
      "youtube_subscription"
    );
  });

  [
    ...uploads,
    ...likes,
  ].forEach((item) => {
    const weight =
      item.source ===
      "youtube_like"
        ? 12
        : 9;

    addTextSignals(
      scores,
      item.title,
      weight,
      item.source
    );

    addTextSignals(
      scores,
      item.description,
      weight * 0.35,
      item.source
    );
  });

  return {
    connected: true,

    channelTitle: cleanString(
      channel?.snippet?.title,
      300
    ),

    signals: getSortedSignals(
      scores,
      6
    ),
  };
}

async function getYoutubeSignals(
  userId
) {
  const cacheKey = cleanString(
    userId,
    300
  );

  const cached =
    YOUTUBE_CACHE.get(cacheKey);

  if (
    cached &&
    cached.expiresAt > Date.now()
  ) {
    return cached.value;
  }

  let value = {
    connected: false,
    signals: [],
  };

  try {
    value =
      await loadYoutubeSignals(
        cacheKey
      );
  } catch (error) {
    if (
      Number(error?.statusCode) !==
      409
    ) {
      console.warn(
        "YouTube personalization unavailable:",
        error?.message || error
      );
    }
  }

  if (
    YOUTUBE_CACHE.size >= 1000
  ) {
    const oldestKey =
      YOUTUBE_CACHE.keys()
        .next().value;

    if (oldestKey) {
      YOUTUBE_CACHE.delete(
        oldestKey
      );
    }
  }

  YOUTUBE_CACHE.set(cacheKey, {
    value,

    expiresAt:
      Date.now() +
      YOUTUBE_CACHE_MS,
  });

  return value;
}

async function getUserInterestProfile({
  userId,
  explicitNiche = "",
  platform = "YouTube",
}) {
  const scores = new Map();

  /*
   * The niche currently entered by the user
   * always receives the highest priority.
   */
  addSignal(
    scores,
    explicitNiche,
    120,
    "current_dashboard_niche"
  );

  const [
    researchResult,
    searchesResult,
    savedResult,
    activityResult,
    youtubeResult,
  ] =
    await Promise.allSettled([
      supabase
        .from("research_queries")
        .select(
          "niche, audience, created_at"
        )
        .eq(
          "user_id",
          userId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(50),

      supabase
        .from(
          "user_trend_searches"
        )
        .select(
          "query, searched_at"
        )
        .eq(
          "user_id",
          userId
        )
        .order(
          "searched_at",
          {
            ascending: false,
          }
        )
        .limit(50),

      supabase
        .from("saved_ideas")
        .select(
          "niche, content, created_at"
        )
        .eq(
          "user_id",
          userId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(50),

      supabase
        .from("activity_logs")
        .select(
          "event_type, metadata, created_at"
        )
        .eq(
          "user_id",
          userId
        )
        .eq(
          "status",
          "success"
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(80),

      getYoutubeSignals(userId),
    ]);

  const researchRows =
    researchResult.status ===
    "fulfilled"
      ? researchResult.value
          ?.data || []
      : [];

  researchRows.forEach(
    (item, index) => {
      const weight =
        Math.max(
          5,
          28 - index * 0.45
        );

      addSignal(
        scores,
        item?.niche,
        weight,
        "dashboard_research"
      );

      addTextSignals(
        scores,
        item?.audience,
        weight * 0.15,
        "dashboard_audience"
      );
    }
  );

  const searchRows =
    searchesResult.status ===
    "fulfilled"
      ? searchesResult.value
          ?.data || []
      : [];

  searchRows.forEach(
    (item, index) => {
      addSignal(
        scores,
        item?.query,

        Math.max(
          6,
          26 - index * 0.4
        ),

        "trend_search"
      );
    }
  );

  const savedRows =
    savedResult.status ===
    "fulfilled"
      ? savedResult.value
          ?.data || []
      : [];

  savedRows.forEach(
    (item, index) => {
      const weight =
        Math.max(
          5,
          24 - index * 0.35
        );

      addSignal(
        scores,
        item?.niche,
        weight,
        "saved_idea"
      );

      addTextSignals(
        scores,
        item?.content,
        weight * 0.4,
        "saved_idea"
      );
    }
  );

  const activityRows =
    activityResult.status ===
    "fulfilled"
      ? activityResult.value
          ?.data || []
      : [];

  activityRows.forEach(
    (item, index) => {
      const eventType =
        cleanString(
          item?.event_type,
          120
        );

      if (
        ![
          "content_pack.generated",
          "research.generated",
          "ai.daily_ideas_generated",
          "trends.searched",
          "viral_check.analyzed",
        ].includes(eventType)
      ) {
        return;
      }

      const metadata =
        parseMetadata(
          item?.metadata
        );

      const weight =
        Math.max(
          4,
          20 - index * 0.2
        );

      addSignal(
        scores,
        metadata?.niche,
        weight,
        eventType
      );

      addSignal(
        scores,
        metadata?.query,
        weight,
        eventType
      );

      addTextSignals(
        scores,
        metadata?.topic,
        weight * 0.8,
        eventType
      );

      addTextSignals(
        scores,
        metadata?.title,
        weight * 0.55,
        eventType
      );
    }
  );

  const youtube =
    youtubeResult.status ===
    "fulfilled"
      ? youtubeResult.value
      : {
          connected: false,
          signals: [],
        };

  (
    youtube?.signals || []
  ).forEach((item) => {
    addSignal(
      scores,
      item?.query,

      Math.max(
        4,
        Number(
          item?.score || 0
        ) * 0.75
      ),

      "youtube_interest"
    );
  });

  return {
    platform,

    explicitNiche:
      cleanString(
        explicitNiche,
        180
      ),

    youtubeConnected:
      Boolean(
        youtube?.connected
      ),

    youtubeChannelTitle:
      cleanString(
        youtube?.channelTitle,
        300
      ),

    signals:
      getSortedSignals(
        scores,
        6
      ),
  };
}

module.exports = {
  getUserInterestProfile,
};