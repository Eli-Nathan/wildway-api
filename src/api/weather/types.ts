// Apple WeatherKit Types

export interface WeatherKitCurrentWeather {
  asOf: string;
  temperature: number;
  temperatureApparent: number;
  conditionCode: string;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  uvIndex: number;
  visibility: number;
  pressure: number;
  precipitationIntensity: number;
}

export interface WeatherKitDayWeather {
  forecastStart: string;
  forecastEnd: string;
  conditionCode: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationChance: number;
  precipitationAmount: number;
  snowfallAmount: number;
  sunrise: string;
  sunset: string;
  windSpeedMax: number;
  uvIndexMax: number;
}

export interface WeatherKitAlert {
  id: string;
  areaId: string;
  areaName: string;
  certainty: string;
  countryCode: string;
  description: string;
  effectiveTime: string;
  expireTime: string;
  issuedTime: string;
  detailsUrl: string;
  phenomenon: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme' | 'unknown';
  source: string;
  eventSource: string;
  urgency: string;
  responses: string[];
}

export interface WeatherKitResponse {
  currentWeather?: WeatherKitCurrentWeather;
  forecastDaily?: {
    name: string;
    days: WeatherKitDayWeather[];
  };
  weatherAlerts?: {
    alerts: WeatherKitAlert[];
    detailsUrl: string;
  };
}

// Normalized response for the app
export interface WeatherCurrent {
  temperature: number;
  temperatureApparent: number;
  conditionCode: string;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  precipitationIntensity: number;
}

export interface WeatherDay {
  date: string;
  conditionCode: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationChance: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherAlert {
  id: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme' | 'unknown';
  headline: string;
  description: string;
  effectiveTime: string;
  expireTime: string;
  detailsUrl: string;
}

export interface WeatherResponse {
  current: WeatherCurrent | null;
  daily: WeatherDay[];
  alerts: WeatherAlert[];
  attribution: {
    provider: string;
    legalUrl: string;
  };
}

// Cache types
export interface CachedWeather {
  data: WeatherResponse;
  timestamp: number;
  expiresAt: number;
}

// Quota tracking
export interface WeatherUsage {
  month: string; // YYYY-MM
  callCount: number;
  lastUpdated: string;
  isDisabled: boolean;
  disabledAt: string | null;
  disabledReason: string | null;
}
