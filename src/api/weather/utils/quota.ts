// Quota tracking for WeatherKit API calls
// Uses a simple DB table to persist usage across deploys

// Thresholds (configurable via env vars)
const QUOTA_MONTHLY_LIMIT = 500000;
const QUOTA_WARNING = parseInt(process.env.WEATHER_QUOTA_WARNING || "400000", 10);
const QUOTA_CRITICAL = parseInt(process.env.WEATHER_QUOTA_CRITICAL || "450000", 10);
const QUOTA_DISABLE = parseInt(process.env.WEATHER_QUOTA_DISABLE || "475000", 10);

// In-memory cache for current month's usage to reduce DB reads
let usageCache: {
  month: string;
  callCount: number;
  isDisabled: boolean;
  lastFetched: number;
} | null = null;

const USAGE_CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Get current month string (YYYY-MM)
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Get or create usage record for current month
 */
async function getUsageRecord(strapi: any): Promise<{
  month: string;
  callCount: number;
  isDisabled: boolean;
}> {
  const month = getCurrentMonth();

  // Check in-memory cache first
  if (usageCache && usageCache.month === month && Date.now() - usageCache.lastFetched < USAGE_CACHE_TTL) {
    return usageCache;
  }

  // Query database
  let record = await strapi.db.query("api::weather-usage.weather-usage").findOne({
    where: { month },
  });

  // Create if doesn't exist
  if (!record) {
    record = await strapi.db.query("api::weather-usage.weather-usage").create({
      data: {
        month,
        call_count: 0,
        is_disabled: false,
        disabled_at: null,
        disabled_reason: null,
      },
    });
  }

  // Update cache
  usageCache = {
    month,
    callCount: record.call_count,
    isDisabled: record.is_disabled,
    lastFetched: Date.now(),
  };

  return usageCache;
}

/**
 * Check if weather API is available (not disabled)
 */
export async function isWeatherAvailable(strapi: any): Promise<boolean> {
  const usage = await getUsageRecord(strapi);
  return !usage.isDisabled;
}

/**
 * Increment usage counter and check thresholds
 * Returns true if the call should proceed, false if quota exceeded
 */
export async function trackApiCall(strapi: any): Promise<boolean> {
  const month = getCurrentMonth();
  const usage = await getUsageRecord(strapi);

  if (usage.isDisabled) {
    return false;
  }

  const newCount = usage.callCount + 1;

  // Check thresholds and take action
  let shouldDisable = false;
  let disabledReason: string | null = null;

  if (newCount >= QUOTA_DISABLE) {
    shouldDisable = true;
    disabledReason = `Automatic disable: ${newCount} calls reached ${QUOTA_DISABLE} threshold (95% of monthly quota)`;
    strapi.log.error(`[WeatherKit] QUOTA EXCEEDED - Disabling weather endpoint. ${newCount}/${QUOTA_MONTHLY_LIMIT} calls`);
  } else if (newCount >= QUOTA_CRITICAL) {
    strapi.log.warn(`[WeatherKit] CRITICAL - ${newCount}/${QUOTA_MONTHLY_LIMIT} calls (${Math.round(newCount / QUOTA_MONTHLY_LIMIT * 100)}%)`);
  } else if (newCount >= QUOTA_WARNING) {
    strapi.log.info(`[WeatherKit] Warning - ${newCount}/${QUOTA_MONTHLY_LIMIT} calls (${Math.round(newCount / QUOTA_MONTHLY_LIMIT * 100)}%)`);
  }

  // Update database
  await strapi.db.query("api::weather-usage.weather-usage").update({
    where: { month },
    data: {
      call_count: newCount,
      is_disabled: shouldDisable,
      disabled_at: shouldDisable ? new Date().toISOString() : null,
      disabled_reason: disabledReason,
    },
  });

  // Update cache
  if (usageCache) {
    usageCache.callCount = newCount;
    usageCache.isDisabled = shouldDisable;
  }

  return !shouldDisable;
}

/**
 * Get current usage stats
 */
export async function getUsageStats(strapi: any): Promise<{
  month: string;
  callCount: number;
  limit: number;
  percentUsed: number;
  isDisabled: boolean;
  thresholds: {
    warning: number;
    critical: number;
    disable: number;
  };
}> {
  const usage = await getUsageRecord(strapi);

  return {
    month: usage.month,
    callCount: usage.callCount,
    limit: QUOTA_MONTHLY_LIMIT,
    percentUsed: Math.round((usage.callCount / QUOTA_MONTHLY_LIMIT) * 100),
    isDisabled: usage.isDisabled,
    thresholds: {
      warning: QUOTA_WARNING,
      critical: QUOTA_CRITICAL,
      disable: QUOTA_DISABLE,
    },
  };
}

/**
 * Manually enable/disable weather endpoint
 */
export async function setWeatherEnabled(strapi: any, enabled: boolean, reason?: string): Promise<void> {
  const month = getCurrentMonth();

  await strapi.db.query("api::weather-usage.weather-usage").update({
    where: { month },
    data: {
      is_disabled: !enabled,
      disabled_at: enabled ? null : new Date().toISOString(),
      disabled_reason: enabled ? null : reason || "Manually disabled",
    },
  });

  // Clear cache to force refresh
  usageCache = null;

  strapi.log.info(`[WeatherKit] Weather endpoint ${enabled ? "enabled" : "disabled"} - ${reason || "manual override"}`);
}
