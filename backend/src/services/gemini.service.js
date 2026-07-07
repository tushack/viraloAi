function extractJsonFromText(text) {
  const value = String(text || "").trim();

  if (!value) {
    throw new Error("Gemini returned empty response");
  }

  try {
    return JSON.parse(value);
  } catch {
    // Continue below.
  }

  const fencedMatch = value.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch {
      // Continue below.
    }
  }

  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(value.slice(firstBrace, lastBrace + 1));
  }

  throw new Error("Gemini response was not valid JSON");
}

async function generateGeminiJson({ prompt }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.75,
          topP: 0.9,
          maxOutputTokens: 5000,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error?.message || data?.message || "Gemini API request failed"
    );
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || "";

  return extractJsonFromText(text);
}

module.exports = {
  generateGeminiJson,
};