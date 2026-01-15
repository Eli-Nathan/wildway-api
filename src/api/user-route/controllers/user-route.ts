// @ts-nocheck
import { factories } from "@strapi/strapi";
import logger from "../../../nomad/logger";
import generatePolyline from "../../../nomad/getPolyline";

interface StrapiContext {
  query: {
    filters?: Record<string, unknown>;
    populate?: string[];
  };
  params: {
    id?: string;
  };
  state: {
    user: {
      id: number;
    };
  };
  request: {
    body?: {
      data?: {
        sites?: Array<{
          site?: number;
          custom?: { lat: number; lng: number };
          lat?: number;
          lng?: number;
        }>;
        mode?: string;
        polyline?: string;
      };
    };
  };
  status?: number;
}

interface ExistingRoute {
  polyline?: string;
  mode?: string;
  sites: Array<{
    site?: { id: number };
    custom?: { lat: number; lng: number };
  }>;
}

interface RequestSite {
  site?: number;
  custom?: { lat: number; lng: number };
}

const checkIfPlacesMatch = (
  api: ExistingRoute["sites"],
  req: RequestSite[]
): boolean => {
  if (api.length !== req.length) {
    return false;
  }
  const eachMatch = api.map((place, i) => {
    if (place.site && req[i].site) {
      return place.site.id === req[i].site;
    } else if (place.custom && req[i].custom) {
      const matchingLat = place.custom.lat === req[i].custom.lat;
      const matchingLng = place.custom.lng === req[i].custom.lng;
      return matchingLat && matchingLng;
    }
    return false;
  });
  return eachMatch.every(Boolean);
};

export default factories.createCoreController(
  "api::user-route.user-route",
  ({ strapi }) => ({
    async find(ctx: StrapiContext) {
      if (!ctx.query) {
        ctx.query = {};
      }
      if (!ctx.query.filters) {
        ctx.query.filters = {};
      }
      ctx.query.filters.owner = ctx.state.user.id;
      // @ts-expect-error - Strapi core controller method
      const routes = await super.find(ctx);
      // @ts-expect-error - Strapi core controller method
      return this.sanitizeOutput(routes, ctx);
    },

    async findOne(ctx: StrapiContext) {
      const route = await strapi.db.query("api::user-route.user-route").findOne({
        where: {
          id: ctx.params.id,
          owner: ctx.state.user.id,
        },
        populate: {
          image: true,
          sites: {
            populate: {
              site: {
                populate: {
                  type: true,
                  images: true,
                },
              },
            },
          },
          owner: {
            populate: {
              profile_pic: true,
            },
          },
        },
      });

      if (!route) {
        ctx.status = 404;
        return { status: 404, message: "Route not found" };
      }
      // @ts-expect-error - Strapi core controller method
      return this.transformResponse(route);
    },

    async findPublic(ctx: StrapiContext) {
      if (!ctx.query) {
        ctx.query = {};
      }
      if (!ctx.query.filters) {
        ctx.query.filters = {};
      }
      // Strapi 5: Use object notation for populate
      const existingPopulate = ctx.query.populate || {};
      ctx.query.populate = typeof existingPopulate === "object" && !Array.isArray(existingPopulate)
        ? {
            ...existingPopulate,
            image: true,
            owner: {
              populate: {
                profile_pic: true,
              },
            },
          }
        : {
            image: true,
            owner: {
              populate: {
                profile_pic: true,
              },
            },
          };
      ctx.query.filters.public = true;
      // @ts-expect-error - Strapi core controller method
      const routes = await super.find(ctx);
      // @ts-expect-error - Strapi core controller method
      return this.sanitizeOutput(routes, ctx);
    },

    async findRoutesByUserId(ctx: StrapiContext) {
      if (!ctx.query) {
        ctx.query = {};
      }
      if (!ctx.query.filters) {
        ctx.query.filters = {};
      }
      // Strapi 5: Use object notation for populate
      const existingPopulate = ctx.query.populate || {};
      ctx.query.populate = typeof existingPopulate === "object" && !Array.isArray(existingPopulate)
        ? {
            ...existingPopulate,
            image: true,
            owner: {
              populate: {
                profile_pic: true,
              },
            },
          }
        : {
            image: true,
            owner: {
              populate: {
                profile_pic: true,
              },
            },
          };
      const isOwner = Number(ctx.state.user.id) === Number(ctx.params.id);
      if (!isOwner) {
        ctx.query.filters.public = true;
      }
      ctx.query.filters.owner = Number(ctx.params.id);
      // @ts-expect-error - Strapi core controller method
      const routes = await super.find(ctx);
      // @ts-expect-error - Strapi core controller method
      return this.sanitizeOutput(routes, ctx);
    },

    async findOnePublic(ctx: StrapiContext) {
      const route = await strapi.db.query("api::user-route.user-route").findOne({
        where: {
          id: ctx.params.id,
          public: true,
        },
        populate: {
          image: true,
          sites: {
            populate: {
              site: {
                populate: {
                  type: true,
                  images: true,
                },
              },
            },
          },
          owner: {
            populate: {
              profile_pic: true,
            },
          },
        },
      });
      // @ts-expect-error - Strapi core controller method
      return this.transformResponse(route);
    },

    async create(ctx: StrapiContext) {
      if (!ctx.request?.body?.data) {
        return {
          status: 400,
          message: "Bad request",
        };
      }

      if (!ctx.state?.user?.id) {
        logger.error("user-route create: No user in context");
        return {
          status: 401,
          message: "Unauthorized",
        };
      }

      const requestData = ctx.request.body.data;
      logger.info("user-route create: Starting with data:", JSON.stringify(requestData));

      try {
        const sitesAsWaypoints = (requestData.sites || []).map(
          (site) => {
            if (site.custom) {
              return {
                latitude: site.custom.lat,
                longitude: site.custom.lng,
              };
            }
            return {
              latitude: site.lat as number,
              longitude: site.lng as number,
            };
          }
        );

        const waypointsWithoutFirstAndLast = [...sitesAsWaypoints].filter(
          (_f, i) => i !== 0 && i !== sitesAsWaypoints.length - 1
        );
        const waypoints =
          waypointsWithoutFirstAndLast.length > 0
            ? waypointsWithoutFirstAndLast
            : undefined;
        const origin = sitesAsWaypoints?.[0];
        const destination = sitesAsWaypoints?.[sitesAsWaypoints.length - 1];

        const polyline = await generatePolyline({
          waypoints,
          origin,
          destination,
          mode: requestData.mode,
        });

        // Strapi 5: Clean sites data for db.query
        // - Remove lat/lng (not in component schema, only used for polyline above)
        // - Keep site relation as simple ID (db.query accepts this)
        const cleanedSites = (requestData.sites || []).map((siteItem) => {
          if (siteItem.site) {
            // Site reference: extract ID if it's an object, otherwise use as-is
            const siteId = typeof siteItem.site === 'object' ? siteItem.site.id : siteItem.site;
            return { site: siteId, custom: null };
          }
          // Custom site: just keep the custom field
          return { site: null, custom: siteItem.custom };
        });

        logger.info("user-route create: Cleaned sites: " + JSON.stringify(cleanedSites));

        // Ensure owner is just an ID
        const ownerId = typeof ctx.state.user.id === 'object'
          ? (ctx.state.user.id as any).id || ctx.state.user.id
          : ctx.state.user.id;
        logger.info("user-route create: Owner ID: " + ownerId + " (type: " + typeof ownerId + ")");

        const createData = {
          name: requestData.name,
          public: requestData.public || false,
          mode: requestData.mode,
          polyline: polyline || undefined,
          sites: cleanedSites,
          owner: ownerId,
        };
        logger.info("user-route create: Full create data: " + JSON.stringify(createData));

        // Use db.query directly (accepts simple IDs for relations)
        const route = await strapi.db.query("api::user-route.user-route").create({
          data: createData,
        });

        if (!polyline) {
          logger.warn("No polyline generated when creating route:", route?.id);
        }

        logger.info("user-route create: Success, route id:", route?.id);

        // Return in Strapi 4 format
        return {
          data: {
            id: route.id,
            attributes: route,
          },
          meta: {},
        };
      } catch (error) {
        logger.error("user-route create: Error:", error);
        throw error;
      }
    },

    async update(ctx: StrapiContext) {
      const existingRoute = (await strapi.db.query("api::user-route.user-route").findOne({
        where: { id: ctx.params.id },
        select: ["id", "polyline", "mode"],
        populate: {
          sites: {
            populate: {
              site: { select: ["id"] },
            },
          },
        },
      })) as ExistingRoute;

      const requestData = ctx.request.body?.data;
      if (!requestData) {
        return { status: 400, message: "Bad request" };
      }

      const sitesHaveChanged = !checkIfPlacesMatch(
        existingRoute.sites,
        requestData.sites || []
      );

      const sitesAsWaypoints = (requestData.sites || []).map(
        (site) => {
          if (site.custom) {
            return {
              latitude: site.custom.lat,
              longitude: site.custom.lng,
            };
          }
          return {
            latitude: site.lat as number,
            longitude: site.lng as number,
          };
        }
      );

      let polyline: string | undefined;
      if (
        sitesHaveChanged ||
        existingRoute.mode !== requestData.mode
      ) {
        const waypointsWithoutFirstAndLast = [...sitesAsWaypoints].filter(
          (_f, i) => i !== 0 && i !== sitesAsWaypoints.length - 1
        );
        const waypoints =
          waypointsWithoutFirstAndLast.length > 0
            ? waypointsWithoutFirstAndLast
            : undefined;
        const origin = sitesAsWaypoints?.[0];
        const destination = sitesAsWaypoints?.[sitesAsWaypoints.length - 1];

        polyline = await generatePolyline({
          waypoints,
          origin,
          destination,
          mode: requestData.mode,
        });
        if (!polyline) {
          logger.warn(`No polyline generated when updating route: ${ctx.params.id}`);
        }
      }

      // Strapi 5: Clean sites data for db.query
      const cleanedSites = (requestData.sites || []).map((siteItem) => {
        if (siteItem.site) {
          const siteId = typeof siteItem.site === 'object' ? siteItem.site.id : siteItem.site;
          return { site: siteId, custom: null };
        }
        return { site: null, custom: siteItem.custom };
      });

      // Build update data
      const updateData: Record<string, unknown> = {};
      if (requestData.name !== undefined) updateData.name = requestData.name;
      if (requestData.public !== undefined) updateData.public = requestData.public;
      if (requestData.mode !== undefined) updateData.mode = requestData.mode;
      if (requestData.sites !== undefined) updateData.sites = cleanedSites;
      if (polyline) updateData.polyline = polyline;

      // Use db.query directly
      const route = await strapi.db.query("api::user-route.user-route").update({
        where: { id: ctx.params.id },
        data: updateData,
      });

      // Return in Strapi 4 format
      return {
        data: {
          id: route.id,
          attributes: route,
        },
        meta: {},
      };
    },
  })
);
