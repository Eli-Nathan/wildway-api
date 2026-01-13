"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const populateList = ["site", "owner"];
const enrichCtx = (ctx) => {
    if (!ctx.query) {
        ctx.query = {};
    }
    const currentPopulateList = ctx.query.populate || [];
    ctx.query.populate = [...currentPopulateList, ...populateList];
    return ctx;
};
const populateComments = (_config, { strapi: _strapi }) => {
    return async (context, next) => {
        enrichCtx(context);
        await next();
    };
};
exports.default = populateComments;
