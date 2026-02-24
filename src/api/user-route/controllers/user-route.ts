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
      // Allow viewing routes that are owned by the current user OR are public
      const route = await strapi.db.query("api::user-route.user-route").findOne({
        where: {
          id: ctx.params.id,
          $or: [
            { owner: ctx.state.user.id },
            { public: true },
          ],
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
      // Strapi 5: Use db.query directly for better control
      const routes = await strapi.db.query("api::user-route.user-route").findMany({
        where: {
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

    async findRoutesByUserId(ctx: StrapiContext) {
      const isOwner = Number(ctx.state.user.id) === Number(ctx.params.id);

      // Build where clause
      const where: Record<string, unknown> = {
        owner: Number(ctx.params.id),
      };
      if (!isOwner) {
        where.public = true;
      }

      // Strapi 5: Use db.query directly for better control
      const routes = await strapi.db.query("api::user-route.user-route").findMany({
        where,
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
      const updatedRoute = await strapi.documents("api::user-route.user-route").update({
        documentId: existingRoute.documentId,
        data: updateData,
      });

      // Fetch the full route with sites populated for the response
      const route = await strapi.db.query("api::user-route.user-route").findOne({
        where: { id: updatedRoute.id },
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
      });

      // Return in Strapi 4 format
      return { data: formatStrapi4Response(route), meta: {} };
    },

    async delete(ctx: StrapiContext) {
      // First get the route to verify ownership and get documentId
      const existingRoute = await strapi.db.query("api::user-route.user-route").findOne({
        where: {
          id: ctx.params.id,
          owner: ctx.state.user.id,
        },
        select: ["id", "documentId"],
      });

      if (!existingRoute) {
        ctx.status = 404;
        return { status: 404, message: "Route not found" };
      }

      // Use Document Service to delete
      await strapi.documents("api::user-route.user-route").delete({
        documentId: existingRoute.documentId,
      });

      return { data: { id: existingRoute.id }, meta: {} };
    },

    /**
     * Get route data for offline download
     * Returns the route with all associated sites and metadata
     */
    async getOfflineData(ctx: StrapiContext) {
      // Get the route with full site data
      const route = await strapi.db.query("api::user-route.user-route").findOne({
        where: {
          id: ctx.params.id,
          $or: [
            { owner: ctx.state.user.id },
            { public: true },
          ],
        },
        populate: {
          image: true,
          sites: {
            populate: {
              site: {
                populate: {
                  type: {
                    populate: {
                      remote_icon: true,
                      remote_marker: true,
                    },
                  },
                  images: true,
                  facilities: true,
                },
              },
            },
          },
        },
      });

      if (!route) {
        ctx.status = 404;
        return { status: 404, message: "Route not found" };
      }

      // Extract sites from the route components
      const allSites = (route.sites || [])
        .filter((item: any) => item.site) // Filter out custom places
        .map((item: any) => item.site);

      // Calculate bounds from sites
      let bounds = null;
      if (allSites.length > 0) {
        let north = -90, south = 90, east = -180, west = 180;
        for (const site of allSites) {
          if (site.lat != null && site.lng != null) {
            north = Math.max(north, site.lat);
            south = Math.min(south, site.lat);
            east = Math.max(east, site.lng);
            west = Math.min(west, site.lng);
          }
        }
        // Add padding
        const latPadding = (north - south) * 0.1;
        const lngPadding = (east - west) * 0.1;
        bounds = {
          north: north + latPadding,
          south: south - latPadding,
          east: east + lngPadding,
          west: west - lngPadding,
        };
      }

      // Calculate origin/destination from first and last site
      const origin = allSites[0]
        ? { lat: allSites[0].lat, lng: allSites[0].lng }
        : null;
      const destination = allSites.length > 1
        ? { lat: allSites[allSites.length - 1].lat, lng: allSites[allSites.length - 1].lng }
        : origin;

      // Estimate tile count
      const estimatedTileCount = bounds
        ? Math.ceil((bounds.north - bounds.south) * (bounds.east - bounds.west) * 1000)
        : 0;

      // Estimate size in MB
      const sitesJsonSize = JSON.stringify(allSites).length / (1024 * 1024);
      const estimatedSizeMb = Math.ceil(sitesJsonSize + (estimatedTileCount * 0.02));

      return {
        route: {
          id: route.id,
          type: "user",
          name: route.name,
          polyline: route.polyline,
          mode: route.mode,
          image: route.image,
          origin,
          destination,
          bounds,
        },
        sites: allSites,
        meta: {
          siteCount: allSites.length,
          estimatedTileCount,
          estimatedSizeMb,
        },
      };
    },
  })
);
