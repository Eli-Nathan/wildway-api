import type { StrapiContext, MiddlewareFactory } from "../../../types/strapi";

/**
 * Strapi 5 populate format - must use nested object notation
 * Instead of ["filter", "filter.filter"], use:
 * { filter: { populate: { filter: true } } }
 */
const populateConfig = {
  filter: {
    populate: {
      filters: {
        populate: {
          filter: {
            populate: {
              filter: {
                populate: {
                  siteType: true,
                  facility: true,
                },
              },
              remote_icon: true,
            },
          },
        },
      },
    },
  },
};

const enrichCtx = (ctx: StrapiContext): StrapiContext => {
  if (!ctx.query) {
    ctx.query = {};
  }
  // In Strapi 5, populate must be an object, not an array of strings
  // Merge with any existing populate config
  const existingPopulate = ctx.query.populate || {};
  if (typeof existingPopulate === "object" && !Array.isArray(existingPopulate)) {
    ctx.query.populate = { ...existingPopulate, ...populateConfig };
  } else {
    // If it's not an object (e.g., "*" or array), replace with our config
    ctx.query.populate = populateConfig;
  }
  return ctx;
};

const populateFilterlinks: MiddlewareFactory = (_config, { strapi: _strapi }) => {
  return async (context, next) => {
    enrichCtx(context);
    await next();
  };
};

export default populateFilterlinks;
