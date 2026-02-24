"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredCache = exports.clearWeatherCache = exports.getCacheStats = exports.setCachedWeather = exports.getCachedWeather = exports.getCacheKey = void 0;
// In-memory cache for weather data
// Cleared on dyno restart - that's fine, it's just weather
const weatherCache = new Map();
// Cache TTL in milliseconds
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
// Round lat/lng to 2 decimal places for better cache hits (~1km precision)
function roundCoord(value) {
    return Math.round(value * 100) / 100;
}
/**
 * Generate cache key from coordinates
 */
function getCacheKey(lat, lng) {
    return `weather:${roundCoord(lat)}:${roundCoord(lng)}`;
}
exports.getCacheKey = getCacheKey;
/**
 * Get cached weather data if available and not expired
 */
function getCachedWeather(lat, lng) {
    const key = getCacheKey(lat, lng);
    const cached = weatherCache.get(key);
    if (!cached) {
        return null;
    }
    // Check if expired
    if (Date.now() > cached.expiresAt) {
        weatherCache.delete(key);
        return null;
    }
    return cached.data;
}
exports.getCachedWeather = getCachedWeather;
/**
 * Store weather data in cache
 */
function setCachedWeather(lat, lng, data) {
    const key = getCacheKey(lat, lng);
    const now = Date.now();
    weatherCache.set(key, {
        data,
        timestamp: now,
        expiresAt: now + CACHE_TTL,
    });
}
exports.setCachedWeather = setCachedWeather;
/**
 * Get cache stats for monitoring
 */
function getCacheStats() {
    return {
        size: weatherCache.size,
        keys: Array.from(weatherCache.keys()),
    };
}
exports.getCacheStats = getCacheStats;
/**
 * Clear all cached weather data
 */
function clearWeatherCache() {
    weatherCache.clear();
}
exports.clearWeatherCache = clearWeatherCache;
/**
 * Clean up expired entries (call periodically if needed)
 */
function cleanupExpiredCache() {
    const now = Date.now();
    let removed = 0;
    for (const [key, value] of weatherCache.entries()) {
        if (now > value.expiresAt) {
            weatherCache.delete(key);
            removed++;
        }
    }
    return removed;
}
exports.cleanupExpiredCache = cleanupExpiredCache;
