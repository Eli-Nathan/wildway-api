"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Strapi 5 populate format - object notation required
 */
const populateConfig = {
    relevance: true,
};
const enrichCtx = (ctx) => {
    var _a;
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
    if (!ctx.query.pagination) {
        ctx.query.pagination = {};
    }
    ctx.query.pagination = {
        ...ctx.query.pagination,
        pageSize: ((_a = ctx.query.pagination) === null || _a === void 0 ? void 0 : _a.pageSize) || 100,
    };
    return ctx;
};
const populateFacilities = (_config, { strapi: _strapi }) => {
    return async (context, next) => {
        enrichCtx(context);
        await next();
    };
};
exports.default = populateFacilities;
