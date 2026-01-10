import type { StrapiContext, MiddlewareFactory } from "../../../types/strapi";

const populateList = [
  "type",
  "type.remote_icon",
  "type.remote_marker",
  "facilities",
  "sub_types",
  "tags",
  "images",
];

const enrichCtx = (ctx: StrapiContext): StrapiContext => {
  if (!ctx.query) {
    ctx.query = {};
  }
  const currentPopulateList = (ctx.query.populate as string[]) || [];
  ctx.query.populate = [...currentPopulateList, ...populateList];
  return ctx;
};

const populateSites: MiddlewareFactory = (_config, { strapi: _strapi }) => {
  return async (context, next) => {
    enrichCtx(context);
    await next();
  };
};

export default populateSites;
