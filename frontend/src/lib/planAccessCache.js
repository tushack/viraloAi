const PLAN_CACHE_PREFIX = "viraloPlanAccess:";
const PLAN_UPDATED_EVENT = "viralo:plan-access-updated";

function normalizePlan(value) {
  return String(value || "").trim().toLowerCase();
}

function getCacheKey(userId) {
  return `${PLAN_CACHE_PREFIX}${String(userId || "").trim()}`;
}

export function isActivePaidPlan(access) {
  if (!access || access.isPaid !== true) {
    return false;
  }

  const plan = normalizePlan(access.plan);

  if (plan === "admin") {
    return true;
  }

  if (plan !== "pro") {
    return false;
  }

  if (!access.currentPeriodEnd) {
    return true;
  }

  const expiresAt = new Date(access.currentPeriodEnd).getTime();

  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export function readCachedActivePlan(userId) {
  const cleanUserId = String(userId || "").trim();

  if (!cleanUserId) {
    return null;
  }

  try {
    const rawValue = localStorage.getItem(getCacheKey(cleanUserId));

    if (!rawValue) {
      return null;
    }

    const access = JSON.parse(rawValue);

    if (!isActivePaidPlan(access)) {
      localStorage.removeItem(getCacheKey(cleanUserId));
      return null;
    }

    return access;
  } catch {
    localStorage.removeItem(getCacheKey(cleanUserId));
    return null;
  }
}

export function savePlanAccess(userId, access) {
  const cleanUserId = String(userId || "").trim();

  if (!cleanUserId) {
    return;
  }

  const cacheKey = getCacheKey(cleanUserId);

  if (!isActivePaidPlan(access)) {
    localStorage.removeItem(cacheKey);
    return;
  }

  localStorage.setItem(cacheKey, JSON.stringify(access));
}

export function publishPlanAccess(userId, access) {
  const cleanUserId = String(userId || "").trim();

  if (!cleanUserId) {
    return;
  }

  savePlanAccess(cleanUserId, access);

  window.dispatchEvent(
    new CustomEvent(PLAN_UPDATED_EVENT, {
      detail: {
        userId: cleanUserId,
        access: access || null,
      },
    })
  );
}

export function subscribeToPlanAccess(callback) {
  const handler = (event) => {
    callback?.(event?.detail || {});
  };

  window.addEventListener(PLAN_UPDATED_EVENT, handler);

  return () => {
    window.removeEventListener(PLAN_UPDATED_EVENT, handler);
  };
}
