const GROQ_CHAT_COMPLETIONS_URL =
  "https://api.groq.com/openai/v1/chat/completions";

// No hardcoded posting windows or view multipliers.
// All contextual outputs (posting window, view range, etc.) come from Claude.

function cleanString(value, maxLength = 4000) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function clampScore(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function toStringList(value, maxItems = 4) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(item, 260))
    .filter(Boolean)
    .slice(0, maxItems);
}

function parseJsonFromText(text) {
  const value = String(text || "").trim();
  if (!value) throw new Error("Viralo AI returned an empty analysis.");

  try {
    return JSON.parse(value);
  } catch { /* continue */ }

  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return JSON.parse(fenced[1].trim());

  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(value.slice(firstBrace, lastBrace + 1));
  }

  throw new Error("Viralo AI returned an invalid JSON response.");
}

function getLevel(score) {
  if (score >= 80) return "High Potential";
  if (score >= 65) return "Strong Potential";
  if (score >= 45) return "Needs Refinement";
  return "Low Potential";
}

function getPrompt(input) {
  const hasAverageViews =
    Number.isFinite(Number(input.averageViews)) && Number(input.averageViews) > 0;

  return `You are Viralo AI's pre-publish packaging evaluator.

Assess only the likely CONTENT PACKAGING POTENTIAL based on the user's submitted text. Be specific, constructive, and realistic. Do NOT claim you can guarantee virality, exact views, audience behaviour, or real-time trend data.

Return ONLY valid JSON. No markdown, no code fences, no commentary outside the JSON.

Return this exact shape:
{
  "viralScore": 0,
  "level": "High Potential | Strong Potential | Needs Refinement | Low Potential",
  "confidence": "Low | Medium | High",
  "summary": "1-2 sentence packaging assessment specific to this content",
  "dimensions": {
    "titleStrength": { "score": 0, "reason": "specific reason for this title" },
    "thumbnailPower": { "score": 0, "reason": "specific reason based only on thumbnail description given" },
    "curiosityFactor": { "score": 0, "reason": "how emotion/curiosity/urgency works in this specific content" },
    "nicheRelevance": { "score": 0, "reason": "specific to '${input.niche}' niche and '${input.audience}' audience" },
    "competition": { "score": 0, "reason": "differentiation opportunity for this specific topic, higher = better opportunity" }
  },
  "strengths": ["strength specific to this content", "strength 2", "strength 3"],
  "risks": ["specific risk for this content", "risk 2", "risk 3"],
  "betterTitles": ["improved title 1 preserving the topic", "improved title 2", "improved title 3"],
  "thumbnailTips": ["specific tip based on described thumbnail", "tip 2", "tip 3"],
  "improvements": {
    "topic": "specific way to sharpen this exact topic angle",
    "title": "specific improvement for this title",
    "thumbnail": "specific improvement for the thumbnail described",
    "description": "specific improvement for the content described",
    "openingHook": "specific improvement for the hook provided or a strong hook suggestion for this topic"
  },
  "rewrittenDescription": "2 short sentences the creator can use as a clearer content direction for this specific video",
  "postingWindow": {
    "window": "best time window for ${input.platform} with ${input.niche} audience — give a real time range, not 'it depends'",
    "timezone": "${cleanString(input.timezone || "Your audience timezone", 80)}",
    "note": "one sentence: why this window works for this platform and content type"
  },
  ${hasAverageViews ? `"viewPlanningRange": {
    "available": true,
    "lowerEstimate": <integer: conservative estimate based on ${input.averageViews} usual views and this packaging score>,
    "upperEstimate": <integer: optimistic estimate based on ${input.averageViews} usual views and this packaging score>,
    "note": "one sentence: this is a packaging-based planning estimate, not a guaranteed result"
  },` : `"viewPlanningRange": {
    "available": false,
    "message": "Add your usual average views in the form to see a planning range."
  },`}
  "disclaimer": "one concise sentence: this is a packaging estimate, not a guaranteed viral outcome."
}

Scoring guidance:
- All scores must be integers from 0 to 100.
- Use all five dimensions exactly as named.
- Do NOT invent real competitor data, trend rankings, or audience analytics you cannot know.
- Better titles must preserve the user's actual topic — no misleading clickbait.
- Every field must be specific to THIS content, not generic advice.

User input:
Platform: ${input.platform}
Content type: ${input.contentType}
Niche: ${input.niche}
Target audience: ${input.audience}
Topic: ${input.topic}
Title: ${input.title}
Thumbnail description: ${input.thumbnailDescription}
Content description / short script: ${input.description}
Opening hook: ${input.openingHook || "Not provided"}
`;
}

async function requestGroqJson(prompt) {
  const apiKey = cleanString(process.env.GROQ_API_KEY, 300);
  const model = cleanString(process.env.GROQ_MODEL, 120);

  if (!apiKey) {
    const error = new Error("GROQ_API_KEY is not configured.");
    error.statusCode = 500;
    throw error;
  }

  if (!model) {
    const error = new Error(
      "GROQ_MODEL is not configured. Add GROQ_MODEL in backend/.env."
    );
    error.statusCode = 500;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

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
        temperature: 0.35,
        max_completion_tokens: 1800,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content:
              "You are a careful creator-content packaging analyst. Return only one valid JSON object. Every analysis must be specific to the content submitted, never generic.",
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
          "Groq API request failed."
      );

      error.statusCode = response.status || 500;
      throw error;
    }

    const text = String(
      data?.choices?.[0]?.message?.content || ""
    ).trim();

    return parseJsonFromText(text);
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error(
        "AI analysis took too long. Please try again."
      );

      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeDimension(value) {
  return {
    score: clampScore(value?.score),
    reason: cleanString(value?.reason, 220) || "No reason returned.",
  };
}

function normalizeResult(raw, input) {
  const score = clampScore(raw?.viralScore, 50);

  // Posting window — from Claude, no hardcoded fallback
  const postingWindow = {
    label: "Suggested testing window",
    window: cleanString(raw?.postingWindow?.window, 120) || "Check your platform analytics for best times",
    timezone: cleanString(raw?.postingWindow?.timezone || input.timezone, 80),
    note: cleanString(raw?.postingWindow?.note, 200) || "Validate against your own platform analytics after publishing.",
  };

  // View planning range — from Viralo AI if averageViews provided
  let viewPlanningRange;
  const hasAverageViews =
    Number.isFinite(Number(input.averageViews)) && Number(input.averageViews) > 0;

  if (hasAverageViews && raw?.viewPlanningRange?.available) {
    viewPlanningRange = {
      available: true,
      basedOnAverageViews: Math.round(Number(input.averageViews)),
      lowerEstimate: Math.max(0, Math.round(Number(raw.viewPlanningRange.lowerEstimate) || 0)),
      upperEstimate: Math.max(0, Math.round(Number(raw.viewPlanningRange.upperEstimate) || 0)),
      label: "Planning range",
      note:
        cleanString(raw.viewPlanningRange.note, 200) ||
        "Packaging-based planning estimate. Not a guaranteed result.",
    };
  } else {
    viewPlanningRange = {
      available: false,
      message:
        cleanString(raw?.viewPlanningRange?.message, 200) ||
        "Add your usual average views to see a planning range.",
    };
  }

  return {
    viralScore: score,
    level: getLevel(score),
    confidence: ["Low", "Medium", "High"].includes(raw?.confidence)
      ? raw.confidence
      : "Medium",
    summary:
      cleanString(raw?.summary, 420) ||
      "This is a packaging assessment based on your submitted title and content details.",
    dimensions: {
      titleStrength: normalizeDimension(raw?.dimensions?.titleStrength),
      thumbnailPower: normalizeDimension(raw?.dimensions?.thumbnailPower),
      curiosityFactor: normalizeDimension(raw?.dimensions?.curiosityFactor),
      nicheRelevance: normalizeDimension(raw?.dimensions?.nicheRelevance),
      competition: normalizeDimension(raw?.dimensions?.competition),
    },
    strengths: toStringList(raw?.strengths, 3),
    risks: toStringList(raw?.risks, 3),
    betterTitles: toStringList(raw?.betterTitles, 3),
    thumbnailTips: toStringList(raw?.thumbnailTips, 3),
    improvements: {
      topic: cleanString(raw?.improvements?.topic, 320),
      title: cleanString(raw?.improvements?.title, 320),
      thumbnail: cleanString(raw?.improvements?.thumbnail, 320),
      description: cleanString(raw?.improvements?.description, 320),
      openingHook: cleanString(raw?.improvements?.openingHook, 320),
    },
    rewrittenDescription: cleanString(raw?.rewrittenDescription, 700),
    postingWindow,
    viewPlanningRange,
    disclaimer:
      cleanString(raw?.disclaimer, 260) ||
      "This is a pre-publish packaging estimate, not a guaranteed viral outcome or exact view prediction.",
    provider: "anthropic",
    analyzedAt: new Date().toISOString(),
  };
}

function validateInput(payload) {
  const input = {
    platform: cleanString(payload?.platform, 80),
    contentType: cleanString(payload?.contentType, 80),
    niche: cleanString(payload?.niche, 160),
    audience: cleanString(payload?.audience, 200),
    topic: cleanString(payload?.topic, 280),
    title: cleanString(payload?.title, 180),
    thumbnailDescription: cleanString(payload?.thumbnailDescription, 900),
    description: cleanString(payload?.description, 2500),
    openingHook: cleanString(payload?.openingHook, 800),
    timezone: cleanString(payload?.timezone, 80),
    averageViews: payload?.averageViews,
  };

  const required = [
    ["platform", "Platform"],
    ["contentType", "Content type"],
    ["niche", "Niche"],
    ["audience", "Target audience"],
    ["topic", "Topic"],
    ["title", "Video title"],
    ["thumbnailDescription", "Thumbnail description"],
    ["description", "Content description"],
  ];

  for (const [field, label] of required) {
    if (!input[field]) {
      const error = new Error(`${label} is required.`);
      error.statusCode = 400;
      throw error;
    }
  }

  return input;
}

async function analyzeViralPotential(payload) {
  const input = validateInput(payload);
const rawResult = await requestGroqJson(getPrompt(input));
  return normalizeResult(rawResult, input);
}

module.exports = { analyzeViralPotential };