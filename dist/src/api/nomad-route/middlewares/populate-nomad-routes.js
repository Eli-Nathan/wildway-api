"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const populateList = ["tags", "image"];
const enrichCtx = (ctx) => {
    if (!ctx.query) {
        ctx.query = {};
    }
    const currentPopulateList = ctx.query.populate || [];
    ctx.query.populate = [...currentPopulateList, ...populateList];
    return ctx;
};
const populateNomadRoutes = (_config, { strapi: _strapi }) => {
    return async (context, next) => {
        enrichCtx(context);
        await next();
    };
};
exports.default = populateNomadRoutes;
