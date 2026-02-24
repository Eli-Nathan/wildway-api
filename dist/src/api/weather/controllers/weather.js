"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const weather_1 = require("../services/weather");
const quota_1 = require("../utils/quota");
const cache_1 = require("../utils/cache");
const ADMIN_SECRET = process.env.ADMIN_SECRET;
/**
 * Validate admin key from header
 */
function validateAdminKey(ctx) {
    const providedKey = ctx.request.header["x-admin-key"];
    return Boolean(ADMIN_SECRET && providedKey === ADMIN_SECRET);
}
/**
 * Validate and parse coordinates
 */
function parseCoordinates(latStr, lngStr) {
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
exports.default = {
    /**
     * GET /api/weather?lat=XX&lng=YY
     *
     * Get weather for a location
     */
    async getWeather(ctx) {
        const coords = parseCoordinates(ctx.query.lat, ctx.query.lng);
        if (!coords) {
            ctx.status = 400;
            ctx.body = {
                error: "Invalid coordinates",
                message: "Provide valid lat and lng query parameters",
            };
            return;
        }
        const result = await (0, weather_1.getWeather)(strapi, coords.lat, coords.lng);
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
                conditionNames: weather_1.CONDITION_NAMES,
            },
        };
    },
    /**
     * GET /api/weather/status
     *
     * Get weather API usage stats (admin only)
     */
    async getStatus(ctx) {
        if (!validateAdminKey(ctx)) {
            ctx.status = 401;
            ctx.body = { error: "Unauthorized" };
            return;
        }
        const usage = await (0, quota_1.getUsageStats)(strapi);
        const cache = (0, cache_1.getCacheStats)();
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
    async toggle(ctx) {
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
        await (0, quota_1.setWeatherEnabled)(strapi, enabled, reason);
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
    async clearCache(ctx) {
        if (!validateAdminKey(ctx)) {
            ctx.status = 401;
            ctx.body = { error: "Unauthorized" };
            return;
        }
        const statsBefore = (0, cache_1.getCacheStats)();
        (0, cache_1.clearWeatherCache)();
        ctx.body = {
            success: true,
            message: `Cleared ${statsBefore.size} cached entries`,
        };
    },
};
