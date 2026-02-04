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
            },
          },
        },
      });

      if (!route) {
        ctx.status = 404;
        return { status: 404, message: "Route not found" };
      }
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
              },
            },
          },
        });

      if (!route) {
        ctx.status = 404;
        return { status: 404, message: "Route not found" };
      }
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
