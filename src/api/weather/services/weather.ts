import axios from "axios";
import { generateWeatherKitJWT, isWeatherKitConfigured } from "../utils/jwt";
import { getCachedWeather, setCachedWeather } from "../utils/cache";
import { isWeatherAvailable, trackApiCall } from "../utils/quota";
import type {
  WeatherKitResponse,
  WeatherResponse,
  WeatherCurrent,
  WeatherDay,
  WeatherAlert,
} from "../types";

const WEATHERKIT_BASE_URL = "https://weatherkit.apple.com/api/v1";

// Apple WeatherKit condition codes to readable names
const CONDITION_NAMES: Record<string, string> = {
  Clear: "Clear",
  Cloudy: "Cloudy",
  Dust: "Dusty",
  Fog: "Foggy",
  Haze: "Hazy",
  MostlyClear: "Mostly Clear",
  MostlyCloudy: "Mostly Cloudy",
  PartlyCloudy: "Partly Cloudy",
  ScatteredThunderstorms: "Scattered Thunderstorms",
  Smoke: "Smoky",
  Breezy: "Breezy",
  Windy: "Windy",
  Drizzle: "Drizzle",
  HeavyRain: "Heavy Rain",
  Rain: "Rain",
  Showers: "Showers",
  Flurries: "Flurries",
  HeavySnow: "Heavy Snow",
  MixedRainAndSleet: "Rain and Sleet",
  MixedRainAndSnow: "Rain and Snow",
  MixedRainfall: "Mixed Rainfall",
  MixedSnowAndSleet: "Snow and Sleet",
  ScatteredShowers: "Scattered Showers",
  ScatteredSnowShowers: "Scattered Snow Showers",
  Sleet: "Sleet",
  Snow: "Snow",
  SnowShowers: "Snow Showers",
  Blizzard: "Blizzard",
  BlowingSnow: "Blowing Snow",
  FreezingDrizzle: "Freezing Drizzle",
  FreezingRain: "Freezing Rain",
  Frigid: "Frigid",
  Hail: "Hail",
  Hot: "Hot",
  Hurricane: "Hurricane",
  IsolatedThunderstorms: "Isolated Thunderstorms",
  SevereThunderstorm: "Severe Thunderstorm",
  Thunderstorm: "Thunderstorm",
  Tornado: "Tornado",
  TropicalStorm: "Tropical Storm",
};

/**
 * Convert Celsius to Celsius (WeatherKit returns Celsius by default)
 * Round to 1 decimal place
 */
function formatTemp(celsius: number): number {
  return Math.round(celsius * 10) / 10;
}

/**
 * Convert m/s to mph
 */
function msToMph(ms: number): number {
  return Math.round(ms * 2.237);
}

/**
 * Normalize Apple WeatherKit response to our app format
 */
function normalizeWeatherResponse(data: WeatherKitResponse): WeatherResponse {
  const current: WeatherCurrent | null = data.currentWeather
    ? {
        temperature: formatTemp(data.currentWeather.temperature),
        temperatureApparent: formatTemp(data.currentWeather.temperatureApparent),
        conditionCode: data.currentWeather.conditionCode,
        humidity: Math.round(data.currentWeather.humidity * 100),
        windSpeed: msToMph(data.currentWeather.windSpeed),
        uvIndex: data.currentWeather.uvIndex,
        precipitationIntensity: data.currentWeather.precipitationIntensity,
      }
    : null;

  const daily: WeatherDay[] = (data.forecastDaily?.days || []).slice(0, 10).map((day) => ({
    date: day.forecastStart,
    conditionCode: day.conditionCode,
    temperatureMax: formatTemp(day.temperatureMax),
    temperatureMin: formatTemp(day.temperatureMin),
    precipitationChance: Math.round(day.precipitationChance * 100),
    sunrise: day.sunrise,
    sunset: day.sunset,
  }));

  const alerts: WeatherAlert[] = (data.weatherAlerts?.alerts || []).map((alert) => ({
    id: alert.id,
    severity: alert.severity || "unknown",
    headline: alert.description?.split(".")[0] || alert.phenomenon || "Weather Alert",
    description: alert.description || "",
    effectiveTime: alert.effectiveTime,
    expireTime: alert.expireTime,
    detailsUrl: alert.detailsUrl,
  }));

  return {
    current,
    daily,
    alerts,
    attribution: {
      provider: "Apple Weather",
      legalUrl: "https://weatherkit.apple.com/legal-attribution.html",
    },
  };
}

/**
 * Fetch weather data from Apple WeatherKit
 */
async function fetchFromWeatherKit(lat: number, lng: number): Promise<WeatherKitResponse> {
  const jwt = generateWeatherKitJWT();

  const url = `${WEATHERKIT_BASE_URL}/weather/en/${lat}/${lng}`;
  const params = {
    dataSets: "currentWeather,forecastDaily,weatherAlerts",
    timezone: "Europe/London",
  };

  const response = await axios.get<WeatherKitResponse>(url, {
    params,
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    timeout: 10000, // 10 second timeout
  });

  return response.data;
}

/**
 * Main function to get weather for a location
 */
export async function getWeather(
  strapi: any,
  lat: number,
  lng: number
): Promise<{ data: WeatherResponse | null; error?: string; unavailable?: boolean }> {
  // Check if WeatherKit is configured
  if (!isWeatherKitConfigured()) {
    strapi.log.warn("[WeatherKit] Not configured - missing credentials");
    return { data: null, error: "Weather service not configured" };
  }

  // Check if weather is available (not quota-disabled)
  const available = await isWeatherAvailable(strapi);
  if (!available) {
    strapi.log.info("[WeatherKit] Weather endpoint disabled due to quota");
    return { data: null, unavailable: true };
  }

  // Check cache first
  const cached = getCachedWeather(lat, lng);
  if (cached) {
    strapi.log.debug(`[WeatherKit] Cache hit for ${lat},${lng}`);
    return { data: cached };
  }

  // Track API call and check quota
  const canProceed = await trackApiCall(strapi);
  if (!canProceed) {
    return { data: null, unavailable: true };
  }

  // Fetch from Apple
  try {
    strapi.log.info(`[WeatherKit] Fetching weather for ${lat},${lng}`);
    const rawData = await fetchFromWeatherKit(lat, lng);
    const normalized = normalizeWeatherResponse(rawData);

    // Cache the result
    setCachedWeather(lat, lng, normalized);

    return { data: normalized };
  } catch (error: any) {
    strapi.log.error(`[WeatherKit] API error for ${lat},${lng}:`, error.message);

    // Return specific error for debugging
    if (error.response?.status === 401) {
      return { data: null, error: "Weather authentication failed" };
    }
    if (error.response?.status === 403) {
      return { data: null, error: "Weather service not authorized for this location" };
    }

    return { data: null, error: "Failed to fetch weather data" };
  }
}

export { CONDITION_NAMES };
