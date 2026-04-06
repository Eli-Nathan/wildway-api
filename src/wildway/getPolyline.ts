import axios from "axios";
import logger from "./logger";
import type {
  LatLng,
  GoogleMapsTravelMode,
  GoogleMapsDirectionsRequest,
  GoogleMapsDirectionsResponse,
  GoogleMapsStep,
  DirectionsResult,
} from "../types/external";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const WAYPOINT_LIMIT = 10;

// Map internal mode names to Google Maps API mode names
// Schema uses "CYCLING" but Google API expects "BICYCLING"
function toGoogleMapsMode(mode: string): string {
  if (mode.toUpperCase() === "CYCLING") {
    return "bicycling";
  }
  return mode.toLowerCase();
}

function decode(steps: GoogleMapsStep[]): LatLng[] {
  const points: LatLng[] = [];

  for (const step of steps) {
    const encoded = step.polyline.points;
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b: number;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
  }

  return points;
}

interface RouteChunk {
  waypoints: LatLng[];
  origin: LatLng;
  destination: LatLng;
}

async function fetchRoute(
  directionsServiceBaseUrl: string,
  origin: string,
  waypoints: string,
  destination: string,
  apikey: string,
  mode: string,
  language: string,
  region: string | undefined,
  precision: "high" | "low",
  timePrecision: string,
  channel: string | undefined
): Promise<DirectionsResult> {
  let url = directionsServiceBaseUrl;

  if (typeof directionsServiceBaseUrl === "string") {
    url += `?origin=${origin}&waypoints=${waypoints}&destination=${destination}&key=${apikey}&mode=${toGoogleMapsMode(mode)}&language=${language}&region=${region}`;
    if (timePrecision) {
      url += `&departure_time=${timePrecision}`;
    }
    if (channel) {
      url += `&channel=${channel}`;
    }
  }

  return axios
    .get<GoogleMapsDirectionsResponse>(url)
    .then((response) => response.data)
    .then((json) => {
      if (json.status !== "OK") {
        const errorMessage = json.error_message || json.status || "Unknown error";
        return Promise.reject(errorMessage);
      }

      if (json.routes.length) {
        const route = json.routes[0];

        return Promise.resolve({
          distance:
            route.legs.reduce((carry, curr) => {
              return carry + curr.distance.value;
            }, 0) / 1000,
          duration:
            route.legs.reduce((carry, curr) => {
              return (
                carry +
                (curr.duration_in_traffic
                  ? curr.duration_in_traffic.value
                  : curr.duration.value)
              );
            }, 0) / 60,
          coordinates:
            precision === "low"
              ? decode([{ polyline: route.overview_polyline }])
              : route.legs.reduce<LatLng[]>((carry, curr) => {
                  return [...carry, ...decode(curr.steps)];
                }, []),
          fare: route.fare,
          waypointOrder: route.waypoint_order,
        });
      } else {
        logger.warn("No directions found");
        return Promise.reject(new Error("No directions found"));
      }
    })
    .catch((err) => {
      return Promise.reject(`Error on GMAPS route request: ${err}`);
    });
}

async function fetchDirections(
  props: GoogleMapsDirectionsRequest
): Promise<LatLng[] | undefined> {
  const {
    origin: initialOrigin,
    destination: initialDestination,
    waypoints: initialWaypoints = [],
    apikey = GOOGLE_MAPS_API_KEY,
    onStart,
    onError,
    mode = "DRIVING",
    language = "en",
    optimizeWaypoints,
    splitWaypoints,
    directionsServiceBaseUrl = "https://maps.googleapis.com/maps/api/directions/json",
    region,
    precision = "high",
    timePrecision = "none",
    channel,
  } = props;

  if (!apikey) {
    logger.error("Error: Missing API Key when generating polyline");
    return;
  }

  if (!initialOrigin || !initialDestination) {
    return;
  }

  const timePrecisionString = timePrecision === "none" ? "" : timePrecision;

  const routes: RouteChunk[] = [];

  if (
    splitWaypoints &&
    initialWaypoints &&
    initialWaypoints.length > WAYPOINT_LIMIT
  ) {
    const chunkedWaypoints = initialWaypoints.reduce<LatLng[][]>(
      (accumulator, waypoint, index) => {
        const numChunk = Math.floor(index / WAYPOINT_LIMIT);
        accumulator[numChunk] = ([] as LatLng[]).concat(
          accumulator[numChunk] || [],
          waypoint
        );
        return accumulator;
      },
      []
    );

    for (let i = 0; i < chunkedWaypoints.length; i++) {
      routes.push({
        waypoints: chunkedWaypoints[i],
        origin:
          i === 0
            ? (initialOrigin as LatLng)
            : chunkedWaypoints[i - 1][chunkedWaypoints[i - 1].length - 1],
        destination:
          i === chunkedWaypoints.length - 1
            ? (initialDestination as LatLng)
            : chunkedWaypoints[i + 1][0],
      });
    }
  } else {
    routes.push({
      waypoints: initialWaypoints,
      origin: initialOrigin as LatLng,
      destination: initialDestination as LatLng,
    });
  }

  const routesResults = await Promise.all(
    routes.map((route, index) => {
      let { origin, destination, waypoints } = route;

      let originStr: string;
      let destinationStr: string;

      if (origin.latitude && origin.longitude) {
        originStr = `${origin.latitude},${origin.longitude}`;
      } else {
        originStr = origin as unknown as string;
      }

      if (destination.latitude && destination.longitude) {
        destinationStr = `${destination.latitude},${destination.longitude}`;
      } else {
        destinationStr = destination as unknown as string;
      }

      let waypointsStr = waypoints
        .map((waypoint) =>
          waypoint.latitude && waypoint.longitude
            ? `${waypoint.latitude},${waypoint.longitude}`
            : waypoint
        )
        .join("|");

      if (optimizeWaypoints) {
        waypointsStr = `optimize:true|${waypointsStr}`;
      }

      if (index === 0) {
        onStart?.({
          origin: originStr,
          destination: destinationStr,
          waypoints: initialWaypoints,
        });
      }

      return fetchRoute(
        directionsServiceBaseUrl,
        originStr,
        waypointsStr,
        destinationStr,
        apikey,
        mode,
        language,
        region,
        precision,
        timePrecisionString,
        channel
      )
        .then((result) => result)
        .catch((errorMessage) => {
          logger.error(`Error fetching route: ${errorMessage}`);
          return Promise.reject(errorMessage);
        });
    })
  )
    .then((results) => {
      const result = results.reduce(
        (acc, { distance, duration, coordinates, fare, waypointOrder }) => {
          acc.coordinates = [...acc.coordinates, ...coordinates];
          acc.distance += distance;
          acc.duration += duration;
          acc.fares = [...acc.fares, fare];
          acc.waypointOrder = [...acc.waypointOrder, waypointOrder];
          return acc;
        },
        {
          coordinates: [] as LatLng[],
          distance: 0,
          duration: 0,
          fares: [] as (DirectionsResult["fare"] | undefined)[],
          waypointOrder: [] as number[][],
        }
      );

      return result.coordinates;
    })
    .catch((errorMessage) => {
      logger.warn(`Generate polyline error: ${errorMessage}`);
      onError?.(errorMessage);
      return undefined;
    });

  return routesResults;
}

interface GeneratePolylineParams {
  origin: LatLng;
  destination: LatLng;
  waypoints?: LatLng[];
  mode?: GoogleMapsTravelMode;
}

const generatePolyline = async ({
  origin,
  destination,
  waypoints,
  mode,
}: GeneratePolylineParams): Promise<LatLng[] | undefined> => {
  const directions = await fetchDirections({
    origin,
    destination,
    waypoints,
    mode,
  });
  return directions;
};

export default generatePolyline;
