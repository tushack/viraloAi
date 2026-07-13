function cleanString(value, fallback = "") {
    if (value === undefined || value === null) return fallback;

    return (
        String(value)
            .replace(/^["']|["']$/g, "")
            .trim() || fallback
    );
}

function normalizeBase64Image(value, mimeType = "image/png") {
    if (!value || typeof value !== "string") {
        return "";
    }

    if (value.startsWith("data:")) {
        return value;
    }

    return `data:${mimeType};base64,${value}`;
}

function extractImageFromCloudflareJson(data) {
    const result = data?.result;

    if (typeof result === "string") {
        return normalizeBase64Image(result);
    }

    if (result && typeof result === "object") {
        const possibleImage =
            result.image ||
            result.data ||
            result.b64_json ||
            result.base64 ||
            result.output_image ||
            result.outputImage ||
            result.images?.[0] ||
            result.outputs?.[0] ||
            result.output?.[0];

        if (typeof possibleImage === "string") {
            return normalizeBase64Image(possibleImage);
        }

        if (possibleImage && typeof possibleImage === "object") {
            const nestedImage =
                possibleImage.image ||
                possibleImage.data ||
                possibleImage.b64_json ||
                possibleImage.base64;

            if (typeof nestedImage === "string") {
                return normalizeBase64Image(nestedImage);
            }
        }
    }

    const directImage =
        data?.image ||
        data?.data ||
        data?.b64_json ||
        data?.base64 ||
        data?.images?.[0];

    if (typeof directImage === "string") {
        return normalizeBase64Image(directImage);
    }

    return "";
}

async function generateCloudflareImage({ prompt }) {
    const accountId = cleanString(process.env.CLOUDFLARE_ACCOUNT_ID);
    const apiToken = cleanString(process.env.CLOUDFLARE_API_TOKEN);
    const model = cleanString(
        process.env.CLOUDFLARE_IMAGE_MODEL,
        "@cf/black-forest-labs/flux-1-schnell"
    );

    if (!accountId) {
        throw new Error("CLOUDFLARE_ACCOUNT_ID is not configured.");
    }

    if (!apiToken) {
        throw new Error("CLOUDFLARE_API_TOKEN is not configured.");
    }

    if (apiToken.startsWith("Bearer ")) {
        throw new Error(
            "CLOUDFLARE_API_TOKEN me Bearer mat lagao. Sirf raw token rakho."
        );
    }

    console.log(
        "Cloudflare AI config:",
        `account=${accountId.slice(0, 6)}...`,
        `token=${apiToken.slice(0, 6)}... len=${apiToken.length}`,
        `model=${model}`
    );

    const width = Number(process.env.CLOUDFLARE_IMAGE_WIDTH || 1024);
    const height = Number(process.env.CLOUDFLARE_IMAGE_HEIGHT || 576);
    const numSteps = Number(process.env.CLOUDFLARE_IMAGE_STEPS || 4);

    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt,
                width,
                height,
                num_steps: numSteps,
                negative_prompt:
                    "text, letters, words, captions, watermark, logo, signature, blurry, distorted, ugly layout",
            }),
        }
    );

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        const rawBody = await response.text().catch(() => "");
        let data = {};

        try {
            data = rawBody ? JSON.parse(rawBody) : {};
        } catch {
            data = {};
        }

        if (!response.ok || data?.success === false) {
            console.error("Cloudflare AI HTTP status:", response.status);
            console.error("Cloudflare AI raw response:", rawBody);

            throw new Error(
                data?.errors?.[0]?.message ||
                data?.error?.message ||
                data?.message ||
                rawBody ||
                `Cloudflare Workers AI failed. HTTP ${response.status}`
            );
        }

        const imageUrl = extractImageFromCloudflareJson(data);

        if (imageUrl) {
            return imageUrl;
        }

        console.error("Cloudflare AI success response without parsed image:", rawBody);

        throw new Error(
            "Cloudflare Workers AI response format was not recognized. Check terminal raw response."
        );
    }

    if (!response.ok) {
        const rawBody = await response.text().catch(() => "");

        console.error("Cloudflare AI HTTP status:", response.status);
        console.error("Cloudflare AI raw response:", rawBody);

        throw new Error(
            rawBody || `Cloudflare Workers AI failed. HTTP ${response.status}`
        );
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    return `data:${contentType || "image/png"};base64,${buffer.toString(
        "base64"
    )}`;
}


function extractTextFromCloudflareJson(data) {
    const result = data?.result;

    if (typeof result === "string") {
        return result;
    }

    if (result && typeof result === "object") {
        return (
            result.response ||
            result.text ||
            result.content ||
            result.output_text ||
            result.outputText ||
            result.message ||
            result.choices?.[0]?.message?.content ||
            result.outputs?.[0]?.text ||
            result.output?.[0]?.text ||
            ""
        );
    }

    return data?.response || data?.text || data?.content || "";
}

function extractJsonFromText(text) {
    const value = String(text || "").trim();

    if (!value) {
        throw new Error("Cloudflare model returned empty response.");
    }

    try {
        return JSON.parse(value);
    } catch {
        // Continue below.
    }

    const fencedMatch = value.match(/```(?:json)?\s*([\s\S]*?)```/i);

    if (fencedMatch?.[1]) {
        return JSON.parse(fencedMatch[1].trim());
    }

    const firstBrace = value.indexOf("{");
    const lastBrace = value.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
        return JSON.parse(value.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("Cloudflare model response was not valid JSON.");
}

async function generateCloudflareText({
    messages,
    maxTokens = 1600,
    temperature = 0.75,
}) {
    const accountId = cleanString(process.env.CLOUDFLARE_ACCOUNT_ID);
    const apiToken = cleanString(process.env.CLOUDFLARE_API_TOKEN);
    const model = cleanString(
        process.env.CLOUDFLARE_TEXT_MODEL,
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    );

    if (!accountId) {
        throw new Error("CLOUDFLARE_ACCOUNT_ID is not configured.");
    }

    if (!apiToken) {
        throw new Error("CLOUDFLARE_API_TOKEN is not configured.");
    }

    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages,
                max_tokens: Number(process.env.CLOUDFLARE_TEXT_MAX_TOKENS || maxTokens),
                temperature,
            }),
        }
    );

    const rawBody = await response.text().catch(() => "");
    let data = {};

    try {
        data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
        data = {};
    }

    if (!response.ok || data?.success === false) {
        console.error("Cloudflare text HTTP status:", response.status);
        console.error("Cloudflare text raw response:", rawBody);

        throw new Error(
            data?.errors?.[0]?.message ||
            data?.error?.message ||
            data?.message ||
            rawBody ||
            `Cloudflare text generation failed. HTTP ${response.status}`
        );
    }

    const text = extractTextFromCloudflareJson(data);

    if (!text) {
        console.error("Cloudflare text success response without parsed text:", rawBody);
        throw new Error("Cloudflare text response format was not recognized.");
    }

    return text;
}

async function generateCloudflareJson({
    prompt,
    systemPrompt,
    maxTokens = 1600,
}) {
    const text = await generateCloudflareText({
        maxTokens,
        messages: [
            {
                role: "system",
                content:
                    systemPrompt ||
                    "Return only one valid JSON object. No markdown. No explanation.",
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
    generateCloudflareImage,
    generateCloudflareText,
    generateCloudflareJson,
};

