"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONDITION_NAMES = exports.getWeather = void 0;
const axios_1 = __importDefault(require("axios"));
const jwt_1 = require("../utils/jwt");
const cache_1 = require("../utils/cache");
const quota_1 = require("../utils/quota");
const WEATHERKIT_BASE_URL = "https://weatherkit.apple.com/api/v1";
// Apple WeatherKit condition codes to readable names
const CONDITION_NAMES = {
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
exports.CONDITION_NAMES = CONDITION_NAMES;
/**
 * Convert Celsius to Celsius (WeatherKit returns Celsius by default)
 * Round to 1 decimal place
 */
function formatTemp(celsius) {
    return Math.round(celsius * 10) / 10;
}
/**
 * Convert m/s to mph
 */
function msToMph(ms) {
    return Math.round(ms * 2.237);
}
/**
 * Normalize Apple WeatherKit response to our app format
 */
function normalizeWeatherResponse(data) {
    var _a, _b;
    const current = data.currentWeather
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
    const daily = (((_a = data.forecastDaily) === null || _a === void 0 ? void 0 : _a.days) || []).slice(0, 10).map((day) => ({
        date: day.forecastStart,
        conditionCode: day.conditionCode,
        temperatureMax: formatTemp(day.temperatureMax),
        temperatureMin: formatTemp(day.temperatureMin),
        precipitationChance: Math.round(day.precipitationChance * 100),
        sunrise: day.sunrise,
        sunset: day.sunset,
    }));
    const alerts = (((_b = data.weatherAlerts) === null || _b === void 0 ? void 0 : _b.alerts) || []).map((alert) => {
        var _a;
        return ({
            id: alert.id,
            severity: alert.severity || "unknown",
            headline: ((_a = alert.description) === null || _a === void 0 ? void 0 : _a.split(".")[0]) || alert.phenomenon || "Weather Alert",
            description: alert.description || "",
            effectiveTime: alert.effectiveTime,
            expireTime: alert.expireTime,
            detailsUrl: alert.detailsUrl,
        });
    });
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
async function fetchFromWeatherKit(lat, lng) {
    const jwt = (0, jwt_1.generateWeatherKitJWT)();
    const url = `${WEATHERKIT_BASE_URL}/weather/en/${lat}/${lng}`;
    const params = {
        dataSets: "currentWeather,forecastDaily,weatherAlerts",
        timezone: "Europe/London",
    };
    const response = await axios_1.default.get(url, {
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
async function getWeather(strapi, lat, lng) {
    var _a, _b;
    // Check if WeatherKit is configured
    if (!(0, jwt_1.isWeatherKitConfigured)()) {
        strapi.log.warn("[WeatherKit] Not configured - missing credentials");
        return { data: null, error: "Weather service not configured" };
    }
    // Check if weather is available (not quota-disabled)
    const available = await (0, quota_1.isWeatherAvailable)(strapi);
    if (!available) {
        strapi.log.info("[WeatherKit] Weather endpoint disabled due to quota");
        return { data: null, unavailable: true };
    }
    // Check cache first
    const cached = (0, cache_1.getCachedWeather)(lat, lng);
    if (cached) {
        strapi.log.debug(`[WeatherKit] Cache hit for ${lat},${lng}`);
        return { data: cached };
    }
    // Track API call and check quota
    const canProceed = await (0, quota_1.trackApiCall)(strapi);
    if (!canProceed) {
        return { data: null, unavailable: true };
    }
    // Fetch from Apple
    try {
        strapi.log.info(`[WeatherKit] Fetching weather for ${lat},${lng}`);
        const rawData = await fetchFromWeatherKit(lat, lng);
        const normalized = normalizeWeatherResponse(rawData);
        // Cache the result
        (0, cache_1.setCachedWeather)(lat, lng, normalized);
        return { data: normalized };
    }
    catch (error) {
        strapi.log.error(`[WeatherKit] API error for ${lat},${lng}:`, error.message);
        // Return specific error for debugging
        if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 401) {
            return { data: null, error: "Weather authentication failed" };
        }
        if (((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 403) {
            return { data: null, error: "Weather service not authorized for this location" };
        }
        return { data: null, error: "Failed to fetch weather data" };
    }
}
exports.getWeather = getWeather;
