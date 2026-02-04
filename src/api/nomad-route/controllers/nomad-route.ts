// @ts-nocheck
import { factories } from "@strapi/strapi";

interface StrapiContext {
  query: Record<string, unknown>;
  params: {
    id?: string;
    slug?: string;
  };
  request: {
    body?: {
      data?: any;
    };
  };
  status?: number;
}

// Site types to show in POIs list (viewpoints, historic, interesting - not camping/parking)
const POI_TYPE_IDS = [26, 9, 27]; // view-point, historic, wow/interesting

// Limits for POIs and stays
const POI_LIMIT = 200;
const STAY_LIMIT = 100;

/**
 * Calculate priority score for a site.
 * Higher score = more prominent in the list.
 *
 * Scoring:
 * - Base priority field (0-5): up to 5 points
 * - Has description: +3 points
 * - Has images: +2 points
 * - On a site-list: +2 points
 * - Future: business tier would add more points
 */
function calculatePriority(site: any): number {
  let score = site.priority || 0;

  // Has description (non-empty)
  if (site.description && site.description.trim().length > 0) {
    score += 3;
  }

  // Has images
  if (site.images && site.images.length > 0) {
    score += 2;
  }

  // Is on a site-list
  if (site.site_lists && site.site_lists.length > 0) {
    score += 2;
  }

  // Future: Add business tier scoring here
  // if (site.business_tier) {
  //   score += site.business_tier * 5;
  // }

  return score;
}

/**
 * Filter and sort POIs by type and priority
 */
function filterAndSortPOIs(pois: any[]): any[] {
  if (!pois || !Array.isArray(pois)) return [];

  return pois
    // Filter to only show viewpoints, historic, interesting
    .filter((poi) => {
      const typeId = poi.type?.id;
      return typeId && POI_TYPE_IDS.includes(typeId);
    })
    // Calculate and attach priority score
    .map((poi) => ({
      ...poi,
      _priorityScore: calculatePriority(poi),
    }))
    // Sort by priority (highest first)
    .sort((a, b) => b._priorityScore - a._priorityScore)
    // Limit results
    .slice(0, POI_LIMIT)
    // Remove internal score field
    .map(({ _priorityScore, ...poi }) => poi);
}

/**
 * Sort stays by priority and limit
 */
function filterAndSortStays(stays: any[]): any[] {
  if (!stays || !Array.isArray(stays)) return [];

  return stays
    .map((stay) => ({
      ...stay,
      _priorityScore: calculatePriority(stay),
    }))
    .sort((a, b) => b._priorityScore - a._priorityScore)
    .slice(0, STAY_LIMIT)
    .map(({ _priorityScore, ...stay }) => stay);
}

export default factories.createCoreController(
  "api::nomad-route.nomad-route",
  ({ strapi }) => ({
    async find(ctx: StrapiContext) {
      // @ts-expect-error - Strapi core controller method
      const routes = await super.find(ctx);
      // @ts-expect-error - Strapi core controller method
      return this.sanitizeOutput(routes, ctx);
    },

    async findOne(ctx: StrapiContext) {
      const route = await strapi.db.query("api::nomad-route.nomad-route").findOne({
        where: { id: ctx.params.id },
        populate: {
          image: true,
          tags: true,
          pois: {
            populate: {
              type: {
                populate: {
                  remote_icon: true,
                  remote_marker: true,
                },
              },
              images: true,
              site_lists: { select: ["id"] },
            },
          },
          stay: {
            populate: {
              type: {
                populate: {
                  remote_icon: true,
                  remote_marker: true,
                },
              },
              images: true,
              site_lists: { select: ["id"] },
            },
          },
        },
      });

      if (!route) {
        ctx.status = 404;
        return { status: 404, message: "Route not found" };
      }

      // Filter and sort POIs/stays by type and priority
      route.pois = filterAndSortPOIs(route.pois);
      route.stay = filterAndSortStays(route.stay);

      // @ts-expect-error - Strapi core controller method
      return this.transformResponse(route, ctx);
    },

    async findOneByUID(ctx: StrapiContext) {
      const route = await strapi.db
        .query("api::nomad-route.nomad-route")
        .findOne({
          where: { slug: ctx.params.slug },
          populate: {
            image: true,
            tags: true,
            pois: {
              populate: {
                type: {
                  populate: {
                    remote_icon: true,
                    remote_marker: true,
                  },
                },
                images: true,
                site_lists: { select: ["id"] },
              },
            },
            stay: {
              populate: {
                type: {
                  populate: {
                    remote_icon: true,
                    remote_marker: true,
                  },
                },
                images: true,
                site_lists: { select: ["id"] },
              },
            },
          },
        });

      if (!route) {
        ctx.status = 404;
        return { status: 404, message: "Route not found" };
      }

      // Filter and sort POIs/stays by type and priority
      route.pois = filterAndSortPOIs(route.pois);
      route.stay = filterAndSortStays(route.stay);

      // @ts-expect-error - Strapi core controller method
      return this.transformResponse(route, ctx);
    },

    /**
     * Admin update for nomad routes (bypasses auth)
     * Uses X-Admin-Secret header for authentication
     */
    async adminUpdate(ctx: StrapiContext) {
      const existingRoute = await strapi.db
        .query("api::nomad-route.nomad-route")
        .findOne({
          where: { id: ctx.params.id },
        });

      if (!existingRoute) {
        ctx.status = 404;
        return { status: 404, message: "Route not found" };
      }

      const requestData = ctx.request.body?.data || {};

      const updated = await strapi.db
        .query("api::nomad-route.nomad-route")
        .update({
          where: { id: ctx.params.id },
          data: requestData,
          populate: {
            pois: { select: ["id"] },
            stay: { select: ["id"] },
          },
        });

      return {
        data: {
          id: updated.id,
          attributes: {
            ...updated,
            poisCount: updated.pois?.length || 0,
            stayCount: updated.stay?.length || 0,
          },
        },
        meta: {},
      };
    },
  })
);
