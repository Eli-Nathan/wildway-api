// Google Maps Directions API types
export interface GoogleMapsDirectionsRequest {
  origin: LatLng | string;
  destination: LatLng | string;
  waypoints?: LatLng[];
  mode?: GoogleMapsTravelMode;
  apikey?: string;
  language?: string;
  region?: string;
  optimizeWaypoints?: boolean;
  splitWaypoints?: boolean;
  directionsServiceBaseUrl?: string;
  precision?: "high" | "low";
  timePrecision?: "none" | string;
  channel?: string;
  onStart?: (params: {
    origin: string;
    destination: string;
    waypoints: LatLng[];
  }) => void;
  onError?: (error: string) => void;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export type GoogleMapsTravelMode = "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT";

export interface GoogleMapsDirectionsResponse {
  status: string;
  error_message?: string;
  routes: GoogleMapsRoute[];
}

export interface GoogleMapsRoute {
  legs: GoogleMapsLeg[];
  overview_polyline: {
    points: string;
  };
  fare?: {
    currency: string;
    value: number;
    text: string;
  };
  waypoint_order: number[];
}

export interface GoogleMapsLeg {
  distance: {
    value: number;
    text: string;
  };
  duration: {
    value: number;
    text: string;
  };
  duration_in_traffic?: {
    value: number;
    text: string;
  };
  steps: GoogleMapsStep[];
}

export interface GoogleMapsStep {
  polyline: {
    points: string;
  };
}

export interface DirectionsResult {
  distance: number;
  duration: number;
  coordinates: LatLng[];
  fare?: GoogleMapsRoute["fare"];
  waypointOrder: number[];
}

// Firebase Auth types
export interface FirebaseUserData {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  uid: string;
  aud: string;
  auth_time: number;
  iss: string;
  exp: number;
  iat: number;
}

// OpenStreetMap Nominatim types
export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  address?: NominatimAddress;
}

export interface NominatimAddress {
  house_number?: string;
  road?: string;
  suburb?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

// OpenWeatherMap types
export interface WeatherResponse {
  coord: {
    lon: number;
    lat: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
}

// Slack Webhook types
export interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

export interface SlackBlock {
  type: "section" | "divider" | "header" | "context" | "actions";
  text?: {
    type: "plain_text" | "mrkdwn";
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: "plain_text" | "mrkdwn";
    text: string;
  }>;
  accessory?: {
    type: string;
    image_url?: string;
    alt_text?: string;
  };
}

export interface SlackAttachment {
  color?: string;
  title?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
}
