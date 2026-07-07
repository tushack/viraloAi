const admin = require("../config/firebaseAdmin");
const supabase = require("../config/supabase");

const FIREBASE_DIRECTORY_CACHE_MS = 5 * 60 * 1000;
let firebaseDirectoryCache = {
  expiresAt: 0,
  users: [],
};

function cleanText(value, maxLength = 1000) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function clampInteger(value, fallback, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(number)));
}

function buildRangeStart(days) {
  const safeDays = clampInteger(days, 30, 1, 365);
  const value = new Date();
  value.setDate(value.getDate() - safeDays);
  return value.toISOString();
}

function toFirebaseUser(userRecord) {
  if (!userRecord) return null;

  return {
    uid: userRecord.uid,
    name: userRecord.displayName || "",
    email: userRecord.email || "",
    photoUrl: userRecord.photoURL || "",
    disabled: Boolean(userRecord.disabled),
    createdAt: userRecord.metadata?.creationTime || null,
    lastLoginAt: userRecord.metadata?.lastSignInTime || null,
    providers: (userRecord.providerData || [])
      .map((provider) => provider.providerId)
      .filter(Boolean),
  };
}

async function getFirebaseDirectory({ forceRefresh = false } = {}) {
  if (!forceRefresh && firebaseDirectoryCache.expiresAt > Date.now()) {
    return firebaseDirectoryCache.users;
  }

  const users = [];
  let pageToken;

  do {
    const page = await admin.auth().listUsers(1000, pageToken);
    users.push(...page.users.map(toFirebaseUser));
    pageToken = page.pageToken;
  } while (pageToken);

  firebaseDirectoryCache = {
    users,
    expiresAt: Date.now() + FIREBASE_DIRECTORY_CACHE_MS,
  };

  return users;
}

async function getFirebaseUsersByIds(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];

  if (!ids.length) {
    return new Map();
  }

  const response = await admin.auth().getUsers(
    ids.slice(0, 100).map((uid) => ({ uid }))
  );

  return new Map(
    response.users.map((userRecord) => {
      const user = toFirebaseUser(userRecord);
      return [user.uid, user];
    })
  );
}

function withUserProfile(record, userMap) {
  const userId = record?.user_id || "";
  const user = userMap.get(userId);

  return {
    ...record,
    user: user
      ? {
          uid: user.uid,
          name: user.name,
          email: user.email,
          photoUrl: user.photoUrl,
          disabled: user.disabled,
        }
      : {
          uid: userId,
          name: "",
          email: record?.user_email || "",
          photoUrl: "",
          disabled: false,
        },
  };
}

async function safeCount(queryBuilder) {
  const { count, error } = await queryBuilder;

  if (error) {
    throw error;
  }

  return Number(count || 0);
}

async function countUsersWithActivity(since) {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("user_id")
    .not("user_id", "is", null)
    .gte("created_at", since)
    .limit(10000);

  if (error) {
    throw error;
  }

  return new Set((data || []).map((item) => item.user_id).filter(Boolean)).size;
}

async function getLatestActivity(limit = 12) {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(clampInteger(limit, 12, 1, 100));

  if (error) {
    throw error;
  }

  const userMap = await getFirebaseUsersByIds(
    (data || []).map((item) => item.user_id)
  );

  return (data || []).map((record) => withUserProfile(record, userMap));
}

function aggregateTopNiches(rows, limit = 8) {
  const counts = new Map();

  (rows || []).forEach((row) => {
    const niche = cleanText(row.niche, 180);
    if (!niche) return;
    counts.set(niche, (counts.get(niche) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([niche, count]) => ({ niche, count }))
    .sort((first, second) => second.count - first.count)
    .slice(0, limit);
}

function aggregateModules(rows) {
  const counts = new Map();

  (rows || []).forEach((row) => {
    const moduleName = cleanText(row.module, 80) || "other";
    counts.set(moduleName, (counts.get(moduleName) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([module, count]) => ({ module, count }))
    .sort((first, second) => second.count - first.count);
}

async function getAdminOverview({ days = 30 } = {}) {
  const rangeStart = buildRangeStart(days);

  const [
    firebaseUsers,
    researchQueries,
    savedIdeas,
    mediaExports,
    calendarPlans,
    trendSearches,
    aiGenerations,
    activeUsers,
    researchRows,
    moduleRows,
    recentActivity,
  ] = await Promise.all([
    getFirebaseDirectory(),
    safeCount(
      supabase
        .from("research_queries")
        .select("id", { count: "exact", head: true })
        .gte("created_at", rangeStart)
    ),
    safeCount(
      supabase
        .from("saved_ideas")
        .select("id", { count: "exact", head: true })
        .gte("created_at", rangeStart)
    ),
    safeCount(
      supabase
        .from("media_exports")
        .select("id", { count: "exact", head: true })
        .gte("created_at", rangeStart)
    ),
    safeCount(
      supabase
        .from("content_calendar_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", rangeStart)
        .is("deleted_at", null)
    ),
    safeCount(
      supabase
        .from("user_trend_searches")
        .select("id", { count: "exact", head: true })
        .gte("searched_at", rangeStart)
    ),
    safeCount(
      supabase
        .from("activity_logs")
        .select("id", { count: "exact", head: true })
        .in("event_type", [
          "ai.daily_ideas_generated",
          "research.generated",
          "content_pack.generated",
          "thumbnail.generated",
          "viral_check.analyzed",
        ])
        .gte("created_at", rangeStart)
    ),
    countUsersWithActivity(rangeStart),
    supabase
      .from("research_queries")
      .select("niche, created_at")
      .gte("created_at", rangeStart)
      .limit(5000)
      .then(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
    supabase
      .from("activity_logs")
      .select("module, created_at")
      .gte("created_at", rangeStart)
      .limit(5000)
      .then(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
    getLatestActivity(12),
  ]);

  const rangeEnd = new Date();
  const newUsersInRange = firebaseUsers.filter((user) => {
    const createdAt = new Date(user.createdAt || "").getTime();
    return Number.isFinite(createdAt) && createdAt >= new Date(rangeStart).getTime();
  }).length;

  return {
    range: {
      days: clampInteger(days, 30, 1, 365),
      from: rangeStart,
      to: rangeEnd.toISOString(),
    },
    kpis: {
      totalUsers: firebaseUsers.length,
      newUsers: newUsersInRange,
      activeUsers,
      researchQueries,
      aiGenerations,
      savedIdeas,
      calendarPlans,
      trendSearches,
      mediaExports,
    },
    topNiches: aggregateTopNiches(researchRows),
    moduleUsage: aggregateModules(moduleRows),
    recentActivity,
  };
}

async function getUserCounts(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];

  const empty = new Map();

  if (!ids.length) {
    return {
      research: empty,
      savedIdeas: empty,
      calendar: empty,
      mediaExports: empty,
      activity: empty,
    };
  }

  async function countByUser(table, { activeOnly = false } = {}) {
    let query = supabase.from(table).select("user_id").in("user_id", ids);

    if (activeOnly) {
      query = query.is("deleted_at", null);
    }

    const { data, error } = await query.limit(10000);

    if (error) throw error;

    return (data || []).reduce((map, row) => {
      map.set(row.user_id, (map.get(row.user_id) || 0) + 1);
      return map;
    }, new Map());
  }

  const [research, savedIdeas, calendar, mediaExports, activity] = await Promise.all([
    countByUser("research_queries"),
    countByUser("saved_ideas"),
    countByUser("content_calendar_events", { activeOnly: true }),
    countByUser("media_exports"),
    countByUser("activity_logs"),
  ]);

  return {
    research,
    savedIdeas,
    calendar,
    mediaExports,
    activity,
  };
}

async function getLastActivityByUser(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];

  if (!ids.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("activity_logs")
    .select("user_id, created_at")
    .in("user_id", ids)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) throw error;

  return (data || []).reduce((map, row) => {
    if (!map.has(row.user_id)) {
      map.set(row.user_id, row.created_at);
    }

    return map;
  }, new Map());
}

async function getAdminUsers({ search = "", page = 1, limit = 50 } = {}) {
  const allUsers = await getFirebaseDirectory();
  const cleanSearch = cleanText(search, 240).toLowerCase();
  const safePage = clampInteger(page, 1, 1, 100000);
  const safeLimit = clampInteger(limit, 50, 10, 100);
  const filteredUsers = cleanSearch
    ? allUsers.filter((user) =>
        [user.name, user.email, user.uid]
          .join(" ")
          .toLowerCase()
          .includes(cleanSearch)
      )
    : allUsers;

  const start = (safePage - 1) * safeLimit;
  const usersForPage = filteredUsers.slice(start, start + safeLimit);
  const userIds = usersForPage.map((user) => user.uid);

  const [counts, lastActivityByUser] = await Promise.all([
    getUserCounts(userIds),
    getLastActivityByUser(userIds),
  ]);

  return {
    items: usersForPage.map((user) => ({
      ...user,
      totals: {
        research: counts.research.get(user.uid) || 0,
        savedIdeas: counts.savedIdeas.get(user.uid) || 0,
        calendarPlans: counts.calendar.get(user.uid) || 0,
        mediaExports: counts.mediaExports.get(user.uid) || 0,
        activities: counts.activity.get(user.uid) || 0,
      },
      lastActivityAt: lastActivityByUser.get(user.uid) || null,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: filteredUsers.length,
      totalPages: Math.max(1, Math.ceil(filteredUsers.length / safeLimit)),
    },
  };
}

async function getAdminUserDetail(userId) {
  const [firebaseRecord, researchResult, savedResult, mediaResult, calendarResult, activityResult, connectionResult, notesResult] =
    await Promise.all([
      admin.auth().getUser(userId),
      supabase
        .from("research_queries")
        .select("id, niche, platform, audience, response_json, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("saved_ideas")
        .select("id, type, content, platform, niche, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("media_exports")
        .select(
          "id, youtube_title, original_name, output_name, output_type, output_quality, output_bytes, status, created_at, expires_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("content_calendar_events")
        .select(
          "id, title, scheduled_date, scheduled_time, platform, status, reminder_minutes, notified, created_at, updated_at, deleted_at"
        )
        .eq("user_id", userId)
        .order("scheduled_date", { ascending: false })
        .limit(50),
      supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("youtube_connections")
        .select("channel_id, channel_title, channel_thumbnail, email, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("admin_user_notes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const results = [
    researchResult,
    savedResult,
    mediaResult,
    calendarResult,
    activityResult,
    connectionResult,
    notesResult,
  ];

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw firstError;

  const user = toFirebaseUser(firebaseRecord);

  return {
    user,
    totals: {
      research: (researchResult.data || []).length,
      savedIdeas: (savedResult.data || []).length,
      mediaExports: (mediaResult.data || []).length,
      calendarPlans: (calendarResult.data || []).filter((item) => !item.deleted_at)
        .length,
      activities: (activityResult.data || []).length,
    },
    youtubeConnection: connectionResult.data || null,
    researchQueries: researchResult.data || [],
    savedIdeas: savedResult.data || [],
    mediaExports: mediaResult.data || [],
    calendarEvents: calendarResult.data || [],
    activities: activityResult.data || [],
    notes: notesResult.data || [],
  };
}

async function setFirebaseUserDisabled({ userId, disabled }) {
  const updated = await admin.auth().updateUser(userId, {
    disabled: Boolean(disabled),
  });

  firebaseDirectoryCache.expiresAt = 0;

  return toFirebaseUser(updated);
}

async function addAdminUserNote({
  userId,
  note,
  createdByUserId,
  createdByEmail,
}) {
  const cleanNote = cleanText(note, 4000);

  if (!cleanNote) {
    const error = new Error("Admin note is required.");
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await supabase
    .from("admin_user_notes")
    .insert({
      user_id: userId,
      note: cleanNote,
      created_by_user_id: createdByUserId,
      created_by_email: createdByEmail || "",
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

async function getAdminActivity({
  page = 1,
  limit = 50,
  module,
  status,
  userId,
} = {}) {
  const safePage = clampInteger(page, 1, 1, 100000);
  const safeLimit = clampInteger(limit, 50, 10, 100);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  let query = supabase
    .from("activity_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (cleanText(module, 80)) {
    query = query.eq("module", cleanText(module, 80));
  }

  if (cleanText(status, 20)) {
    query = query.eq("status", cleanText(status, 20));
  }

  if (cleanText(userId, 200)) {
    query = query.eq("user_id", cleanText(userId, 200));
  }

  const { data, count, error } = await query;

  if (error) throw error;

  const userMap = await getFirebaseUsersByIds(
    (data || []).map((item) => item.user_id)
  );

  return {
    items: (data || []).map((record) => withUserProfile(record, userMap)),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / safeLimit)),
    },
  };
}

async function getAdminCalendarEvents({ page = 1, limit = 50, status, userId } = {}) {
  const safePage = clampInteger(page, 1, 1, 100000);
  const safeLimit = clampInteger(limit, 50, 10, 100);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  let query = supabase
    .from("content_calendar_events")
    .select("*", { count: "exact" })
    .order("scheduled_date", { ascending: false })
    .order("scheduled_time", { ascending: false })
    .range(from, to);

  if (cleanText(status, 40)) {
    query = query.eq("status", cleanText(status, 40));
  }

  if (cleanText(userId, 200)) {
    query = query.eq("user_id", cleanText(userId, 200));
  }

  const { data, count, error } = await query;
  if (error) throw error;

  const userMap = await getFirebaseUsersByIds(
    (data || []).map((item) => item.user_id)
  );

  return {
    items: (data || []).map((record) => withUserProfile(record, userMap)),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / safeLimit)),
    },
  };
}

async function getAdminMediaExports({ page = 1, limit = 50, userId } = {}) {
  const safePage = clampInteger(page, 1, 1, 100000);
  const safeLimit = clampInteger(limit, 50, 10, 100);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  let query = supabase
    .from("media_exports")
    .select(
      "id, user_id, youtube_url, youtube_title, original_name, output_name, output_type, output_quality, output_mime_type, output_bytes, rights_acknowledged, status, created_at, expires_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (cleanText(userId, 200)) {
    query = query.eq("user_id", cleanText(userId, 200));
  }

  const { data, count, error } = await query;
  if (error) throw error;

  const userMap = await getFirebaseUsersByIds(
    (data || []).map((item) => item.user_id)
  );

  return {
    items: (data || []).map((record) => withUserProfile(record, userMap)),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / safeLimit)),
    },
  };
}

module.exports = {
  getAdminOverview,
  getAdminUsers,
  getAdminUserDetail,
  setFirebaseUserDisabled,
  addAdminUserNote,
  getAdminActivity,
  getAdminCalendarEvents,
  getAdminMediaExports,
};
