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

// Helper to format a relation in Strapi 4 format
const formatRelation = (relation: Record<string, unknown> | null) => {
  if (!relation) return null;
  const { id, documentId, ...attrs } = relation;
  return { data: { id, attributes: attrs } };
};

// Helper to format entity in Strapi 4 format (id separate from attributes)
const formatStrapi4Response = (entity: Record<string, unknown>) => {
  const { id, documentId, ...attributes } = entity;

  // Format sites array - each site component may have a nested site relation
  if (attributes.sites && Array.isArray(attributes.sites)) {
    attributes.sites = (attributes.sites as any[]).map((siteItem) => {
      if (siteItem.site && typeof siteItem.site === 'object') {
        // Format the nested site relation in Strapi 4 format
        const site = siteItem.site as Record<string, unknown>;
        const { id: siteId, documentId: siteDocId, ...siteAttrs } = site;

        // Format nested type relation
        if (siteAttrs.type && typeof siteAttrs.type === 'object') {
          siteAttrs.type = formatRelation(siteAttrs.type as Record<string, unknown>);
        }

        // Format nested images relation (array)
        if (siteAttrs.images && Array.isArray(siteAttrs.images)) {
          siteAttrs.images = {
            data: (siteAttrs.images as any[]).map((img) => {
              const { id: imgId, documentId: imgDocId, ...imgAttrs } = img;
              return { id: imgId, attributes: imgAttrs };
            }),
          };
        }

        return {
          ...siteItem,
          site: {
            data: {
              id: siteId,
              attributes: siteAttrs,
            },
          },
        };
      }
      return siteItem;
    });
  }

  return {
    id,
    attributes,
  };
};

export default factories.createCoreController(
  "api::user-route.user-route",
  ({ strapi }) => ({
    async find(ctx: StrapiContext) {
      // Strapi 5: Use db.query directly for better control
      const routes = await strapi.db.query("api::user-route.user-route").findMany({
        where: {
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
        },
        orderBy: { createdAt: "desc" },
      });

      // Return in Strapi 4 format
      return {
        data: routes.map((route) => formatStrapi4Response(route)),
        meta: {
          pagination: {
            page: 1,
            pageSize: routes.length,
            pageCount: 1,
            total: routes.length,
          },
        },
      };
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
      return { data: formatStrapi4Response(route), meta: {} };
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
      if (!route) {
        ctx.status = 404;
        return { status: 404, message: "Route not found" };
      }
      return { data: formatStrapi4Response(route), meta: {} };
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
      logger.info("user-route create: Starting with data: " + JSON.stringify(requestData));
      logger.info("user-route create: Incoming sites: " + JSON.stringify(requestData.sites));

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

        // Strapi 5 Document Service: For components with relations, use simple IDs
        const cleanedSites = (requestData.sites || []).map((siteItem) => {
          if (siteItem.site) {
            // Site reference: use simple ID for Document Service
            const siteId = typeof siteItem.site === 'object' ? siteItem.site.id : siteItem.site;
            return { site: siteId };
          }
          // Custom site: just keep the custom field
          return { custom: siteItem.custom };
        });

        logger.info("user-route create: Cleaned sites: " + JSON.stringify(cleanedSites));

        // Ensure owner is just an ID
        const ownerId = typeof ctx.state.user.id === 'object'
          ? (ctx.state.user.id as any).id || ctx.state.user.id
          : ctx.state.user.id;
        logger.info("user-route create: Owner ID: " + ownerId + " (type: " + typeof ownerId + ")");

        // Use Document Service API for Strapi 5 - handles components with relations properly
        const createData = {
          name: requestData.name,
          public: requestData.public || false,
          mode: requestData.mode,
          polyline: polyline || undefined,
          owner: ownerId,
          sites: cleanedSites,
        };
        logger.info("user-route create: Create data: " + JSON.stringify(createData));

        const createdRoute = await strapi.documents("api::user-route.user-route").create({
          data: createData,
        });

        if (!polyline) {
          logger.warn("No polyline generated when creating route:", createdRoute?.documentId);
        }

        logger.info("user-route create: Success, route id:", createdRoute?.id, "documentId:", createdRoute?.documentId);

        // Fetch the full route with sites populated for the response
        const route = await strapi.db.query("api::user-route.user-route").findOne({
          where: { id: createdRoute.id },
          populate: {
            image: true,
            sites: {
              populate: {
                site: true,
              },
            },
          },
        });

        // Return in Strapi 4 format
        return { data: formatStrapi4Response(route), meta: {} };
      } catch (error) {
        logger.error("user-route create: Error:", error);
        throw error;
      }
    },

    async update(ctx: StrapiContext) {
      // First get the existing route to check for changes and get documentId
      const existingRoute = (await strapi.db.query("api::user-route.user-route").findOne({
        where: { id: ctx.params.id },
        select: ["id", "documentId", "polyline", "mode"],
        populate: {
          sites: {
            populate: {
              site: { select: ["id"] },
            },
          },
        },
      })) as ExistingRoute & { documentId: string };

      if (!existingRoute) {
        return { status: 404, message: "Route not found" };
      }

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

      // Strapi 5 Document Service: For components with relations, use simple IDs
      const cleanedSites = (requestData.sites || []).map((siteItem) => {
        if (siteItem.site) {
          const siteId = typeof siteItem.site === 'object' ? siteItem.site.id : siteItem.site;
          return { site: siteId };
        }
        return { custom: siteItem.custom };
      });

      // Build update data
      const updateData: Record<string, unknown> = {};
      if (requestData.name !== undefined) updateData.name = requestData.name;
      if (requestData.public !== undefined) updateData.public = requestData.public;
      if (requestData.mode !== undefined) updateData.mode = requestData.mode;
      if (requestData.sites !== undefined) updateData.sites = cleanedSites;
      if (polyline) updateData.polyline = polyline;

      logger.info("user-route update: documentId:", existingRoute.documentId, "data:", JSON.stringify(updateData));

      // Use Document Service API for Strapi 5 - handles components with relations properly
      const route = await strapi.documents("api::user-route.user-route").update({
        documentId: existingRoute.documentId,
        data: updateData,
      });

      // Return in Strapi 4 format
      return { data: formatStrapi4Response(route), meta: {} };
    },
  })
);
