"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Strapi 5 populate format - object notation required
 */
const populateConfig = {
    images: true,
    site: true,
};
const enrichCtx = (ctx) => {
    if (!ctx.query) {
        ctx.query = {};
    }
    const existingPopulate = ctx.query.populate || {};
    if (typeof existingPopulate === "object" && !Array.isArray(existingPopulate)) {
        ctx.query.populate = { ...existingPopulate, ...populateConfig };
    }
    else {
        ctx.query.populate = populateConfig;
    }
    return ctx;
};
const populateEdits = (_config, { strapi: _strapi }) => {
    return async (context, next) => {
        enrichCtx(context);
        await next();
    };
};
exports.default = populateEdits;
