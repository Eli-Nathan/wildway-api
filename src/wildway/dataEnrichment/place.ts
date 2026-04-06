import axios from "axios";
import logger from "../logger";
import type { NominatimResult } from "../../types/external";

interface GetPlaceParams {
  lat: number;
  lng: number;
}

interface GetPlacesQueryParams {
  query: string;
}

export const getPlaceFromLatLng = async ({
  lat,
  lng,
}: GetPlaceParams): Promise<NominatimResult | undefined> => {
  const place = await axios.get<NominatimResult>(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
  );
  return place?.data;
};

export const getPlacesFromQuery = async ({
  query,
}: GetPlacesQueryParams): Promise<NominatimResult[]> => {
  try {
    const places = await axios.get<NominatimResult[]>(
      `https://nominatim.openstreetmap.org/search?q=${query}, Scotland&format=jsonv2&countrycodes=gb&limit=50&namedetails=1&addressdetails=1&extratags=1&accept-language=en-GB`,
      {
        headers: { "User-Agent": `WildWay-${query}` },
      }
    );
    logger.warn(
      "Nominatim",
      `https://nominatim.openstreetmap.org/search?q=${query}, Scotland&format=jsonv2&countrycodes=gb&limit=50&namedetails=1&addressdetails=1&extratags=1&accept-language=en-GB`
    );
    return places?.data || [];
  } catch (err) {
    logger.warn("Nominatim error", err);
    return [];
  }
};
