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
      const route = await strapi.entityService.findOne(
        `api::user-route.user-route`,
        ctx.params.id as string,
        {
          filters: {
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
        }
      );

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
      if (!ctx.query.populate) {
        ctx.query.populate = [];
      }
      ctx.query.populate = [
        ...ctx.query.populate,
        "image",
        "owner",
        "owner.profile_pic",
      ];
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
      if (!ctx.query.populate) {
        ctx.query.populate = [];
      }
      ctx.query.populate = [
        ...ctx.query.populate,
        "image",
        "owner",
        "owner.profile_pic",
      ];
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
      if (!ctx.query) {
        ctx.query = {};
      }
      if (!ctx.query.filters) {
        ctx.query.filters = {};
      }
      ctx.query.filters.public = true;
      const route = await strapi.entityService.findOne(
        `api::user-route.user-route`,
        ctx.params.id as string,
        {
          filters: {
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
        }
      );
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

      const sitesAsWaypoints = (ctx.request.body.data.sites || []).map(
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
        mode: ctx.request?.body?.data?.mode,
      });
      if (polyline) {
        ctx.request.body.data.polyline = polyline;
      }
      // @ts-expect-error - Strapi core controller method
      const route = await super.create(ctx);
      // @ts-expect-error - Strapi core controller method
      const sanitized = await this.sanitizeOutput(route, ctx);
      if (!polyline) {
        logger.warn(
          "No polyline generated when creating route:",
          sanitized?.data?.id
        );
      }
      return sanitized;
    },

    async update(ctx: StrapiContext) {
      const existingRoute = (await strapi.entityService.findOne(
        `api::user-route.user-route`,
        ctx.params.id as string,
        {
          fields: ["polyline"],
          populate: {
            sites: {
              populate: {
                site: { fields: ["id"] },
              },
            },
          },
        }
      )) as ExistingRoute;

      const sitesHaveChanged = !checkIfPlacesMatch(
        existingRoute.sites,
        ctx.request.body?.data?.sites || []
      );

      const sitesAsWaypoints = (ctx.request.body?.data?.sites || []).map(
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

      if (
        sitesHaveChanged ||
        existingRoute.mode !== ctx.request?.body?.data?.mode
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

        const polyline = await generatePolyline({
          waypoints,
          origin,
          destination,
          mode: ctx.request?.body?.data?.mode,
        });
        if (polyline && ctx.request.body?.data) {
          ctx.request.body.data.polyline = polyline;
        } else {
          logger.warn(
            `No polyline generated when updating route: ${ctx.params.id}`
          );
        }
      }

      // @ts-expect-error - Strapi core controller method
      const route = await super.update(ctx);
      // @ts-expect-error - Strapi core controller method
      return await this.sanitizeOutput(route, ctx);
    },
  })
);
