function cleanString(value, maxLength = 100000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function getApiBaseUrl() {
  const configuredUrl = cleanString(
    process.env.BLUESMINDS_BASE_URL ||
      "https://api.bluesminds.com",
    1000
  ).replace(/\/+$/, "");

  /*
   * Both formats are accepted:
   *
   * https://api.bluesminds.com
   * https://api.bluesminds.com/v1
   */
  return configuredUrl.endsWith("/v1")
    ? configuredUrl
    : `${configuredUrl}/v1`;
}

function extractMessageText(content) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;

        return (
          item?.text ||
          item?.content ||
          item?.value ||
          ""
        );
      })
      .filter(Boolean)
      .join("")
      .trim();
  }

  if (content && typeof content === "object") {
    return cleanString(
      content.text ||
        content.content ||
        content.value ||
        "",
      100000
    );
  }

  return "";
}

function extractJsonFromText(text) {
  const value = cleanString(text, 100000);

  if (!value) {
    throw new Error(
      "Bluesminds model returned an empty response."
    );
  }

  try {
    return JSON.parse(value);
  } catch {
    // Continue with fenced JSON extraction.
  }

  const fencedMatch = value.match(
    /```(?:json)?\s*([\s\S]*?)```/i
  );

  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch {
      // Continue with object extraction.
    }
  }

  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return JSON.parse(
        value.slice(firstBrace, lastBrace + 1)
      );
    } catch {
      // Throw the final error below.
    }
  }

  throw new Error(
    "Bluesminds model response was not valid JSON."
  );
}

async function generateBluesmindsText({
  messages,
  temperature = 0.7,
  maxTokens = 5000,
}) {
  const apiKey = cleanString(
    process.env.BLUESMINDS_API_KEY,
    2000
  );

  const model = cleanString(
    process.env.BLUESMINDS_MODEL,
    300
  );

  if (!apiKey) {
    const error = new Error(
      "BLUESMINDS_API_KEY is not configured."
    );
    error.statusCode = 500;
    throw error;
  }

  if (!model) {
    const error = new Error(
      "BLUESMINDS_MODEL is not configured. Use the exact model ID shown in your Bluesminds panel."
    );
    error.statusCode = 500;
    throw error;
  }

  const baseUrl = getApiBaseUrl();
  const timeoutMs = Number(
    process.env.BLUESMINDS_TIMEOUT_MS || 180000
  );

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(
      `${baseUrl}/chat/completions`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
      }
    );

    const data = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      const providerMessage =
        data?.error?.message ||
        data?.message ||
        data?.error ||
        `Bluesminds API returned HTTP ${response.status}.`;

      const error = new Error(
        typeof providerMessage === "string"
          ? providerMessage
          : JSON.stringify(providerMessage)
      );

      error.statusCode = response.status || 500;
      throw error;
    }

    const content =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      data?.output_text ??
      "";

    const text = extractMessageText(content);

    if (!text) {
      const error = new Error(
        "Bluesminds API returned no generated content."
      );
      error.statusCode = 502;
      throw error;
    }

    return text;
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error(
        "Bluesminds model took too long to generate the content pack."
      );

      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateBluesmindsJson({
  prompt,
  systemPrompt,
  maxTokens = 5000,
}) {
  const text = await generateBluesmindsText({
    maxTokens,
    messages: [
      {
        role: "system",
        content:
          systemPrompt ||
          "You are a premium creator-content strategist. Return only one valid JSON object without markdown.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return extractJsonFromText(text);
}

module.exports = {
  generateBluesmindsText,
  generateBluesmindsJson,
};