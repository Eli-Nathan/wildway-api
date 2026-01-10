import type { StrapiContext, MiddlewareFactory } from "../../../types/strapi";

const populateList = ["relevance"];

const enrichCtx = (ctx: StrapiContext): StrapiContext => {
  if (!ctx.query) {
    ctx.query = {};
  }
  const currentPopulateList = (ctx.query.populate as string[]) || [];
  ctx.query.populate = [...currentPopulateList, ...populateList];
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
