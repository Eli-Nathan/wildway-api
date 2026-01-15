import type { StrapiContext, MiddlewareFactory } from "../../../types/strapi";

/**
 * Strapi 5 populate format - object notation required
 */
const populateConfig = {
  relevance: true,
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
  if (!ctx.query.pagination) {
    ctx.query.pagination = {};
  }
  ctx.query.pagination = {
    ...ctx.query.pagination,
    pageSize: ctx.query.pagination?.pageSize || 100,
  };
  return ctx;
};

const populateFacilities: MiddlewareFactory = (_config, { strapi: _strapi }) => {
  return async (context, next) => {
    enrichCtx(context);
    await next();
  };
};

export default populateFacilities;
