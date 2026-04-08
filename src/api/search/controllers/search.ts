// @ts-nocheck
import type { Context } from "koa";

interface SearchContext extends Context {
  request: Context["request"] & {
    query: {
      query?: string;
      sitesStart?: number;
      sitesLimit?: number;
      popularRoutesStart?: number;
      popularRoutesLimit?: number;
      communityRoutesStart?: number;
      communityRoutesLimit?: number;
      usersStart?: number;
      usersLimit?: number;
      useFuzzy?: boolean | string;
      lat?: number | string;
      lng?: number | string;
      radius?: number | string;
    };
    body?: {
      placeName?: string;
      lat?: number;
      lng?: number;
      radius?: number;
    };
  };
  state: {
    user?: {
      id: number;
    };
  };
  badRequest: (message: string, details: Record<string, unknown>) => void;
}

export default {
  globalSearch: async (ctx: SearchContext) => {
    try {
      const {
        query,
        scope = "all",
        sitesStart = 0,
        sitesLimit = 25,
        popularRoutesStart = 0,
        popularRoutesLimit = 25,
        communityRoutesStart = 0,
        communityRoutesLimit = 25,
        usersStart = 0,
        usersLimit = 25,
        useFuzzy = true,
      } = ctx.request.query;

      // Convert string "true"/"false" to boolean
      const fuzzyEnabled = useFuzzy === true || useFuzzy === "true";
      const scopes = scope === "all" 
        ? ["sites", "popularRoutes", "communityRoutes", "people"] 
        : (scope as string).split(",");

      let sites;
      let popularRoutes;
      let communityRoutes;
      let people;

      if (scopes.includes("sites")) {
        sites = await strapi
          .service("api::search.search")
          // @ts-expect-error - Service method
          .searchSites(query, sitesStart, sitesLimit, fuzzyEnabled);
      }
      if (scopes.includes("popularRoutes")) {
        popularRoutes = await strapi
          .service("api::search.search")
          // @ts-expect-error - Service method
          .searchPopularRoutes(query, popularRoutesStart, popularRoutesLimit);
      }

      if (ctx.state.user) {
        if (scopes.includes("communityRoutes")) {
          communityRoutes = await strapi
            .service("api::search.search")
            // @ts-expect-error - Service method
            .searchCommunityRoutes(
              query,
              communityRoutesStart,
              communityRoutesLimit
            );
        }
        if (scopes.includes("people")) {
          people = await strapi
            .service("api::search.search")
            // @ts-expect-error - Service method
            .searchUsers(query, usersStart, usersLimit);
        }
      }

      ctx.body = {
        sites,
        popularRoutes,
        communityRoutes,
        people,
      };
    } catch (err) {
      ctx.badRequest("Search controller error", { moreDetails: err });
    }
  },

  globalSearchWithOSM: async (ctx: SearchContext) => {
    try {
      const {
        query,
        sitesStart = 0,
        sitesLimit = 25,
        popularRoutesStart = 0,
        popularRoutesLimit = 25,
        communityRoutesStart = 0,
        communityRoutesLimit = 25,
        usersStart = 0,
        usersLimit = 25,
        useFuzzy = true,
      } = ctx.request.query;

      // Convert string "true"/"false" to boolean
      const fuzzyEnabled = useFuzzy === true || useFuzzy === "true";

      let sites;
      let unlistedSites;
      let popularRoutes;
      let communityRoutes;
      let people;

      sites = await strapi
        .service("api::search.search")
        // @ts-expect-error - Service method
        .searchSites(query, sitesStart, sitesLimit, fuzzyEnabled);

      unlistedSites = await strapi
        .service("api::search.search")
        // @ts-expect-error - Service method
        .searchUnlistedSites(query, fuzzyEnabled);

      popularRoutes = await strapi
        .service("api::search.search")
        // @ts-expect-error - Service method
        .searchPopularRoutes(query, popularRoutesStart, popularRoutesLimit);

      if (ctx.state.user) {
        communityRoutes = await strapi
          .service("api::search.search")
          // @ts-expect-error - Service method
          .searchCommunityRoutes(
            query,
            communityRoutesStart,
            communityRoutesLimit
          );
        people = await strapi
          .service("api::search.search")
          // @ts-expect-error - Service method
          .searchUsers(query, usersStart, usersLimit);
      }

      ctx.body = {
        places: [
          ...sites,
          ...unlistedSites.map(
            // @ts-expect-error - Service method
            strapi.service("api::search.search").transformOSMToUnlistedSite
          ),
        ],
        popularRoutes,
        communityRoutes,
        people,
      };
    } catch (err) {
      ctx.badRequest("Post report controller error", { moreDetails: err });
    }
  },

  // New endpoint for checking similar sites (for duplicate prevention)
  checkSimilarSites: async (ctx: SearchContext) => {
    try {
      const { placeName, lat, lng, radius = 5 } = ctx.request.query || {};

      if (!placeName) {
        return ctx.badRequest("Place name is required", {
          field: "placeName",
        });
      }

      const similarSites = await strapi
        .service("api::search.search")
        // @ts-expect-error - Service method
        .findSimilarSites(
          placeName,
          lat ? Number(lat) : undefined,
          lng ? Number(lng) : undefined,
          Number(radius)
        );

      ctx.body = {
        similarSites,
        hasPotentialDuplicates: similarSites.length > 0,
        count: similarSites.length,
      };
    } catch (err) {
      ctx.badRequest("Error checking similar sites", { moreDetails: err });
    }
  },

  // Endpoint for fuzzy search with external data
  fuzzySearch: async (ctx: SearchContext) => {
    try {
      const {
        query,
        lat,
        lng,
        radius = 10,
        sitesLimit = 25,
      } = ctx.request.query;

      if (!query) {
        return ctx.badRequest("Search query is required", { field: "query" });
      }

      // Search internal sites with fuzzy matching
      const sites = await strapi
        .service("api::search.search")
        // @ts-expect-error - Service method
        .searchSites(query, 0, sitesLimit, true);

      // Search external data with fuzzy matching
      const unlistedSites = await strapi
        .service("api::search.search")
        // @ts-expect-error - Service method
        .searchUnlistedSites(query, true);

      // Transform OSM sites
      const transformedUnlisted = unlistedSites.map(
        // @ts-expect-error - Service method
        strapi.service("api::search.search").transformOSMToUnlistedSite
      );

      // If coordinates are provided, sort by distance
      let allPlaces = [...sites, ...transformedUnlisted];

      if (lat && lng) {
        const latNum = Number(lat);
        const lngNum = Number(lng);
        const radiusNum = Number(radius);

        allPlaces = allPlaces
          .map((place) => {
            if (!place.lat || !place.lng) {
              return { ...place, distance: Infinity };
            }

            // Calculate distance using Haversine formula
            const R = 6371; // Earth's radius in km
            const dLat = ((place.lat - latNum) * Math.PI) / 180;
            const dLng = ((place.lng - lngNum) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((latNum * Math.PI) / 180) *
                Math.cos((place.lat * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            return { ...place, distance };
          })
          .filter((place) => place.distance <= radiusNum)
          .sort((a, b) => a.distance - b.distance);
      }

      ctx.body = {
        places: allPlaces.slice(0, sitesLimit),
        total: allPlaces.length,
        fuzzySearchEnabled: true,
      };
    } catch (err) {
      ctx.badRequest("Fuzzy search error", { moreDetails: err });
    }
  },
};