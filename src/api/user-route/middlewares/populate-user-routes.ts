import type { StrapiContext, MiddlewareFactory } from "../../../types/strapi";

/**
 * Strapi 5 populate format - object notation required
 * Converting: ["tags", "sites", "sites.site", "sites.site.type"]
 */
const populateConfig = {
  tags: true,
  sites: {
    populate: {
      site: {
        populate: {
          type: true,
        },
      },
    },
  },
};

const enrichCtx = (ctx: StrapiContext): StrapiContext => {
  if (!ctx.query) {
    ctx.query = {};
  }
  const existingPopulate = ctx.query.populate || {};
  if (typeof existingPopulate === "object" && !Array.isArray(existingPopulate)) {
    ctx.query.populate = { ...existingPopulate, ...populateConfig };
  } else {
    ctx.query.populate = populateConfig;
  }
  return ctx;
};

const populateUserRoutes: MiddlewareFactory = (_config, { strapi: _strapi }) => {
  return async (context, next) => {
    enrichCtx(context);
    await next();
  };
};

export default populateUserRoutes;
