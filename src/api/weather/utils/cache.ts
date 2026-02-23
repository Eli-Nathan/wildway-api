import type { CachedWeather, WeatherResponse } from "../types";

// In-memory cache for weather data
// Cleared on dyno restart - that's fine, it's just weather
const weatherCache = new Map<string, CachedWeather>();

// Cache TTL in milliseconds
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Round lat/lng to 2 decimal places for better cache hits (~1km precision)
function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Generate cache key from coordinates
 */
export function getCacheKey(lat: number, lng: number): string {
  return `weather:${roundCoord(lat)}:${roundCoord(lng)}`;
}

/**
 * Get cached weather data if available and not expired
 */
export function getCachedWeather(lat: number, lng: number): WeatherResponse | null {
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

/**
 * Store weather data in cache
 */
export function setCachedWeather(lat: number, lng: number, data: WeatherResponse): void {
  const key = getCacheKey(lat, lng);
  const now = Date.now();

  weatherCache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + CACHE_TTL,
  });
}

/**
 * Get cache stats for monitoring
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: weatherCache.size,
    keys: Array.from(weatherCache.keys()),
  };
}

/**
 * Clear all cached weather data
 */
export function clearWeatherCache(): void {
  weatherCache.clear();
}

/**
 * Clean up expired entries (call periodically if needed)
 */
export function cleanupExpiredCache(): number {
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
