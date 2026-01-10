import type { StrapiContext, MiddlewareFactory } from "../../../types/strapi";

const populateList = ["images"];

const enrichCtx = (ctx: StrapiContext): StrapiContext => {
  if (!ctx.query) {
    ctx.query = {};
  }
  const currentPopulateList = (ctx.query.populate as string[]) || [];
  ctx.query.populate = [...currentPopulateList, ...populateList];
  return ctx;
};

const populateAdditions: MiddlewareFactory = (_config, { strapi: _strapi }) => {
  return async (context, next) => {
    enrichCtx(context);
    await next();
  };
};

export default populateAdditions;
