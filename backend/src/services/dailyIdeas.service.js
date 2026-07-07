const supabase = require("../config/supabase");
const {
  generateDashboardIdeasWithGroq,
} = require("./dashboardIdeas.service");

function parseResponseJson(value) {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (typeof value === "object") {
    return value;
  }

  return null;
}

function isSameDay(dateValue) {
  if (!dateValue) return false;

  const date = new Date(dateValue);
  const now = new Date();

  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isGroqDashboardResponse(response) {
  return Boolean(
    response &&
      (response.source === "groq" || response?.meta?.aiProvider === "groq")
  );
}

async function getLatestResearch({ userId, niche }) {
  let query = supabase
    .from("research_queries")
    .select("id, niche, platform, audience, response_json, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (niche) {
    query = query.eq("niche", niche);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data?.[0] || null;
}

async function saveGroqDashboardIdeas({
  userId,
  niche,
  platform,
  audience,
  response,
}) {
  const { error } = await supabase.from("research_queries").insert({
    user_id: userId,
    niche,
    platform,
    audience,
    response_json: response,
  });

  if (error) {
    // Do not fail a good AI response just because history saving is unavailable.
    console.error("Groq dashboard history save error:", error.message);
  }
}

async function getDailyNicheIdeasService({
  userId,
  niche,
  platform = "YouTube",
  audience = "New creators",
  limit = 20,
  forceRefresh = false,
}) {
  const requestedNiche = String(niche || "").trim();

  const latestAnyResearch = requestedNiche
    ? null
    : await getLatestResearch({ userId });

  const finalNiche = requestedNiche || latestAnyResearch?.niche || "";

  if (!finalNiche) {
    return {
      niche: "",
      platform,
      audience,
      trendingTopics: [],
      viralHooks: [],
      titleSuggestions: [],
      competitors: [],
      source: "empty",
      meta: {
        needsNiche: true,
        isCached: false,
        message: "Set your niche to generate AI content ideas.",
      },
    };
  }

  const latestNicheResearch = await getLatestResearch({
    userId,
    niche: finalNiche,
  });

  const latestResponse = parseResponseJson(latestNicheResearch?.response_json);
  const requestedLimit = Math.max(4, Math.min(Number(limit) || 20, 20));

  const hasEnoughTopics =
    Array.isArray(latestResponse?.trendingTopics) &&
    latestResponse.trendingTopics.length >= Math.min(requestedLimit, 4);

  // Only Groq-generated results are allowed to populate the dashboard cards.
  // Old Apify/fallback records are deliberately ignored here.
  const canUseTodayGroqCache =
    !forceRefresh &&
    latestNicheResearch &&
    isGroqDashboardResponse(latestResponse) &&
    hasEnoughTopics &&
    isSameDay(latestNicheResearch.created_at);

  if (canUseTodayGroqCache) {
    return {
      ...latestResponse,
      niche: finalNiche,
      platform: latestNicheResearch.platform || platform,
      audience: latestNicheResearch.audience || audience,
      meta: {
        ...(latestResponse.meta || {}),
        aiProvider: "groq",
        niche: finalNiche,
        platform: latestNicheResearch.platform || platform,
        audience: latestNicheResearch.audience || audience,
        isCached: true,
        latestQueryId: latestNicheResearch.id,
        generatedAt: latestNicheResearch.created_at,
        isFromToday: true,
      },
    };
  }

  const response = await generateDashboardIdeasWithGroq({
    niche: finalNiche,
    platform,
    audience,
    limit: requestedLimit,
  });

  await saveGroqDashboardIdeas({
    userId,
    niche: finalNiche,
    platform,
    audience,
    response,
  });

  return response;
}

module.exports = {
  getDailyNicheIdeasService,
};
