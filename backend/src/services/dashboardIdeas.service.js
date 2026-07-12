const GROQ_CHAT_COMPLETIONS_URL =
  "https://api.groq.com/openai/v1/chat/completions";

function cleanString(value, maxLength = 2000) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
const { generateNvidiaJson } = require("./nvidia.service");
function clampInteger(value, fallback, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(number)));
}

function parseJsonFromText(text) {
  const value = String(text || "").trim();

  if (!value) {
    throw new Error("Groq returned an empty dashboard response.");
  }

  try {
    return JSON.parse(value);
  } catch {
    // Continue with fenced/object extraction below.
  }

  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim());
  }

  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(value.slice(firstBrace, lastBrace + 1));
  }

  throw new Error("Groq returned invalid JSON for dashboard ideas.");
}

function uniqueTextList(value, { maxItems, maxLength }) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();

  return value
    .map((item) => cleanString(item, maxLength))
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, maxItems);
}

function normalizeCompetition(value) {
  const cleanValue = cleanString(value, 20).toLowerCase();

  if (cleanValue === "low") return "Low";
  if (cleanValue === "high") return "High";

  return "Medium";
}

function normalizeDifficulty(value) {
  const cleanValue = cleanString(value, 40).toLowerCase();

  if (cleanValue === "easy win") return "Easy Win";
  if (cleanValue === "high reward") return "High Reward";

  return "Medium Effort";
}

function normalizeOpportunity(value) {
  const cleanValue = cleanString(value, 20).toLowerCase();

  if (cleanValue === "high") return "High";
  if (cleanValue === "exploratory") return "Exploratory";

  return "Medium";
}

function normalizeTopics(value, input) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();

  return value
    .map((item) => {
      const topic = cleanString(item?.topic || item?.title || item, 180);

      if (!topic) {
        return null;
      }

      const key = topic.toLowerCase();

      if (seen.has(key)) {
        return null;
      }

      seen.add(key);

      const opportunity = normalizeOpportunity(
        item?.opportunity || item?.growth
      );

      return {
        topic,
        // Dashboard previously displayed an Apify-derived growth number.
        // This value is intentionally an AI content-opportunity label, not a
        // claim about live views, ranking, or real-time trend velocity.
        growth: opportunity,
        growthSource: "groq_ai_content_opportunity",
        competition: normalizeCompetition(item?.competition),
        difficulty: normalizeDifficulty(item?.difficulty),
        insight:
          cleanString(item?.insight, 320) ||
          `A tailored ${input.platform} angle for ${input.audience} in the ${input.niche} niche.`,
        shareText: `AI Content Idea: ${topic}\nNiche: ${input.niche}\nPlatform: ${input.platform}\nAI opportunity: ${opportunity}`,
      };
    })
    .filter(Boolean)
    .slice(0, input.limit);
}

function buildPrompt(input) {
  return `You are a senior content strategist inside a creator-content dashboard.

Generate original, actionable content ideas for ONE creator. The user needs creative recommendations they can turn into videos now.

Important truthfulness rules:
- Treat “fresh topics” as fresh AI-generated content angles, NOT as verified live trends.
- Do NOT claim you checked YouTube, Google, social media, competitors, search volume, rankings, views, or current events.
- Do NOT invent statistics, dates, sources, links, creator names, or performance guarantees.
- Do NOT repeat the same core idea with small word changes.
- Keep every recommendation specific to the given niche, platform, audience, and content style.

Return ONLY valid JSON. No markdown or extra text.

Return this exact JSON shape:
{
  "trendingTopics": [
    {
      "topic": "specific content idea",
      "opportunity": "High | Medium | Exploratory",
      "competition": "Low | Medium | High",
      "difficulty": "Easy Win | Medium Effort | High Reward",
      "insight": "one specific reason this angle is valuable for the creator's target audience"
    }
  ],
  "viralHooks": [
    "one strong opening hook",
    "another strong opening hook"
  ],
  "titleSuggestions": [
    "specific clickable title",
    "another specific clickable title"
  ]
}

Generation requirements:
- Return exactly ${input.limit} topic objects.
- Return exactly 6 viral hooks.
- Return exactly 6 title suggestions.
- Hooks must work as first spoken lines for videos or Shorts.
- Titles must be natural, compelling, truthful, and under 75 characters where possible.
- Include different angles: beginner pain points, mistakes, comparison, challenge, myth-busting, step-by-step, transformation, opinion, and practical workflow where relevant.
- Do not use generic filler such as “Unlock your potential”, “Game changer”, or “This will change your life”.

Creator context:
Niche: ${input.niche}
Platform: ${input.platform}
Target audience: ${input.audience}
Preferred language: ${input.language}
Content style: ${input.contentStyle}
`;
}
async function requestGroqDashboardJson(prompt) {
  if (String(process.env.AI_TEXT_PROVIDER || "").toLowerCase() === "nvidia") {
    const model = process.env.NVIDIA_MODEL || "deepseek-ai/deepseek-v4-pro";

    const raw = await generateNvidiaJson({
      prompt,
      maxTokens: 4096,
      systemPrompt:
        "You produce premium creator-content strategy as one valid JSON object. Never invent live research data, web results, statistics, or guarantees. Return JSON only.",
    });

    return {
      raw,
      model,
    };
  }

  const apiKey = cleanString(process.env.GROQ_API_KEY, 400);
  const model = cleanString(
    process.env.GROQ_DASHBOARD_MODEL ||
    process.env.GROQ_MODEL ||
    "llama-3.3-70b-versatile",
    160
  );

  if (!apiKey) {
    const error = new Error("GROQ_API_KEY is not configured in backend .env.");
    error.statusCode = 500;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.9,
        max_completion_tokens: 3200,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content:
              "You produce creator-content ideas as one valid JSON object. Never invent live research data, web results, statistics, or guarantees.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        data?.error?.message ||
        data?.message ||
        "Groq could not generate dashboard ideas."
      );

      error.statusCode = response.status || 500;
      throw error;
    }

    const text = cleanString(data?.choices?.[0]?.message?.content, 50000);

    return {
      raw: parseJsonFromText(text),
      model,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error(
        "Groq took too long to generate ideas. Please try again."
      );

      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateDashboardIdeasWithGroq({
  niche,
  platform = "YouTube",
  audience = "New creators",
  limit = 20,
  language = "English",
  contentStyle = "Educational, practical, and creator-friendly",
}) {
  const input = {
    niche: cleanString(niche, 180),
    platform: cleanString(platform, 80) || "YouTube",
    audience: cleanString(audience, 220) || "New creators",
    language: cleanString(language, 80) || "English",
    contentStyle:
      cleanString(contentStyle, 180) ||
      "Educational, practical, and creator-friendly",
    limit: clampInteger(limit, 20, 4, 20),
  };

  if (!input.niche) {
    const error = new Error("Niche is required to generate AI content ideas.");
    error.statusCode = 400;
    throw error;
  }

  const { raw, model } = await requestGroqDashboardJson(buildPrompt(input));
  const trendingTopics = normalizeTopics(raw?.trendingTopics, input);
  const viralHooks = uniqueTextList(raw?.viralHooks, {
    maxItems: 6,
    maxLength: 300,
  });
  const titleSuggestions = uniqueTextList(raw?.titleSuggestions, {
    maxItems: 6,
    maxLength: 180,
  });

  if (
    trendingTopics.length < 4 ||
    viralHooks.length < 4 ||
    titleSuggestions.length < 4
  ) {
    const error = new Error(
      "Groq returned incomplete dashboard ideas. Please generate again."
    );

    error.statusCode = 502;
    throw error;
  }

  const generatedAt = new Date().toISOString();

  return {
    niche: input.niche,
    platform: input.platform,
    audience: input.audience,
    trendingTopics,
    viralHooks,
    titleSuggestions,
    // Real competitor metrics remain in the dedicated Trends/Competitors
    // sections. This AI-generation endpoint does not fabricate competitors.
    competitors: [],
    sourceVideos: [],
    source: "groq",
    meta: {
      aiProvider: "groq",
      model,
      generatedAt,
      isCached: false,
      isLiveData: false,
      note: "AI-generated content recommendations. They are not verified live trend or view metrics.",
    },
  };
}

module.exports = {
  generateDashboardIdeasWithGroq,
};
