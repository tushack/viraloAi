const supabase = require("../config/supabase");
const { generateGeminiJson } = require("./gemini.service");
const { generateNvidiaJson } = require("./nvidia.service");
const { generateCloudflareImage } = require("./cloudflareAi.service");
const {
  generateBluesmindsJson,
} = require("./bluesminds.service");

const FRESH_SEARCH_ANGLES = [
  "latest trending ideas",
  "new viral topics",
  "beginner problems",
  "mistakes to avoid",
  "30 day challenge",
  "myths and facts",
  "step by step guide",
  "before and after",
  "common questions",
  "high demand topics",
  "low competition ideas",
  "shorts ideas",
];

const FALLBACK_TOPIC_ANGLES = [
  "beginner mistakes to avoid",
  "simple daily routine",
  "myths people still believe",
  "quick tips for busy people",
  "before and after breakdown",
  "things nobody explains clearly",
  "budget friendly guide",
  "7 day challenge idea",
  "common questions answered",
  "tools and apps comparison",
  "step by step tutorial",
  "weekly plan for beginners",
  "do this instead of that",
  "top habits that actually work",
  "red flags beginners miss",
  "case study breakdown",
  "small changes with big results",
  "things I wish I knew earlier",
  "mistakes that slow progress",
  "quick checklist for beginners",
  "high value tips under 60 seconds",
  "complete starter roadmap",
  "realistic plan for working people",
  "easy wins most creators ignore",
  "trend explained in simple words",
  "advanced tips made simple",
  "daily routine audit",
  "best free resources",
  "what to stop doing today",
  "weekly content series idea",
];

const {
  runApifyYouTubeSearch,
} = require("./apify.service");

const {
  analyzePublicYouTubeCompetitor,
} = require("./youtubeCompetitor.service");

function pickField(item, fields, fallback = "") {
  for (const field of fields) {
    if (item && item[field] !== undefined && item[field] !== null) {
      return item[field];
    }
  }

  return fallback;
}

function getTextValue(value, fallback = "") {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => getTextValue(item, ""))
      .filter(Boolean)
      .join(", ");
  }

  if (value && typeof value === "object") {
    return (
      value.name ||
      value.title ||
      value.channelName ||
      value.channelTitle ||
      value.author ||
      value.authorName ||
      value.handle ||
      value.text ||
      value.url ||
      fallback
    );
  }

  return fallback;
}

function getDifficulty(index) {
  if (index <= 2) return "Easy Win";
  if (index <= 7) return "Medium Effort";

  return "High Reward";
}

function createTopicFingerprint(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (word) =>
        ![
          "the",
          "a",
          "an",
          "for",
          "and",
          "or",
          "to",
          "of",
          "in",
          "on",
          "with",
          "without",
          "how",
          "why",
          "what",
          "best",
          "top",
          "new",
          "latest",
          "video",
          "videos",
          "youtube",
          "shorts",
        ].includes(word)
    )
    .slice(0, 10)
    .join("-");
}

function collectTopicsFromResponse(response) {
  if (!response || typeof response !== "object") return [];

  const topics = Array.isArray(response.trendingTopics)
    ? response.trendingTopics
    : [];

  return topics
    .map((item) => getTextValue(item?.topic || item?.title || item, ""))
    .filter(Boolean);
}

async function getPreviouslyGeneratedTopics({
  userId,
  niche,
  limit = 100,
}) {
  if (!userId || !niche) return [];

  const { data, error } = await supabase
    .from("research_queries")
    .select("response_json")
    .eq("user_id", userId)
    .eq("niche", niche)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Previous topics fetch error:", error);
    return [];
  }

  return (data || []).flatMap((item) =>
    collectTopicsFromResponse(item.response_json)
  );
}

function pickFreshSearchAngle(avoidTopics = []) {
  const index = avoidTopics.length % FRESH_SEARCH_ANGLES.length;
  return FRESH_SEARCH_ANGLES[index];
}

function normalizeViewCount(value) {
  if (typeof value === "number") {
    return value;
  }

  if (!value || typeof value !== "string") {
    return 0;
  }

  const cleanValue = value
    .toLowerCase()
    .replace(/views/g, "")
    .replace(/view/g, "")
    .replace(/subscribers/g, "")
    .replace(/subscriber/g, "")
    .replace(/videos/g, "")
    .replace(/video/g, "")
    .replace(/,/g, "")
    .trim();

  const number = parseFloat(cleanValue);

  if (Number.isNaN(number)) {
    return 0;
  }

  if (cleanValue.includes("b")) {
    return Math.round(number * 1000000000);
  }

  if (cleanValue.includes("m")) {
    return Math.round(number * 1000000);
  }

  if (cleanValue.includes("k")) {
    return Math.round(number * 1000);
  }

  return Math.round(number);
}

function formatViews(value) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  const views = Number(value || 0);

  if (views >= 1000000000) {
    return `${(views / 1000000000).toFixed(1)}B`;
  }

  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  }

  if (views >= 1000) {
    return `${Math.round(views / 1000)}K`;
  }

  return `${views}`;
}

function calculateAverage(numbers) {
  const validNumbers = numbers.filter((item) => Number(item) > 0);

  if (!validNumbers.length) {
    return 0;
  }

  const total = validNumbers.reduce(
    (sum, item) => sum + Number(item),
    0
  );

  return Math.round(total / validNumbers.length);
}

function calculateRelativeGrowth(videoViews, baselineViews) {
  const views = Number(videoViews || 0);
  const baseline = Number(baselineViews || 0);

  if (!views || !baseline) {
    return "+0%";
  }

  const growth = Math.round(
    ((views - baseline) / baseline) * 100
  );

  return `${growth >= 0 ? "+" : ""}${growth}%`;
}

function getCompetitionFromViews(videoViews, baselineViews) {
  const views = Number(videoViews || 0);
  const baseline = Number(baselineViews || 0);

  if (!views || !baseline) {
    return "Medium";
  }

  const ratio = views / baseline;

  if (ratio >= 1.5) return "High";
  if (ratio >= 0.75) return "Medium";

  return "Low";
}

function getScoreFromViews(videoViews, baselineViews) {
  const views = Number(videoViews || 0);
  const baseline = Number(baselineViews || 0);

  if (!views || !baseline) {
    return "50";
  }

  const ratio = views / baseline;
  const score = Math.round(50 + ratio * 25);

  return String(Math.min(98, Math.max(45, score)));
}

function normalizeApifyVideo(item) {
  const rawTitle = pickField(
    item,
    ["title", "videoTitle", "name", "text", "videoName"],
    ""
  );

  const rawChannel = pickField(
    item,
    [
      "channelName",
      "channelTitle",
      "channel",
      "author",
      "authorName",
      "uploader",
      "owner",
      "channelHandle",
    ],
    "Unknown Channel"
  );

  const rawViews = pickField(
    item,
    [
      "viewCount",
      "views",
      "numberOfViews",
      "viewCountText",
      "viewsText",
      "viewCountShort",
    ],
    0
  );

  const rawUrl = pickField(
    item,
    ["url", "videoUrl", "link", "watchUrl", "videoLink"],
    ""
  );

  const rawThumbnail = pickField(
    item,
    [
      "thumbnailUrl",
      "thumbnail",
      "thumbnailUrlHQ",
      "thumbnail_url",
      "image",
      "thumbnailImage",
      "thumbnailSrc",
    ],
    ""
  );

  const rawPublishedAt = pickField(
    item,
    [
      "publishedAt",
      "date",
      "publishedDate",
      "publishedText",
      "uploadedAt",
    ],
    ""
  );

  return {
    title: getTextValue(rawTitle, ""),
    channel: getTextValue(rawChannel, "Unknown Channel"),
    views: normalizeViewCount(rawViews),
    url: getTextValue(rawUrl, ""),
    thumbnail: getTextValue(rawThumbnail, ""),
    publishedAt: getTextValue(rawPublishedAt, ""),
    raw: item,
  };
}

function createFallbackResearch({
  niche,
  platform,
  audience,
  maxTopics = 12,
  avoidTopics = [],
}) {
  const cleanNiche = niche || "AI tools";
  const cleanPlatform = platform || "YouTube";
  const cleanAudience = audience || "New creators";
  const avoidSet = new Set(
    avoidTopics.map(createTopicFingerprint).filter(Boolean)
  );

  return {
    trendingTopics: [
      {
        topic: `${cleanNiche} for beginners`,
        growth: "+0%",
        growthSource: "fallback_no_apify_views",
        competition: "Medium",
        difficulty: "Easy Win",
        insight: `Strong topic for ${cleanAudience} on ${cleanPlatform}. Real growth will appear when Apify returns video view data.`,
      },
      {
        topic: `Best ${cleanNiche}`,
        growth: "+0%",
        growthSource: "fallback_no_apify_views",
        competition: "High",
        difficulty: "Medium Effort",
        insight: `List-style content can perform well for ${cleanNiche}. Real growth will appear when Apify returns video view data.`,
      },
      {
        topic: `${cleanNiche} mistakes to avoid`,
        growth: "+0%",
        growthSource: "fallback_no_apify_views",
        competition: "Low",
        difficulty: "Easy Win",
        insight:
          "Problem-based topics are easier to package into viral hooks. Real growth will appear when Apify returns video view data.",
      },
    ],

    viralHooks: [
      `I tested ${cleanNiche} so you don't waste your time.`,
      `Most ${cleanAudience.toLowerCase()} miss this ${cleanNiche} opportunity.`,
      `This ${cleanNiche} workflow can save hours every week.`,
      `I studied top-performing ${cleanNiche} content and found this pattern.`,
    ],

    titleSuggestions: [
      `I Used ${cleanNiche} to Find Viral ${cleanPlatform} Ideas`,
      `The Best ${cleanNiche} Strategy for ${cleanAudience}`,
      `How to Grow Faster on ${cleanPlatform} Using ${cleanNiche}`,
      `I Tested ${cleanNiche} Ideas for 7 Days`,
    ],

    competitors: [
      {
        channel: `${cleanNiche} Lab`,
        niche: cleanNiche,
        views: "Estimated",
        growth: "+0%",
        growthSource: "fallback_no_apify_views",
        score: "50",
      },
      {
        channel: `${cleanPlatform} Creator Studio`,
        niche: cleanNiche,
        views: "Estimated",
        growth: "+0%",
        growthSource: "fallback_no_apify_views",
        score: "50",
      },
      {
        channel: `${cleanAudience} Growth Hub`,
        niche: cleanNiche,
        views: "Estimated",
        growth: "+0%",
        growthSource: "fallback_no_apify_views",
        score: "50",
      },
    ],

    sourceVideos: [],
    source: "fallback",
  };
}

function buildResearchFromVideos({
  niche,
  platform,
  audience,
  videos,
  maxTopics = 20,
}) {
  const cleanNiche = niche || "AI tools";
  const cleanPlatform = platform || "YouTube";
  const cleanAudience = audience || "New creators";

  const safeVideos = videos
    .filter((video) => {
      return (
        video &&
        typeof video.title === "string" &&
        video.title.trim()
      );
    })
    .sort(
      (first, second) =>
        Number(second.views || 0) - Number(first.views || 0)
    );

  if (!safeVideos.length) {
    return createFallbackResearch({
      niche: cleanNiche,
      platform: cleanPlatform,
      audience: cleanAudience,
      maxTopics,
    });
  }

  const viewCounts = safeVideos.map((video) =>
    Number(video.views || 0)
  );

  const averageViews = calculateAverage(viewCounts);

  const trendingTopics = safeVideos
    .slice(0, maxTopics)
    .map((video, index) => {
      const growth = calculateRelativeGrowth(
        video.views,
        averageViews
      );

      const competition = getCompetitionFromViews(
        video.views,
        averageViews
      );

      const difficulty = getDifficulty(index);

      return {
        topic: video.title,
        topicHash: createTopicFingerprint(video.title),
        growth,
        growthSource: "apify_views_vs_average",
        averageViews: formatViews(averageViews),
        actualViews: formatViews(video.views),
        competition,
        difficulty,
        insight: `This video has ${formatViews(
          video.views
        )} views compared with an average of ${formatViews(
          averageViews
        )} views from the current Apify results. That makes it a ${growth} relative growth signal for ${cleanNiche}.`,
        shareText: `Video Idea: ${
          video.title
        }\nViews: ${formatViews(
          video.views
        )}\nRelative Growth: ${growth}\nDifficulty: ${difficulty}`,
        sourceUrl: video.url,
        sourceChannel: video.channel,
        thumbnail: video.thumbnail,
        publishedAt: video.publishedAt,
      };
    });

  const viralHooks = safeVideos.slice(0, 4).map((video) => {
    const growth = calculateRelativeGrowth(
      video.views,
      averageViews
    );

    return `I studied "${video.title}" because it reached ${formatViews(
      video.views
    )} views, which is ${growth} compared with the current niche average.`;
  });

  const firstTitle = safeVideos[0]?.title || cleanNiche;

  const titleSuggestions = [
    `I Studied Viral ${cleanNiche} Videos So You Don't Have To`,
    `Why These ${cleanPlatform} Videos Are Getting Views Right Now`,
    `The Best ${cleanNiche} Ideas for ${cleanAudience}`,
    `How to Find Viral ${cleanPlatform} Topics in ${cleanNiche}`,
    `I Analyzed "${firstTitle}" and Found This Pattern`,
  ];

  const competitors = safeVideos.slice(0, 4).map((video) => {
    const growth = calculateRelativeGrowth(
      video.views,
      averageViews
    );

    return {
      channel: getTextValue(
        video.channel,
        "Unknown Channel"
      ),
      niche: cleanNiche,
      views: formatViews(video.views),
      growth,
      growthSource: "apify_views_vs_average",
      score: getScoreFromViews(
        video.views,
        averageViews
      ),
      sourceUrl: video.url,
    };
  });

  return {
    trendingTopics,
    viralHooks,
    titleSuggestions,
    competitors,
    sourceVideos: safeVideos,
    source: "apify",
    meta: {
      averageViews: formatViews(averageViews),
      averageViewsRaw: averageViews,
      totalVideosAnalyzed: safeVideos.length,
      growthFormula:
        "relativeGrowth = ((videoViews - averageViews) / averageViews) * 100",
    },
  };
}

async function saveResearchQuery({
  niche,
  platform,
  audience,
  response,
  userId,
}) {
  const { error } = await supabase
    .from("research_queries")
    .insert({
      user_id: userId,
      niche,
      platform,
      audience,
      response_json: response,
    });

  if (error) {
    console.error("Supabase insert error:", error);
  }
}

async function createResearchResult({
  niche,
  platform,
  audience,
  userId,
  maxTopics = 20,
}) {
  const cleanNiche = niche || "AI tools";
  const cleanPlatform = platform || "YouTube";
  const cleanAudience = audience || "New creators";

  const searchQuery =
    `${cleanNiche} ${cleanPlatform} ${cleanAudience}`;

  try {
    const apifyItems = await runApifyYouTubeSearch({
      query: searchQuery,
      maxResults: Math.max(
        20,
        Number(maxTopics) || 20
      ),
    });

    const hasOnlyDemoItems =
      apifyItems.length > 0 &&
      apifyItems.every((item) => item.demo === true);

    if (hasOnlyDemoItems) {
      throw new Error(
        "Apify actor returned demo data only. Check actor input format or actor access."
      );
    }

    console.log(
      "Raw Apify items count:",
      apifyItems.length
    );

    if (apifyItems.length > 0) {
      console.log(
        "Raw Apify first item:",
        JSON.stringify(apifyItems[0], null, 2)
      );
    }

    const videos = apifyItems.map(normalizeApifyVideo);

    const response = buildResearchFromVideos({
      niche: cleanNiche,
      platform: cleanPlatform,
      audience: cleanAudience,
      videos,
      maxTopics: Number(maxTopics) || 20,
    });

    await saveResearchQuery({
      niche: cleanNiche,
      platform: cleanPlatform,
      audience: cleanAudience,
      response,
      userId,
    });

    return response;
  } catch (error) {
    console.error(
      "Apify research error:",
      error.message
    );

    const fallbackResponse = createFallbackResearch({
      niche: cleanNiche,
      platform: cleanPlatform,
      audience: cleanAudience,
      maxTopics: Number(maxTopics) || 20,
    });

    await saveResearchQuery({
      niche: cleanNiche,
      platform: cleanPlatform,
      audience: cleanAudience,
      response: fallbackResponse,
      userId,
    });

    return fallbackResponse;
  }
}

function isChannelInfoItem(item) {
  const recordType = getTextValue(
    item?.recordType,
    ""
  ).toLowerCase();

  const type = getTextValue(
    item?.type,
    ""
  ).toLowerCase();

  return (
    recordType === "channel" ||
    type === "channel" ||
    item?.subscriberCount !== undefined ||
    item?.subscriberCountText !== undefined ||
    item?.subscribers !== undefined ||
    item?.channelDescription !== undefined ||
    item?.description !== undefined ||
    item?.videoCount !== undefined ||
    item?.viewCount !== undefined
  );
}

function isVideoItem(item) {
  const recordType = getTextValue(
    item?.recordType,
    ""
  ).toLowerCase();

  const type = getTextValue(
    item?.type,
    ""
  ).toLowerCase();

  if (
    recordType === "channel" ||
    type === "channel"
  ) {
    return false;
  }

  return Boolean(
    item?.title ||
      item?.videoTitle ||
      item?.videoUrl ||
      item?.watchUrl ||
      item?.videoLink
  );
}

function extractChannelName(
  item,
  fallback = "Unknown Channel"
) {
  return getTextValue(
    pickField(
      item,
      [
        "channelName",
        "channelTitle",
        "title",
        "name",
        "author",
        "authorName",
        "handle",
        "channelHandle",
      ],
      fallback
    ),
    fallback
  );
}

function extractChannelUrl(item, fallback = "") {
  return getTextValue(
    pickField(
      item,
      [
        "channelUrl",
        "channelURL",
        "authorUrl",
        "channelLink",
        "ownerUrl",
        "url",
        "sourceInput",
      ],
      fallback
    ),
    fallback
  );
}

function calculateChannelGrowth(
  totalVideos,
  totalViews,
  subscribers
) {
  const normalizedSubscribers =
    normalizeViewCount(subscribers);

  if (
    totalVideos >= 1000 &&
    totalViews >= 1000000
  ) {
    return "+38%";
  }

  if (totalVideos >= 500) {
    return "+24%";
  }

  if (totalVideos >= 100) {
    return "+16%";
  }

  if (normalizedSubscribers >= 100000) {
    return "+18%";
  }

  return "+8%";
}

function calculateOpportunityScore(
  avgViews,
  subscribers
) {
  const normalizedSubscribers =
    normalizeViewCount(subscribers);

  if (!avgViews || avgViews <= 0) {
    return 45;
  }

  if (
    !normalizedSubscribers ||
    normalizedSubscribers <= 0
  ) {
    return 55;
  }

  const ratio =
    avgViews / normalizedSubscribers;

  return Math.min(
    95,
    Math.max(45, Math.round(ratio * 1000))
  );
}

async function analyzeCompetitorChannelResult({
  channelUrl,
}) {
  return analyzePublicYouTubeCompetitor({
    channelInput: channelUrl,
    maxResults: 30,
  });
}

function cleanString(value, fallback = "") {
  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  const text = String(value).trim();

  return text || fallback;
}

function limitText(text, length) {
  const value = cleanString(text);

  if (value.length <= length) {
    return value;
  }

  return `${value
    .slice(0, length)
    .trim()}...`;
}

function createSlugWords(text, maxWords = 5) {
  return cleanString(text)
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, maxWords);
}

function getContentPackAngle(competition) {
  const value = cleanString(
    competition,
    "Medium"
  ).toLowerCase();

  if (value === "low") {
    return {
      title: "Low Competition Opportunity",
      thumbnailHeadline: "LOW COMPETITION",
      posterTitle:
        "Create This Before Everyone Finds It",
      hookPrefix:
        "Most creators are still ignoring this topic",
      badgeColorText: "Low Competition",
      urgency: "early-mover",
    };
  }

  if (value === "high") {
    return {
      title: "High Demand Topic",
      thumbnailHeadline: "TRENDING NOW",
      posterTitle:
        "This Topic Is Already Exploding",
      hookPrefix:
        "This topic is already getting attention",
      badgeColorText: "High Demand",
      urgency: "high-demand",
    };
  }

  return {
    title: "Fast Growing Topic",
    thumbnailHeadline: "VIRAL IDEA",
    posterTitle:
      "This Idea Can Grow Fast",
    hookPrefix:
      "This topic is gaining momentum",
    badgeColorText: "Growing Fast",
    urgency: "fast-growth",
  };
}

function buildContentPack({
  topic,
  growth,
  competition,
  insight,
  niche,
  platform,
  audience,
}) {
  const cleanTopic = cleanString(
    topic,
    "Viral YouTube Topic"
  );

  const cleanGrowth = cleanString(
    growth,
    "+72%"
  );

  const cleanCompetition = cleanString(
    competition,
    "Medium"
  );

  const cleanInsight = cleanString(
    insight,
    "This topic has strong creator demand and can perform well with the right content angle."
  );

  const cleanNiche = cleanString(
    niche,
    "content creators"
  );

  const cleanPlatform = cleanString(
    platform,
    "YouTube"
  );

  const cleanAudience = cleanString(
    audience,
    "New creators"
  );

  const angle = getContentPackAngle(
    cleanCompetition
  );

  const shortTopic = limitText(
    cleanTopic,
    46
  );

  const thumbnailTopic = limitText(
    cleanTopic,
    36
  );

  const lowerCompetition =
    cleanCompetition.toLowerCase();

  const hashtagWords = createSlugWords(
    cleanTopic,
    5
  );

  return {
    topic: cleanTopic,
    growth: cleanGrowth,
    competition: cleanCompetition,
    insight: cleanInsight,
    niche: cleanNiche,
    platform: cleanPlatform,
    audience: cleanAudience,

    angle: angle.title,

    videoTitle:
      `I Found a ${angle.title} for ${cleanPlatform}: "${shortTopic}"`,

    thumbnailHeadline:
      angle.thumbnailHeadline,

    thumbnailMainText:
      thumbnailTopic,

    thumbnailSubText:
      `${cleanGrowth} growth • ${cleanCompetition} competition`,

    thumbnailBadge:
      angle.badgeColorText,

    posterTitle:
      angle.posterTitle,

    posterSubtitle:
      `${shortTopic} is showing ${cleanGrowth} growth with ${lowerCompetition} competition for ${cleanAudience.toLowerCase()} on ${cleanPlatform}.`,

    posterMainText:
      shortTopic,

    posterBadge:
      `${cleanGrowth} Growth • ${cleanCompetition} Competition`,

    hook:
      `${angle.hookPrefix}: "${cleanTopic}". It is showing ${cleanGrowth} growth with ${lowerCompetition} competition, which makes it a strong opportunity for ${cleanAudience.toLowerCase()}.`,

    introScript:
      `In this video, I am going to break down "${cleanTopic}" and explain why it is becoming a strong ${cleanPlatform} content opportunity. This topic is showing ${cleanGrowth} growth with ${lowerCompetition} competition. The key insight is: ${cleanInsight}`,

    talkingPoints: [
      `Trend signal: "${cleanTopic}" is showing ${cleanGrowth} growth right now.`,
      `Competition level is ${cleanCompetition}, so the content angle needs to be clear and specific.`,
      `Audience fit: this topic can work well for ${cleanAudience.toLowerCase()}.`,
      `Main insight: ${cleanInsight}`,
      `Best execution: use a strong hook, simple explanation, and a practical example for ${cleanPlatform}.`,
    ],

    cta:
      `If you want more ${cleanNiche} ideas like this, save this video and follow for more ${cleanPlatform} growth strategies.`,

    description:
      `In this video, we explore "${cleanTopic}" and why it is becoming a strong content opportunity for ${cleanAudience.toLowerCase()} on ${cleanPlatform}.\n\nThis topic is showing ${cleanGrowth} growth with ${lowerCompetition} competition.\n\nKey insight: ${cleanInsight}`,

    tags: [
      cleanTopic,
      cleanNiche,
      cleanPlatform,
      cleanAudience,
      `${cleanPlatform} growth`,
      `${cleanNiche} ideas`,
      "viral video ideas",
      "content strategy",
      "creator tips",
      "trend analysis",
    ],

    hashtags: [
      ...hashtagWords.map(
        (word) => `#${word}`
      ),
      "#YouTubeGrowth",
      "#ContentCreator",
      "#ViralIdeas",
      "#ContentStrategy",
    ],

    pinnedComment:
      `Would you create a video on "${cleanTopic}"? Comment your angle below.`,

    generatedAt:
      new Date().toISOString(),

    source:
      "backend-dynamic",
  };
}

function safeArray(value, fallback = []) {
  return Array.isArray(value)
    ? value.filter(Boolean)
    : fallback;
}

function normalizeAiContentPack({
  aiPack,
  fallbackPack,
  provider,
}) {
  const pack =
    aiPack &&
    typeof aiPack === "object" &&
    !Array.isArray(aiPack)
      ? aiPack
      : {};

  return {
    ...fallbackPack,

    topic: cleanString(
      pack.topic,
      fallbackPack.topic
    ),

    growth: cleanString(
      pack.growth,
      fallbackPack.growth
    ),

    competition: cleanString(
      pack.competition,
      fallbackPack.competition
    ),

    insight: cleanString(
      pack.insight,
      fallbackPack.insight
    ),

    niche: cleanString(
      pack.niche,
      fallbackPack.niche
    ),

    platform: cleanString(
      pack.platform,
      fallbackPack.platform
    ),

    audience: cleanString(
      pack.audience,
      fallbackPack.audience
    ),

    angle: cleanString(
      pack.angle,
      fallbackPack.angle
    ),

    videoTitle: cleanString(
      pack.videoTitle,
      fallbackPack.videoTitle
    ),

    thumbnailHeadline: cleanString(
      pack.thumbnailHeadline,
      fallbackPack.thumbnailHeadline
    ),

    thumbnailMainText: cleanString(
      pack.thumbnailMainText,
      fallbackPack.thumbnailMainText
    ),

    thumbnailSubText: cleanString(
      pack.thumbnailSubText,
      fallbackPack.thumbnailSubText
    ),

    thumbnailBadge: cleanString(
      pack.thumbnailBadge,
      fallbackPack.thumbnailBadge
    ),

    posterTitle: cleanString(
      pack.posterTitle,
      fallbackPack.posterTitle
    ),

    posterSubtitle: cleanString(
      pack.posterSubtitle,
      fallbackPack.posterSubtitle
    ),

    posterMainText: cleanString(
      pack.posterMainText,
      fallbackPack.posterMainText
    ),

    posterBadge: cleanString(
      pack.posterBadge,
      fallbackPack.posterBadge
    ),

    hook: cleanString(
      pack.hook,
      fallbackPack.hook
    ),

    introScript: cleanString(
      pack.introScript,
      fallbackPack.introScript
    ),

    talkingPoints: safeArray(
      pack.talkingPoints,
      fallbackPack.talkingPoints
    ),

    tags: safeArray(
      pack.tags,
      fallbackPack.tags
    ),

    hashtags: safeArray(
      pack.hashtags,
      fallbackPack.hashtags
    ),

    cta: cleanString(
      pack.cta,
      fallbackPack.cta
    ),

    description: cleanString(
      pack.description,
      fallbackPack.description
    ),

    pinnedComment: cleanString(
      pack.pinnedComment,
      fallbackPack.pinnedComment
    ),

    generatedAt:
      new Date().toISOString(),

    source:
      provider || "ai",

    fallbackSource:
      fallbackPack.source,
  };
}

function buildGeminiContentPackPrompt(
  payload,
  fallbackPack
) {
  const topic = cleanString(
    payload?.topic,
    fallbackPack.topic
  );

  const growth = cleanString(
    payload?.growth,
    fallbackPack.growth
  );

  const competition = cleanString(
    payload?.competition,
    fallbackPack.competition
  );

  const insight = cleanString(
    payload?.insight,
    fallbackPack.insight
  );

  const niche = cleanString(
    payload?.niche,
    fallbackPack.niche
  );

  const platform = cleanString(
    payload?.platform,
    fallbackPack.platform
  );

  const audience = cleanString(
    payload?.audience,
    fallbackPack.audience
  );

  const variantSeed = cleanString(
    payload?.variantSeed,
    `${Date.now()}`
  );

  return `
You are an expert social media content strategist for creators.

Generate a premium, ready-to-use creator content pack for this topic.

INPUT:
Topic: ${topic}
Niche: ${niche}
Platform: ${platform}
Audience: ${audience}
Growth signal: ${growth}
Competition: ${competition}
Insight: ${insight}
Generation variant seed: ${variantSeed}
Generation mode: ${payload?.generationMode || "fresh"}

IMPORTANT RULES:
- Return ONLY valid JSON.
- Do not wrap in markdown.
- Do not add explanation outside JSON.
- Keep the language clear, punchy, practical, and creator-friendly.
- Make it useful for YouTube / Shorts style creators.
- Thumbnail text should be short and readable.
- Hashtags must start with #.
- Do not invent fake stats beyond the provided growth signal.
- Use the provided growth and competition values honestly.

Return this exact JSON shape:
{
  "topic": "string",
  "growth": "string",
  "competition": "string",
  "insight": "string",
  "niche": "string",
  "platform": "string",
  "audience": "string",

  "angle": "string",
  "videoTitle": "string",

  "thumbnailHeadline": "string",
  "thumbnailMainText": "string",
  "thumbnailSubText": "string",
  "thumbnailBadge": "string",

  "posterTitle": "string",
  "posterSubtitle": "string",
  "posterMainText": "string",
  "posterBadge": "string",

  "hook": "string",
  "introScript": "string",

  "talkingPoints": [
    "string",
    "string",
    "string",
    "string",
    "string"
  ],

  "cta": "string",
  "description": "string",

  "tags": [
    "string",
    "string",
    "string",
    "string",
    "string",
    "string",
    "string",
    "string"
  ],

  "hashtags": [
    "#tag",
    "#tag",
    "#tag",
    "#tag",
    "#tag"
  ],

  "pinnedComment": "string"
}
`;
}

function getContentPackModel(providerName) {
  if (providerName === "bluesminds") {
    return (
      String(
        process.env.BLUESMINDS_MODEL || ""
      ).trim() ||
      "unknown"
    );
  }

  if (providerName === "nvidia") {
    return String(
      process.env.NVIDIA_MODEL ||
        "deepseek-ai/deepseek-v4-pro"
    ).trim();
  }

  if (providerName === "gemini") {
    return String(
      process.env.GEMINI_TEXT_MODEL ||
        "gemini-3.5-flash"
    ).trim();
  }

  return "unknown";
}

async function createContentPackResult(payload) {
  const topic = cleanString(
    payload?.topic
  );

  if (!topic) {
    throw new Error(
      "Topic is required to create a content pack"
    );
  }

  const fallbackPack =
    buildContentPack(payload || {});

  const provider = String(
    process.env.CONTENT_PACK_AI_PROVIDER ||
      process.env.AI_TEXT_PROVIDER ||
      "gemini"
  )
    .trim()
    .toLowerCase();

  const model =
    getContentPackModel(provider);

  try {
    const prompt =
      buildGeminiContentPackPrompt(
        payload || {},
        fallbackPack
      );

    const systemPrompt =
      "You are a premium YouTube and Shorts content strategist. Generate a detailed, advanced, ready-to-use creator content pack. Return only one valid JSON object. Do not use markdown or add text outside the JSON.";

    let aiPack;

    if (provider === "bluesminds") {
      aiPack =
        await generateBluesmindsJson({
          prompt,
          maxTokens: 5000,
          systemPrompt,
        });
    } else if (provider === "nvidia") {
      aiPack =
        await generateNvidiaJson({
          prompt,
          maxTokens: 5000,
          systemPrompt,
        });
    } else if (provider === "gemini") {
      aiPack =
        await generateGeminiJson({
          prompt,
        });
    } else {
      const unsupportedProviderError =
        new Error(
          `Unsupported content-pack AI provider: ${provider}`
        );

      unsupportedProviderError.statusCode =
        500;

      throw unsupportedProviderError;
    }

    const normalizedPack =
      normalizeAiContentPack({
        aiPack,
        fallbackPack,
        provider,
      });

    console.info(
      "[Content Pack AI Success]",
      {
        provider,
        model,
        topic: topic.slice(0, 100),
        usedFallback: false,
      }
    );

    return {
      ...normalizedPack,

      meta: {
        ...(normalizedPack.meta || {}),

        ai: {
          provider,
          model,
          usedFallback: false,
          generatedAt:
            new Date().toISOString(),
        },
      },
    };
  } catch (error) {
    console.error(
      "[Content Pack AI Fallback]",
      {
        provider,
        model,
        topic: topic.slice(0, 100),
        usedFallback: true,
        error: error.message,
      }
    );

    return {
      ...fallbackPack,

      source:
        "backend-dynamic-fallback",

      meta: {
        ...(fallbackPack.meta || {}),

        ai: {
          provider,
          model,
          usedFallback: true,
          error: error.message,
          generatedAt:
            new Date().toISOString(),
        },
      },
    };
  }
}

function inferThumbnailScene({
  topic,
  niche,
  title,
  insight,
  extraPrompt,
}) {
  const text =
    `${topic} ${niche} ${title} ${insight} ${extraPrompt}`.toLowerCase();

  if (
    text.includes("script") ||
    text.includes("screenplay") ||
    text.includes("writing") ||
    text.includes("formatting")
  ) {
    return "a dramatic writer workspace with screenplay pages, red correction marks, a laptop, crumpled paper, rejection mood, cinematic desk lighting, focused creative atmosphere";
  }

  if (
    text.includes("ai") ||
    text.includes("artificial intelligence") ||
    text.includes("chatgpt") ||
    text.includes("automation")
  ) {
    return "a modern creator working with glowing AI holograms, futuristic laptop setup, digital assistant visuals, premium tech workspace, cinematic blue-purple lighting";
  }

  if (
    text.includes("fitness") ||
    text.includes("workout") ||
    text.includes("gym") ||
    text.includes("weight loss")
  ) {
    return "a high-energy fitness transformation scene with a determined person training, gym lighting, sweat, motion, strong motivational thumbnail composition";
  }

  if (
    text.includes("finance") ||
    text.includes("money") ||
    text.includes("invest") ||
    text.includes("business")
  ) {
    return "a premium business decision scene with a focused entrepreneur, laptop, money planning visuals, clean office lighting, serious high-value thumbnail mood";
  }

  if (
    text.includes("coding") ||
    text.includes("programming") ||
    text.includes("developer") ||
    text.includes("app")
  ) {
    return "a focused developer at a modern desk with laptop code editor glow, debugging mood, clean tech setup, cinematic lighting, premium creator thumbnail look";
  }

  if (
    text.includes("youtube") ||
    text.includes("creator") ||
    text.includes("viral") ||
    text.includes("content")
  ) {
    return "a creator studio scene with camera, microphone, laptop, content planning board, dramatic lighting, modern YouTube creator setup";
  }

  if (
    text.includes("student") ||
    text.includes("study") ||
    text.includes("exam") ||
    text.includes("learn")
  ) {
    return "a focused student studying at a desk with books, laptop, notes, dramatic lamp light, exam pressure mood, motivational educational thumbnail style";
  }

  return `a realistic cinematic scene that directly visualizes the topic "${topic}", with a clear main subject, strong emotion, premium YouTube thumbnail composition, and clean empty space for text overlay`;
}

function buildThumbnailNegativePrompt() {
  return [
    "text",
    "letters",
    "words",
    "captions",
    "subtitles",
    "logo",
    "watermark",
    "signature",
    "UI text",
    "numbers",
    "blurry",
    "low quality",
    "distorted",
    "extra fingers",
    "bad hands",
    "deformed face",
    "ugly layout",
    "generic dashboard",
    "analytics chart",
    "stock market graph",
    "line graph",
    "bar chart",
    "random arrows",
    "data screen",
  ].join(", ");
}

function buildThumbnailGenerationPrompt({
  pack,
  prompt,
  variant = 1,
}) {
  const topic = cleanString(
    pack?.topic,
    "Viral YouTube Topic"
  );

  const niche = cleanString(
    pack?.niche,
    "content creators"
  );

  const platform = cleanString(
    pack?.platform,
    "YouTube"
  );

  const audience = cleanString(
    pack?.audience,
    "New creators"
  );

  const title = cleanString(
    pack?.videoTitle ||
      pack?.thumbnailMainText ||
      topic
  );

  const insight = cleanString(
    pack?.insight,
    ""
  );

  const extraPrompt = cleanString(
    prompt,
    ""
  );

  const scene = inferThumbnailScene({
    topic,
    niche,
    title,
    insight,
    extraPrompt,
  });

  const compositions = [
    "main subject on the left, clean empty space on the right for title overlay",
    "main subject on the right, clean empty space on the left for title overlay",
    "center subject with dark clean background area around it for title overlay",
    "close-up emotional subject with cinematic background blur and empty space for title overlay",
  ];

  const composition =
    compositions[
      (Number(variant || 1) - 1) %
        compositions.length
    ];

  return [
    "Create a premium 16:9 YouTube thumbnail background image.",

    `Video topic: "${topic}".`,

    `Video title context: "${title}".`,

    `Niche: ${niche}. Platform: ${platform}. Target audience: ${audience}.`,

    insight
      ? `Core idea: ${insight}.`
      : "",

    `Scene to create: ${scene}.`,

    `Composition: ${composition}.`,

    extraPrompt
      ? `User custom direction: ${extraPrompt}. Follow this direction strongly.`
      : "",

    "Make the image topic-specific and visually meaningful, not generic.",

    "Use realistic objects, people, emotions, desk setup, environment, or symbolic visuals that match the actual topic.",

    "Premium YouTube thumbnail style, cinematic lighting, high contrast, sharp subject, clean background, modern creator-economy look.",

    "Image should look clickable, dramatic, professional, and suitable for a viral educational YouTube video.",

    "Very important: do not create analytics dashboards, line graphs, bar charts, finance charts, random arrows, growth screens, or data UI unless the topic is specifically about analytics.",

    "Do not add any text, words, letters, captions, subtitles, logos, watermark, UI text, numbers, or readable typography inside the image.",

    "Leave enough clean empty space for frontend text overlay.",
  ]
    .filter(Boolean)
    .join(" ");
}

async function generateThumbnailResult({
  pack,
  prompt,
  variant,
}) {
  const finalPrompt =
    buildThumbnailGenerationPrompt({
      pack,
      prompt,
      variant,
    });

  const imageProvider = String(
    process.env.IMAGE_GENERATION_PROVIDER ||
      ""
  ).toLowerCase();

  console.log(
    "Thumbnail image provider:",
    imageProvider || "gemini"
  );

  if (imageProvider === "cloudflare") {
    const imageUrl =
      await generateCloudflareImage({
        prompt: finalPrompt,
      });

    return {
      imageUrl,
      prompt: finalPrompt,
      provider:
        "cloudflare-workers-ai",
      model:
        process.env.CLOUDFLARE_IMAGE_MODEL ||
        "@cf/black-forest-labs/flux-1-schnell",
      generatedAt:
        new Date().toISOString(),
    };
  }

  const apiKey = cleanString(
    process.env.GEMINI_API_KEY
  )
    .replace(/^["']|["']$/g, "")
    .trim();

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured on the backend"
    );
  }

  if (apiKey.startsWith("Bearer ")) {
    throw new Error(
      "GEMINI_API_KEY me Bearer mat lagao. Sirf raw API key rakho."
    );
  }

  const model = cleanString(
    process.env.GEMINI_IMAGE_MODEL,
    "gemini-3.1-flash-image"
  );

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`,
    {
      method: "POST",

      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: finalPrompt,
              },
            ],
          },
        ],
      }),
    }
  );

  const rawText =
    await response
      .text()
      .catch(() => "");

  let data = {};

  try {
    data = rawText
      ? JSON.parse(rawText)
      : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    console.error(
      "Gemini thumbnail HTTP status:",
      response.status
    );

    console.error(
      "Gemini thumbnail raw response:",
      rawText
    );

    throw new Error(
      data?.error?.message ||
        data?.errors?.[0]?.message ||
        data?.message ||
        rawText ||
        `Failed to generate Gemini thumbnail. HTTP ${response.status}`
    );
  }

  const parts =
    data?.candidates?.[0]?.content
      ?.parts || [];

  const imagePart = parts.find(
    (part) => {
      return (
        part?.inlineData?.data ||
        part?.inline_data?.data
      );
    }
  );

  const imageBase64 =
    imagePart?.inlineData?.data ||
    imagePart?.inline_data?.data ||
    "";

  const mimeType =
    imagePart?.inlineData?.mimeType ||
    imagePart?.inline_data?.mime_type ||
    "image/png";

  if (!imageBase64) {
    const textResponse = parts
      .map((part) => part.text || "")
      .filter(Boolean)
      .join(" ");

    console.error(
      "Gemini thumbnail no image response:",
      rawText
    );

    throw new Error(
      textResponse ||
        "Gemini did not return image data. Try gemini-3.1-flash-lite-image or check image model access."
    );
  }

  return {
    imageUrl:
      `data:${mimeType};base64,${imageBase64}`,

    prompt:
      finalPrompt,

    provider:
      "gemini-generate-content",

    model,

    generatedAt:
      new Date().toISOString(),
  };
}

module.exports = {
  createResearchResult,
  analyzeCompetitorChannelResult,
  createContentPackResult,
  generateThumbnailResult,
};