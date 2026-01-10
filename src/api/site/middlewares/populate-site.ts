import type { StrapiContext, MiddlewareFactory } from "../../../types/strapi";

const populateList = [
  "type",
  "type.remote_icon",
  "type.remote_marker",
  "type",
  "comments",
  "comments.owner",
  "comments.site",
  "owners",
  "facilities",
  "sub_types",
  "images",
  "tags",
  "likes",
];

const enrichCtx = (ctx: StrapiContext): StrapiContext => {
  if (!ctx.query) {
    ctx.query = {};
  }
  const currentPopulateList = (ctx.query.populate as string[]) || [];
  ctx.query.populate = [...currentPopulateList, ...populateList];
  return ctx;
};

const populateSite: MiddlewareFactory = (_config, { strapi: _strapi }) => {
  return async (context, next) => {
    enrichCtx(context);
    await next();
  };
};

export default populateSite;
