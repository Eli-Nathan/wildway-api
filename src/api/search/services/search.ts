// @ts-nocheck
import { getPlacesFromQuery } from "../../../nomad/dataEnrichment/place";
import { fuzzySearch, findSimilarPlaces } from "./fuzzySearch";

interface OSMAddress {
  city?: string;
  town?: string;
  county?: string;
  neighborhood?: string;
  suburb?: string;
}

interface OSMSite {
  osm_id: string;
  type: string;
  lat: string;
  lon: string;
  namedetails: {
    name: string;
  };
  address: OSMAddress;
}

const getNameWithSuffix = (name: string, address: OSMAddress): string => {
  if (address.city && address.city !== name) {
    return `${name}, ${address.city}`;
  }
  if (address.town && address.town !== name) {
    return `${name}, ${address.town}`;
  }
  if (address.county && address.county !== name) {
    return `${name}, ${address.county}`;
  }
  if (address.neighborhood && address.neighborhood !== name) {
    return `${name}, ${address.neighborhood}`;
  }
  if (address.suburb && address.suburb !== name) {
    return `${name}, ${address.suburb}`;
  }
  return "";
};

const searchService = {
  searchSites: async (
    query: string,
    start: number,
    limit: number,
    useFuzzy: boolean = true
  ): Promise<unknown[]> => {
    try {
      // First try exact/contains search
      let sites = await strapi.entityService.findMany("api::site.site", {
        start,
        limit: limit * 2, // Get more results for fuzzy filtering
        fields: [
          "title",
          "description",
          "category",
          "image",
          "lat",
          "lng",
          "slug",
        ],
        filters: {
          title: {
            $containsi: query,
          },
        },
        sort: { priority: "DESC" },
        populate: {
          type: {
            populate: {
              remote_icon: true,
              remote_marker: true,
            },
          },
          images: true,
          facilities: true,
          sub_types: true,
          owners: true,
        },
      });

      // If fuzzy search is enabled and we have few results, expand the search
      if (useFuzzy && sites.length < limit) {
        // Get all sites for fuzzy matching (with pagination for performance)
        const allSites = await strapi.entityService.findMany("api::site.site", {
          start: 0,
          limit: 500, // Reasonable limit for fuzzy search
          fields: [
            "title",
            "description",
            "category",
            "image",
            "lat",
            "lng",
            "slug",
          ],
          sort: { priority: "DESC" },
          populate: {
            type: {
              populate: {
                remote_icon: true,
                remote_marker: true,
              },
            },
            images: true,
            facilities: true,
            sub_types: true,
            owners: true,
          },
        });

        // Apply fuzzy search
        const fuzzyResults = fuzzySearch(allSites, query, {
          threshold: 0.3,
          keys: ["title", "description"],
        });

        // Combine and deduplicate results
        const siteIds = new Set(sites.map((s) => s.id));
        const additionalSites = fuzzyResults
          .filter((s) => !siteIds.has(s.id))
          .slice(0, limit - sites.length);

        sites = [...sites, ...additionalSites];
      }

      // Limit results
      return sites.slice(start, start + limit) as unknown[];
    } catch (err) {
      return err as unknown[];
    }
  },

  searchUnlistedSites: async (
    query: string,
    useFuzzy: boolean = true
  ): Promise<OSMSite[]> => {
    // For external data, we'll search with variations if fuzzy is enabled
    let places = await getPlacesFromQuery({ query });

    // If fuzzy search is enabled and we got few results, try variations
    if (useFuzzy && places.length < 5) {
      // Try without special characters
      const cleanQuery = query.replace(/[^\w\s]/gi, "").trim();
      if (cleanQuery !== query) {
        const cleanResults = await getPlacesFromQuery({ query: cleanQuery });
        places = [...places, ...cleanResults];
      }

      // Try with partial words (first and last words)
      const words = query.split(/\s+/);
      if (words.length > 2) {
        const partialQuery = `${words[0]} ${words[words.length - 1]}`;
        const partialResults = await getPlacesFromQuery({
          query: partialQuery,
        });
        places = [...places, ...partialResults];
      }
    }

    // Deduplicate by OSM ID
    const uniquePlaces = Array.from(
      new Map(places.map((p) => [p.osm_id, p])).values()
    );

    // If fuzzy search is enabled, score and sort results
    if (useFuzzy && uniquePlaces.length > 0) {
      const scoredPlaces = fuzzySearch(
        uniquePlaces.map((p) => ({
          ...p,
          title: p.namedetails?.name || "",
        })),
        query,
        {
          threshold: 0.2,
          keys: ["title"],
        }
      );

      return scoredPlaces as OSMSite[];
    }

    return uniquePlaces as OSMSite[];
  },

  // New method for finding potential duplicates when contributing
  findSimilarSites: async (
    placeName: string,
    lat?: number,
    lng?: number,
    radius: number = 5 // km
  ): Promise<unknown[]> => {
    try {
      console.log('findSimilarSites called with:', { placeName, lat, lng, radius });
      
      // Get sites for similarity check
      let sites = await strapi.entityService.findMany("api::site.site", {
        limit: 1000, // Get a reasonable number for checking
        fields: ["title", "description", "lat", "lng", "slug", "image"],
        populate: {
          type: {
            fields: ["name", "slug", "icon"],
          },
          images: {
            fields: ["url", "formats"],
          },
        },
      });
      
      console.log('Found sites:', sites.length);

      // If coordinates are provided, filter by proximity first
      if (lat !== undefined && lng !== undefined) {
        sites = sites.filter((site) => {
          if (!site.lat || !site.lng) return false;

          // Calculate distance using Haversine formula
          const R = 6371; // Earth's radius in km
          const dLat = ((site.lat - lat) * Math.PI) / 180;
          const dLng = ((site.lng - lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat * Math.PI) / 180) *
              Math.cos((site.lat * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;

          return distance <= radius;
        });
      }

      // Find similar places using fuzzy matching
      const similarSites = findSimilarPlaces(sites, placeName, {
        threshold: 0.5, // Lower threshold to catch more potential duplicates
        maxResults: 10,
        keys: ["title", "description"],
      });

      // Don't include external OSM data for duplicate checking
      // Just return our own sites that might be duplicates
      return similarSites as unknown[];
    } catch (err) {
      console.error("Error finding similar sites:", err);
      return [];
    }
  },

  searchCommunityRoutes: async (
    query: string,
    start: number,
    limit: number
  ): Promise<unknown[]> => {
    try {
      const routes = await strapi.entityService.findMany(
        "api::user-route.user-route",
        {
          fields: ["name"],
          filters: {
            public: true,
            name: {
              $containsi: `${query}`,
            },
          },
          populate: {
            image: true,
            tags: true,
            sites: true,
          },
        }
      );

      return routes as unknown[];
    } catch (err) {
      return err as unknown[];
    }
  },

  searchPopularRoutes: async (
    query: string,
    start: number,
    limit: number
  ): Promise<unknown[]> => {
    try {
      const routes = await strapi.entityService.findMany(
        "api::nomad-route.nomad-route",
        {
          start,
          limit,
          filters: {
            name: {
              $containsi: `${query}`,
            },
          },
          populate: {
            image: true,
            tags: true,
          },
          fields: ["name"],
        }
      );

      return routes as unknown[];
    } catch (err) {
      return err as unknown[];
    }
  },

  searchUsers: async (
    query: string,
    start: number,
    limit: number
  ): Promise<unknown[]> => {
    try {
      const users = await strapi.entityService.findMany(
        "api::auth-user.auth-user",
        {
          start,
          limit,
          filters: {
            isVerified: true,
            name: {
              $containsi: `${query}`,
            },
          },
          populate: {
            profile_pic: true,
            tags: true,
          },
          fields: ["name", "avatar", "businessName", "score"],
        }
      );

      return users as unknown[];
    } catch (err) {
      return err as unknown[];
    }
  },

  transformOSMToUnlistedSite: (osmSite: OSMSite) => {
    const nameWithSuffix = getNameWithSuffix(
      osmSite.namedetails.name,
      osmSite.address
    );
    return {
      unlisted: true,
      id: `osm_${osmSite.osm_id}`,
      title: nameWithSuffix,
      type: {
        id: `osm_type_${osmSite.type}`,
        slug: osmSite.type,
        name: osmSite.type,
      },
      lat: osmSite.lat,
      lng: osmSite.lon,
    };
  },
};

export default searchService;