"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Strapi 5 populate format - object notation required
 * Converting: ["tags", "sites", "sites.site", "sites.site.type"]
 */
const populateConfig = {
    tags: true,
    sites: {
        populate: {
            site: {
                populate: {
                    type: true,
                },
            },
        },
    },
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
const populateUserRoutes = (_config, { strapi: _strapi }) => {
    return async (context, next) => {
        enrichCtx(context);
        await next();
    };
};
exports.default = populateUserRoutes;
