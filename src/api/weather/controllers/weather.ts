import type { Context } from "koa";
import { getWeather, CONDITION_NAMES } from "../services/weather";
import { getUsageStats, setWeatherEnabled } from "../utils/quota";
import { getCacheStats, clearWeatherCache } from "../utils/cache";

interface WeatherContext extends Context {
  params: {
    lat?: string;
    lng?: string;
  };
  query: {
    lat?: string;
    lng?: string;
  };
  request: Context["request"] & {
    body?: {
      enabled?: boolean;
      reason?: string;
    };
  };
}

const ADMIN_SECRET = process.env.ADMIN_SECRET;

/**
 * Validate admin key from header
 */
function validateAdminKey(ctx: WeatherContext): boolean {
  const providedKey = ctx.request.header["x-admin-key"];
  return Boolean(ADMIN_SECRET && providedKey === ADMIN_SECRET);
}

/**
 * Validate and parse coordinates
 */
function parseCoordinates(
  latStr: string | undefined,
  lngStr: string | undefined
): { lat: number; lng: number } | null {
  if (!latStr || !lngStr) {
    return null;
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }

  // Validate ranges
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { lat, lng };
}

export default {
  /**
   * GET /api/weather?lat=XX&lng=YY
   *
   * Get weather for a location
   */
  async getWeather(ctx: WeatherContext) {
    const coords = parseCoordinates(ctx.query.lat, ctx.query.lng);

    if (!coords) {
      ctx.status = 400;
      ctx.body = {
        error: "Invalid coordinates",
        message: "Provide valid lat and lng query parameters",
      };
      return;
    }

    const result = await getWeather(strapi, coords.lat, coords.lng);

    if (result.unavailable) {
      ctx.status = 503;
      ctx.body = {
        error: "weather_unavailable",
        message: "Weather data temporarily unavailable",
      };
      return;
    }

    if (result.error) {
      ctx.status = 500;
      ctx.body = {
        error: "weather_error",
        message: result.error,
      };
      return;
    }

    ctx.body = {
      data: result.data,
      meta: {
        conditionNames: CONDITION_NAMES,
      },
    };
  },

  /**
   * GET /api/weather/status
   *
   * Get weather API usage stats (admin only)
   */
  async getStatus(ctx: WeatherContext) {
    if (!validateAdminKey(ctx)) {
      ctx.status = 401;
      ctx.body = { error: "Unauthorized" };
      return;
    }

    const usage = await getUsageStats(strapi);
    const cache = getCacheStats();

    ctx.body = {
      data: {
        usage,
        cache: {
          size: cache.size,
          locations: cache.keys.length,
        },
      },
    };
  },

  /**
   * POST /api/weather/toggle
   *
   * Enable or disable weather endpoint (admin only)
   */
  async toggle(ctx: WeatherContext) {
    if (!validateAdminKey(ctx)) {
      ctx.status = 401;
      ctx.body = { error: "Unauthorized" };
      return;
    }

    const { enabled, reason } = ctx.request.body || {};

    if (typeof enabled !== "boolean") {
      ctx.status = 400;
      ctx.body = { error: "enabled (boolean) is required" };
      return;
    }

    await setWeatherEnabled(strapi, enabled, reason);

    ctx.body = {
      success: true,
      message: `Weather endpoint ${enabled ? "enabled" : "disabled"}`,
    };
  },

  /**
   * POST /api/weather/clear-cache
   *
   * Clear the weather cache (admin only)
   */
  async clearCache(ctx: WeatherContext) {
    if (!validateAdminKey(ctx)) {
      ctx.status = 401;
      ctx.body = { error: "Unauthorized" };
      return;
    }

    const statsBefore = getCacheStats();
    clearWeatherCache();

    ctx.body = {
      success: true,
      message: `Cleared ${statsBefore.size} cached entries`,
    };
  },
};
