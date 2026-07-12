function cleanString(value, maxLength = 50000) {
    return String(value || "").trim().slice(0, maxLength);
}

function extractJsonFromText(text) {
    const value = cleanString(text, 100000);

    if (!value) {
        throw new Error("NVIDIA model returned empty response.");
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

    throw new Error("NVIDIA model response was not valid JSON.");
}

async function generateNvidiaText({
    messages,
    temperature = 0.85,
    topP = 0.95,
    maxTokens = 4096,
}) {
    const apiKey = cleanString(process.env.NVIDIA_API_KEY, 1000);
    const baseUrl = cleanString(
        process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
        1000
    );
    const model = cleanString(
        process.env.NVIDIA_MODEL || "deepseek-ai/deepseek-v4-pro",
        200
    );

    if (!apiKey) {
        const error = new Error("NVIDIA_API_KEY is not configured in backend .env.");
        error.statusCode = 500;
        throw error;
    }

    const controller = new AbortController();
    const timeoutMs = Number(process.env.NVIDIA_TIMEOUT_MS || 180000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
            method: "POST",
            signal: controller.signal,
            headers: {
                "content-type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                top_p: topP,
                max_tokens: maxTokens,

                // Python SDK me jo extra_body diya tha, raw HTTP me direct body me jayega.
                chat_template_kwargs: {
                    thinking: false,
                },
            }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const error = new Error(
                data?.error?.message ||
                data?.message ||
                "NVIDIA model request failed."
            );

            error.statusCode = response.status || 500;
            throw error;
        }

        return cleanString(data?.choices?.[0]?.message?.content, 100000);
    } catch (error) {
        if (error.name === "AbortError") {
            const timeoutError = new Error(
                "NVIDIA model took too long to generate content. Please try again."
            );
            timeoutError.statusCode = 504;
            throw timeoutError;
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

async function generateNvidiaJson({ prompt, systemPrompt, maxTokens = 8192 }) {
    const text = await generateNvidiaText({
        maxTokens,
        messages: [
            {
                role: "system",
                content:
                    systemPrompt ||
                    "You are a premium creator-content strategist. Return only one valid JSON object. Do not use markdown.",
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
    generateNvidiaText,
    generateNvidiaJson,
};