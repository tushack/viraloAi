const supabase = require("../config/supabase");
const {
    runApifyYouTubeSearch,
} = require("./apify.service");

const {
    getMostPopularYouTubeVideos,
} = require("./youtubePublicTrends.service");
const {
    getUserInterestProfile,
} = require("./personalization.service");

const CACHE_TTL_MINUTES = Math.max(
    5,
    Number(process.env.TRENDS_CACHE_TTL_MINUTES || 30)
);

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;

const REFRESH_FRESH_RATIO = Math.min(
    0.9,
    Math.max(
        0.5,
        Number(process.env.TRENDS_REFRESH_FRESH_RATIO || 0.65)
    )
);

const MAX_CONTINUING_CACHE_AGE_HOURS = Math.max(
    1,
    Number(process.env.TRENDS_CONTINUING_CACHE_MAX_HOURS || 48)
);

const REGION_COUNTRIES = {
    India: ["in"],
    "United States": ["us"],
    "United Kingdom": ["gb"],
    Canada: ["ca"],
    Australia: ["au"],
    Global: ["in", "us", "gb"],
};

const PLATFORM_OPTIONS = new Set(["YouTube", "YouTube Shorts"]);

function cleanString(value, maxLength = 4000) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function slugify(value) {
    return cleanString(value, 260)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function pickField(item, fields, fallback = "") {
    for (const field of fields) {
        if (item && item[field] !== undefined && item[field] !== null) {
            return item[field];
        }
    }

    return fallback;
}

function asText(value, fallback = "") {
    if (typeof value === "string") return value.trim() || fallback;
    if (typeof value === "number") return String(value);

    if (Array.isArray(value)) {
        return value.map((item) => asText(item, "")).filter(Boolean).join(", ");
    }

    if (value && typeof value === "object") {
        return (
            asText(value.title, "") ||
            asText(value.name, "") ||
            asText(value.text, "") ||
            asText(value.url, "") ||
            fallback
        );
    }

    return fallback;
}

function parseMetric(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.max(0, Math.round(value));
    }

    const text = cleanString(value, 120).toLowerCase();
    if (!text) return 0;

    const number = Number.parseFloat(
        text
            .replace(/views?|likes?|comments?|subscribers?|,/g, "")
            .trim()
    );

    if (!Number.isFinite(number)) return 0;

    if (text.includes("b")) return Math.round(number * 1_000_000_000);
    if (text.includes("m")) return Math.round(number * 1_000_000);
    if (text.includes("k")) return Math.round(number * 1_000);

    return Math.round(number);
}

function formatMetric(value) {
    const number = Number(value || 0);

    if (!Number.isFinite(number) || number <= 0) return "—";
    if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(1)}B`;
    if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
    if (number >= 1_000) return `${Math.round(number / 1_000)}K`;

    return String(Math.round(number));
}

function parseDurationSeconds(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.max(0, Math.round(value));
    }

    const text = cleanString(value, 100);
    if (!text) return 0;

    const isoMatch = text.match(
        /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i
    );

    if (isoMatch) {
        const hours = Number(isoMatch[1] || 0);
        const minutes = Number(isoMatch[2] || 0);
        const seconds = Number(isoMatch[3] || 0);

        return hours * 3600 + minutes * 60 + seconds;
    }

    const values = text
        .split(":")
        .map((part) => Number.parseInt(part, 10))
        .filter((part) => Number.isFinite(part));

    if (values.length === 2) return values[0] * 60 + values[1];
    if (values.length === 3) return values[0] * 3600 + values[1] * 60 + values[2];

    return 0;
}

function parsePublishedAt(value) {
    const text = cleanString(value, 140);
    if (!text) return null;

    const nativeDate = new Date(text);

    if (!Number.isNaN(nativeDate.getTime())) {
        return nativeDate;
    }

    const match = text.match(
        /(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i
    );

    if (!match) return null;

    const amount = Number(match[1]);
    const unit = String(match[2]).toLowerCase();
    const date = new Date();

    if (unit === "minute") date.setMinutes(date.getMinutes() - amount);
    if (unit === "hour") date.setHours(date.getHours() - amount);
    if (unit === "day") date.setDate(date.getDate() - amount);
    if (unit === "week") date.setDate(date.getDate() - amount * 7);
    if (unit === "month") date.setMonth(date.getMonth() - amount);
    if (unit === "year") date.setFullYear(date.getFullYear() - amount);

    return date;
}

function getAgeHours(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return null;
    }

    return Math.max(0, (Date.now() - date.getTime()) / (60 * 60 * 1000));
}

function formatPublishedLabel(value) {
    const date = parsePublishedAt(value);
    const ageHours = getAgeHours(date);

    if (ageHours === null) {
        return cleanString(value, 80) || "Recent";
    }

    if (ageHours < 1) return "Published recently";
    if (ageHours < 24) return `${Math.round(ageHours)}h ago`;
    if (ageHours < 24 * 7) return `${Math.round(ageHours / 24)}d ago`;
    if (ageHours < 24 * 30) return `${Math.round(ageHours / (24 * 7))}w ago`;

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function inferContentType(title, durationSeconds) {
    const text = cleanString(title, 300).toLowerCase();

    if (durationSeconds > 0 && durationSeconds <= 90) {
        return "Short-form";
    }

    if (/(tutorial|how to|step by step|guide)/i.test(text)) {
        return "Tutorial";
    }

    if (/(review|vs\.?|comparison|tested)/i.test(text)) {
        return "Review";
    }

    if (/(story|experience|i tried|my journey)/i.test(text)) {
        return "Story";
    }

    if (/(explained|what is|why .* works|how .* works)/i.test(text)) {
        return "Explainer";
    }

    return "Long-form";
}

function getTrendScore({ views, publishedAt, sourceMode }) {
    const ageHours = getAgeHours(parsePublishedAt(publishedAt));
    const viewSignal = views > 0 ? Math.log10(views + 1) * 11 : 0;

    let freshnessSignal = 8;

    if (ageHours !== null) {
        if (ageHours <= 24) freshnessSignal = 34;
        else if (ageHours <= 24 * 7) freshnessSignal = 26;
        else if (ageHours <= 24 * 30) freshnessSignal = 16;
        else freshnessSignal = 7;
    }

    const sourceSignal = sourceMode === "global" ? 14 : 7;

    return Math.round(clamp(20 + viewSignal + freshnessSignal + sourceSignal, 1, 100));
}

function getMomentum({ publishedAt, sourceMode, views }) {
    const ageHours = getAgeHours(parsePublishedAt(publishedAt));

    if (sourceMode === "global") {
        return "Trending now";
    }

    if (ageHours !== null && ageHours <= 48 && views >= 1000) {
        return "Rising fast";
    }

    if (ageHours !== null && ageHours <= 24 * 7) {
        return "Fresh this week";
    }

    return "Search signal";
}

function getCompetitionEstimate(trendScore) {
    if (trendScore >= 82) return "High";
    if (trendScore >= 62) return "Medium";
    return "Low";
}

function getThumbnailUrl(item) {
    const directFields = [
        item?.thumbnailUrl,
        item?.thumbnail_url,
        item?.thumbnailUrlHQ,
        item?.thumbnailSrc,
        item?.image,
        item?.thumbnailImage,
    ];

    for (const value of directFields) {
        if (
            typeof value === "string" &&
            value.trim()
        ) {
            return value.trim();
        }

        if (
            value &&
            typeof value === "object" &&
            typeof value.url === "string"
        ) {
            return value.url.trim();
        }
    }

    /*
     * Apify returns:
     *
     * thumbnails: [
     *   { url, width, height },
     *   { url, width, height }
     * ]
     *
     * Pick the largest available image.
     */
    if (
        Array.isArray(item?.thumbnails) &&
        item.thumbnails.length
    ) {
        const thumbnail = item.thumbnails
            .filter(
                (entry) =>
                    entry &&
                    typeof entry.url === "string" &&
                    entry.url.trim()
            )
            .sort((first, second) => {
                const firstSize =
                    Number(first?.width || 0) *
                    Number(first?.height || 0);

                const secondSize =
                    Number(second?.width || 0) *
                    Number(second?.height || 0);

                return secondSize - firstSize;
            })[0];

        if (thumbnail?.url) {
            return thumbnail.url.trim();
        }
    }

    /*
     * Some YouTube responses return:
     *
     * thumbnails: {
     *   default: { url },
     *   medium: { url },
     *   high: { url },
     *   standard: { url },
     *   maxres: { url }
     * }
     */
    if (
        item?.thumbnails &&
        typeof item.thumbnails === "object"
    ) {
        const preferredThumbnail =
            item.thumbnails.maxres ||
            item.thumbnails.standard ||
            item.thumbnails.high ||
            item.thumbnails.medium ||
            item.thumbnails.default;

        if (
            typeof preferredThumbnail?.url ===
            "string"
        ) {
            return preferredThumbnail.url.trim();
        }

        const objectThumbnail = Object.values(
            item.thumbnails
        )
            .filter(
                (entry) =>
                    entry &&
                    typeof entry.url === "string" &&
                    entry.url.trim()
            )
            .sort((first, second) => {
                const firstSize =
                    Number(first?.width || 0) *
                    Number(first?.height || 0);

                const secondSize =
                    Number(second?.width || 0) *
                    Number(second?.height || 0);

                return secondSize - firstSize;
            })[0];

        if (objectThumbnail?.url) {
            return objectThumbnail.url.trim();
        }
    }

    /*
     * Sometimes thumbnail itself can be an array.
     */
    if (
        Array.isArray(item?.thumbnail) &&
        item.thumbnail.length
    ) {
        const thumbnail = item.thumbnail
            .filter(
                (entry) =>
                    entry &&
                    typeof entry.url === "string" &&
                    entry.url.trim()
            )
            .sort((first, second) => {
                const firstSize =
                    Number(first?.width || 0) *
                    Number(first?.height || 0);

                const secondSize =
                    Number(second?.width || 0) *
                    Number(second?.height || 0);

                return secondSize - firstSize;
            })[0];

        if (thumbnail?.url) {
            return thumbnail.url.trim();
        }
    }

    return "";
}

function normalizeVideo(item, { platform, region, sourceMode, sourceQuery = "" }) {
    const title = asText(
        pickField(item, ["title", "videoTitle", "name", "text", "videoName"]),
        ""
    );

    if (!title) return null;

    const channel = asText(
        pickField(
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
            "Unknown creator"
        ),
        "Unknown creator"
    );

    const url = asText(
        pickField(item, ["url", "videoUrl", "link", "watchUrl", "videoLink"]),
        ""
    );

    const thumbnail =
        getThumbnailUrl(item);

    const publishedAt = asText(
        pickField(
            item,
            ["publishedAt", "date", "publishedDate", "publishedText", "uploadedAt"],
            ""
        ),
        ""
    );

    const durationSeconds = parseDurationSeconds(
        pickField(
            item,
            [
                "durationSeconds",
                "lengthSeconds",
                "duration",
                "videoDuration",
                "durationText",
            ],
            0
        )
    );

    const views = parseMetric(
        pickField(
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
        )
    );

    const trendScore = getTrendScore({
        views,
        publishedAt,
        sourceMode,
    });

    const contentType = inferContentType(title, durationSeconds);
    const momentum = getMomentum({
        publishedAt,
        sourceMode,
        views,
    });

    return {
        id: url || `${slugify(title)}-${slugify(channel)}`,
        topic: title,
        channel,
        url,
        thumbnail,
        views,
        displayViews: formatMetric(views),
        publishedAt,
        publishedLabel: formatPublishedLabel(publishedAt),
        platform,
        region,
        contentType,
        momentum,
        competition: getCompetitionEstimate(trendScore),
        trendScore,
        sourceQuery: cleanString(sourceQuery, 180),
        sourceMode,
        insight: `${channel} • ${formatMetric(views)} views • ${formatPublishedLabel(
            publishedAt
        )}`,
    };
}

function dedupeItems(items, limit = DEFAULT_LIMIT) {
    const seen = new Set();

    return items
        .filter(Boolean)
        .filter((item) => {
            const key =
                cleanString(item.url, 300).toLowerCase() ||
                `${slugify(item.topic)}-${slugify(item.channel)}`;

            if (!key || seen.has(key)) return false;

            seen.add(key);
            return true;
        })
        .sort((first, second) => {
            const scoreDifference =
                Number(second.trendScore || 0) - Number(first.trendScore || 0);

            if (scoreDifference !== 0) return scoreDifference;

            return Number(second.views || 0) - Number(first.views || 0);
        })
        .slice(0, clamp(Number(limit) || DEFAULT_LIMIT, 1, MAX_LIMIT));
}

function getTrendItemKey(item) {
    const url = cleanString(item?.url, 300).toLowerCase();

    if (url) {
        return `url:${url}`;
    }

    return `topic:${slugify(item?.topic)}:${slugify(item?.channel)}`;
}

function dedupeItemsInOrder(items, limit = DEFAULT_LIMIT) {
    const seen = new Set();

    return (items || [])
        .filter(Boolean)
        .filter((item) => {
            const key = getTrendItemKey(item);

            if (!key || seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        })
        .slice(0, clamp(Number(limit) || DEFAULT_LIMIT, 1, MAX_LIMIT));
}

function getCacheAgeHours(generatedAt) {
    const generatedAtMs = new Date(generatedAt || "").getTime();

    if (!Number.isFinite(generatedAtMs)) {
        return Number.POSITIVE_INFINITY;
    }

    return Math.max(
        0,
        (Date.now() - generatedAtMs) / (60 * 60 * 1000)
    );
}

function buildRefreshMixedItems({
    freshItems,
    cachedItems,
    limit,
    refreshedAt,
}) {
    const safeLimit = clamp(Number(limit) || DEFAULT_LIMIT, 1, MAX_LIMIT);

    const fresh = dedupeItems(freshItems, safeLimit).map((item) => ({
        ...item,
        feedStatus: "fresh",
        refreshedAt,
    }));

    const freshKeys = new Set(fresh.map(getTrendItemKey));

    const continuing = dedupeItems(cachedItems, MAX_LIMIT)
        .filter((item) => !freshKeys.has(getTrendItemKey(item)))
        .map((item) => ({
            ...item,
            feedStatus: "continuing",
        }));

    const freshTarget = Math.max(
        1,
        Math.ceil(safeLimit * REFRESH_FRESH_RATIO)
    );

    const continuingTarget = Math.max(0, safeLimit - freshTarget);

    return dedupeItemsInOrder(
        [
            ...fresh.slice(0, freshTarget),
            ...continuing.slice(0, continuingTarget),
            ...fresh.slice(freshTarget),
            ...continuing.slice(continuingTarget),
        ],
        safeLimit
    );
}

function getCountryCodes(region) {
    return REGION_COUNTRIES[region] || REGION_COUNTRIES.India;
}

function getUploadDateFilter(timeRange) {
    if (timeRange === "24h") return "today";
    if (timeRange === "7d") return "week";
    if (timeRange === "30d") return "month";

    return "any";
}

function makeGlobalCacheKey({ platform, region }) {
    return `global:${slugify(platform)}:${slugify(region)}`;
}

function makeSearchCacheKey({ platform, region, query, timeRange }) {
    return `search:${slugify(platform)}:${slugify(region)}:${slugify(
        timeRange
    )}:${slugify(query)}`;
}

function getCacheExpiryIso() {
    return new Date(
        Date.now() + CACHE_TTL_MINUTES * 60 * 1000
    ).toISOString();
}

function parseJsonValue(value, fallback = []) {
    if (Array.isArray(value)) return value;

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : fallback;
        } catch {
            return fallback;
        }
    }

    return fallback;
}

async function readTrendCache(cacheKey) {
    const { data, error } = await supabase
        .from("trend_cache")
        .select(
            "cache_key, scope, query, platform, region, items_json, generated_at, expires_at"
        )
        .eq("cache_key", cacheKey)
        .maybeSingle();

    if (error) throw error;

    if (!data) return null;

    return {
        ...data,
        items: parseJsonValue(data.items_json, []),
        isExpired:
            !data.expires_at || new Date(data.expires_at).getTime() <= Date.now(),
    };
}

async function writeTrendCache({
    cacheKey,
    scope,
    query = null,
    platform,
    region,
    items,
}) {
    const row = {
        cache_key: cacheKey,
        scope,
        query,
        platform,
        region,
        items_json: items,
        generated_at: new Date().toISOString(),
        expires_at: getCacheExpiryIso(),
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
        .from("trend_cache")
        .upsert(row, { onConflict: "cache_key" });

    if (error) throw error;

    return {
        ...row,
        items,
        isExpired: false,
    };
}

async function getCachedOrFetch({
    cacheKey,
    fetchFresh,
    forceRefresh = false,
    mixWithCachedOnRefresh = false,
    limit = DEFAULT_LIMIT,
}) {
    const cached = await readTrendCache(cacheKey);

    // Normal page load: cache instantly return hoga.
    if (!forceRefresh && cached && !cached.isExpired && cached.items.length) {
        return {
            items: cached.items,
            sourceStatus: "cached",
            generatedAt: cached.generated_at,
            refreshMode: "normal",
        };
    }

    try {
        const fresh = await fetchFresh();

        const freshItems = Array.isArray(fresh?.items)
            ? fresh.items
            : [];

        if (!freshItems.length) {
            if (cached?.items?.length) {
                return {
                    items: cached.items,
                    sourceStatus: "stale",
                    generatedAt: cached.generated_at,
                    refreshMode: "fallback",
                };
            }

            const error = new Error(
                "No live topics were returned for these filters. Please try another region or refresh later."
            );

            error.statusCode = 502;
            throw error;
        }

        const refreshedAt = new Date().toISOString();

        const canMixCachedItems =
            forceRefresh &&
            mixWithCachedOnRefresh &&
            cached?.items?.length &&
            getCacheAgeHours(cached.generated_at) <=
            MAX_CONTINUING_CACHE_AGE_HOURS;

        const itemsToCache = canMixCachedItems
            ? buildRefreshMixedItems({
                freshItems,
                cachedItems: cached.items,
                limit,
                refreshedAt,
            })
            : dedupeItems(freshItems, limit).map((item) => ({
                ...item,
                feedStatus: forceRefresh ? "fresh" : "live",
                refreshedAt,
            }));

        const saved = await writeTrendCache({
            ...fresh,
            items: itemsToCache,
        });

        return {
            items: saved.items,
            sourceStatus: forceRefresh ? "refreshed" : "live",
            generatedAt: saved.generated_at,
            refreshMode: canMixCachedItems ? "mixed" : "fresh",
        };
    } catch (error) {
        // Live API fail hone par user ko purana cached feed milega.
        if (cached?.items?.length) {
            return {
                items: cached.items,
                sourceStatus: "stale",
                generatedAt: cached.generated_at,
                refreshMode: "fallback",
            };
        }

        throw error;
    }
}

function applyFilters(items, filters) {
    const timeRange = filters.timeRange || "all";
    const contentType = filters.contentType || "All";
    const momentum = filters.momentum || "All";

    return items.filter((item) => {
        const ageHours = getAgeHours(parsePublishedAt(item.publishedAt));

        if (
            timeRange === "24h" &&
            ageHours !== null &&
            ageHours > 24
        ) {
            return false;
        }

        if (
            timeRange === "7d" &&
            ageHours !== null &&
            ageHours > 24 * 7
        ) {
            return false;
        }

        if (
            timeRange === "30d" &&
            ageHours !== null &&
            ageHours > 24 * 30
        ) {
            return false;
        }

        if (contentType !== "All" && item.contentType !== contentType) {
            return false;
        }

        if (momentum === "Trending now" && item.momentum !== "Trending now") {
            return false;
        }

        if (momentum === "Rising fast" && item.momentum !== "Rising fast") {
            return false;
        }

        if (momentum === "Fresh this week") {
            const isFresh =
                item.momentum === "Fresh this week" ||
                (ageHours !== null && ageHours <= 24 * 7);

            if (!isFresh) return false;
        }

        if (momentum === "Low competition" && item.competition !== "Low") {
            return false;
        }

        return true;
    });
}

async function fetchGlobalTrendItems({ platform, region, limit }) {
    const countries = getCountryCodes(region);

    const results = await Promise.allSettled(
        countries.map((country) =>
            getMostPopularYouTubeVideos({
                regionCode: country,
                maxResults: limit,
            })
        )
    );

    const failedCountries = results.filter(
        (result) => result.status === "rejected"
    );

    if (failedCountries.length) {
        console.warn(
            `YouTube trend source failed for ${failedCountries.length} region request(s). Continuing with available regions.`
        );
    }

    const items = results
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => result.value || [])
        .map((item) =>
            normalizeVideo(item, {
                platform,
                region,
                sourceMode: "global",
            })
        );

    return dedupeItems(items, limit);
}

async function fetchSearchTrendItems({
    query,
    platform,
    region,
    timeRange,
    limit,
}) {
    const countries =
        getCountryCodes(region);

    const results =
        await Promise.allSettled(
            countries.map((country) =>
                runApifyYouTubeSearch({
                    query,
                    maxResults: limit,
                    country,
                    language: "en",
                    sortBy: "viewCount",

                    uploadDate:
                        getUploadDateFilter(
                            timeRange
                        ),

                    includeShorts:
                        platform ===
                        "YouTube Shorts",
                })
            )
        );

    const items = results
        .filter(
            (result) =>
                result.status ===
                "fulfilled"
        )
        .flatMap(
            (result) =>
                result.value || []
        )
        .map((item) =>
            normalizeVideo(item, {
                platform,
                region,
                sourceMode: "search",
                sourceQuery: query,
            })
        );

    return dedupeItems(
        items,
        limit
    );
}

async function getRecentUserSearches({
    userId,
    platform,
    region,
    limit = 3,
}) {
    const { data, error } = await supabase
        .from("user_trend_searches")
        .select("query, platform, region, filters_json, searched_at")
        .eq("user_id", userId)
        .eq("platform", platform)
        .eq("region", region)
        .order("searched_at", { ascending: false })
        .limit(30);

    if (error) throw error;

    const seen = new Set();

    return (data || [])
        .filter((item) => {
            const key = slugify(item.query);

            if (!key || seen.has(key)) return false;

            seen.add(key);
            return true;
        })
        .slice(0, limit);
}

async function buildPersonalizedItems({
    userId,
    platform,
    region,
    filters,
    limit,
    explicitNiche = "",
}) {
    const profile =
        await getUserInterestProfile({
            userId,
            explicitNiche,
            platform,
        });

    const selectedSignals = (
        profile?.signals || []
    )
        .filter((item) =>
            cleanString(
                item?.query,
                180
            )
        )
        .slice(0, 3);

    if (
        !selectedSignals.length
    ) {
        return {
            items: [],
            searches: [],
            signals: [],

            youtubeConnected:
                Boolean(
                    profile?.youtubeConnected
                ),
        };
    }

    const perSignalLimit =
        Math.max(
            8,

            Math.ceil(
                Number(limit || 12) /
                selectedSignals.length
            ) + 4
        );

    const results =
        await Promise.allSettled(
            selectedSignals.map(
                async (signal) => {
                    const query =
                        cleanString(
                            signal.query,
                            180
                        );

                    const cacheKey =
                        makeSearchCacheKey({
                            platform,
                            region,
                            query,

                            timeRange:
                                filters.timeRange,
                        });

                    const result =
                        await getCachedOrFetch({
                            cacheKey,
                            limit:
                                perSignalLimit,

                            fetchFresh:
                                async () => {
                                    const items =
                                        await fetchSearchTrendItems(
                                            {
                                                query,
                                                platform,
                                                region,

                                                timeRange:
                                                    filters.timeRange,

                                                limit:
                                                    perSignalLimit,
                                            }
                                        );

                                    return {
                                        cacheKey,
                                        scope: "search",
                                        query,
                                        platform,
                                        region,
                                        items,
                                    };
                                },
                        });

                    return (
                        result?.items || []
                    ).map((item) => ({
                        ...item,

                        personalizationReason:
                            query,

                        personalizationSources:
                            signal.sources || [],
                    }));
                }
            )
        );

    const merged =
        dedupeItemsInOrder(
            results
                .filter(
                    (result) =>
                        result.status ===
                        "fulfilled"
                )
                .flatMap(
                    (result) =>
                        result.value || []
                ),

            limit
        );

    return {
        items: applyFilters(
            merged,
            filters
        ),

        searches:
            selectedSignals.map(
                (item) => item.query
            ),

        signals:
            selectedSignals,

        youtubeConnected:
            Boolean(
                profile?.youtubeConnected
            ),

        youtubeChannelTitle:
            profile
                ?.youtubeChannelTitle ||
            "",
    };
}

async function recordUserSearch({
    userId,
    query,
    platform,
    region,
    filters,
}) {
    const { error } = await supabase.from("user_trend_searches").insert({
        user_id: userId,
        query,
        platform,
        region,
        filters_json: filters,
        searched_at: new Date().toISOString(),
    });

    if (error) throw error;
}

function validateFeedInput(payload = {}) {
    const platform = cleanString(payload.platform || "YouTube", 80);
    const region = cleanString(payload.region || "India", 80);
    const timeRange = cleanString(payload.timeRange || "all", 20);
    const contentType = cleanString(payload.contentType || "All", 80);
    const momentum = cleanString(payload.momentum || "All", 80);
    const limit = clamp(Number(payload.limit) || DEFAULT_LIMIT, 1, MAX_LIMIT);

    const niche = cleanString(
        payload.niche || "",
        180
    );

    if (!PLATFORM_OPTIONS.has(platform)) {
        const error = new Error(
            "Live Trends currently supports YouTube and YouTube Shorts only."
        );
        error.statusCode = 400;
        throw error;
    }

    if (!REGION_COUNTRIES[region]) {
        const error = new Error("Unsupported region selected.");
        error.statusCode = 400;
        throw error;
    }

    return {
        platform,
        region,
        timeRange: ["all", "24h", "7d", "30d"].includes(timeRange)
            ? timeRange
            : "all",
        contentType,
        momentum,
        limit,
        niche,
    };
}

async function buildTrendFeed({
    userId,
    filters,
    searchedQuery = "",
    searchResult = null,
    forceRefresh = false,
}) {
    const globalCacheKey = makeGlobalCacheKey(filters);

    const globalResult = await getCachedOrFetch({
        cacheKey: globalCacheKey,
        forceRefresh,
        mixWithCachedOnRefresh: true,
        limit: filters.limit,
        fetchFresh: async () => {
            const items = await fetchGlobalTrendItems(filters);

            return {
                cacheKey: globalCacheKey,
                scope: "global",
                platform: filters.platform,
                region: filters.region,
                items,
            };
        },
    });

    const globalItems = applyFilters(globalResult.items, filters);
    const personalized =
        await buildPersonalizedItems({
            userId,

            platform:
                filters.platform,

            region:
                filters.region,

            filters,

            limit:
                filters.limit,

            explicitNiche:
                filters.niche || "",
        });
    const sections = [];

    if (searchResult?.length) {
        sections.push({
            key: "search_results",
            title: `Results for “${searchedQuery}”`,
            subtitle:
                "Live matching videos from the selected platform. Your search is now used to personalize future trend feeds.",
            items: applyFilters(searchResult, filters),
        });
    }

    if (
        personalized.items.length
    ) {
        const interestText =
            personalized.searches
                .slice(0, 3)
                .join(", ");

        sections.push({
            key: "for_you",
            title: "For you",

            subtitle:
                personalized
                    .youtubeConnected
                    ? `Personalized from your niche, activity and connected YouTube interests: ${interestText}`
                    : `Personalized from your niche, searches, saved ideas and activity: ${interestText}`,

            items:
                personalized.items,
        });
    }

    sections.push({
        key: "trending_now",
        title: "Trending now",
        subtitle: `Live ${filters.platform} topics for ${filters.region}.`,
        items: globalItems,
    });

    return {
        mode: personalized.items.length ? "personalized" : "global",
        filters,
        sections,
        meta: {
            source: "youtube-data-api",
            globalSourceStatus: globalResult.sourceStatus,
            generatedAt: globalResult.generatedAt,
            personalizationSearches: personalized.searches,
            refreshApplied: forceRefresh,
            globalRefreshMode: globalResult.refreshMode,
            personalizationSignals:
                personalized.signals || [],

            youtubePersonalizationConnected:
                Boolean(
                    personalized
                        .youtubeConnected
                ),

            youtubeChannelTitle:
                personalized
                    .youtubeChannelTitle ||
                "",
        },
    };
}

async function getTrendFeedService({ userId, query }) {
    const filters = validateFeedInput(query);

    const forceRefresh =
        String(query?.refresh || "").toLowerCase() === "true";

    return buildTrendFeed({
        userId,
        filters,
        forceRefresh,
    });
}

async function searchTrendTopicsService({ userId, payload }) {
    const filters = validateFeedInput(payload);
    const query = cleanString(payload.query, 180);

    if (query.length < 2) {
        const error = new Error("Enter at least 2 characters to search trends.");
        error.statusCode = 400;
        throw error;
    }

    const searchCacheKey = makeSearchCacheKey({
        platform: filters.platform,
        region: filters.region,
        query,
        timeRange: filters.timeRange,
    });

    const searchResult = await getCachedOrFetch({
        cacheKey: searchCacheKey,
        fetchFresh: async () => {
            const items = await fetchSearchTrendItems({
                query,
                ...filters,
            });

            return {
                cacheKey: searchCacheKey,
                scope: "search",
                query,
                platform: filters.platform,
                region: filters.region,
                items,
            };
        },
    });

    await recordUserSearch({
        userId,
        query,
        platform: filters.platform,
        region: filters.region,
        filters,
    });

    return buildTrendFeed({
        userId,
        filters,
        searchedQuery: query,
        searchResult: searchResult.items,
    });
}

module.exports = {
    getTrendFeedService,
    searchTrendTopicsService,
};
