"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const populateList = ["images", "potential_duplicates"];
const enrichCtx = (ctx) => {
    if (!ctx.query) {
        ctx.query = {};
    }
    const currentPopulateList = ctx.query.populate || [];
    ctx.query.populate = [...currentPopulateList, ...populateList];
    return ctx;
};
const populateAdditions = (_config, { strapi: _strapi }) => {
    return async (context, next) => {
        enrichCtx(context);
        await next();
    };
};
exports.default = populateAdditions;
