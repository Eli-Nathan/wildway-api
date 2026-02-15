"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Strapi 5 populate format - object notation required
 * Converting from:
 * ["type", "type.remote_icon", "type.remote_marker", "reviews",
 *  "reviews.owner", "reviews.site", "reviews.image", "owners", "facilities",
 *  "sub_types", "images", "tags", "likes"]
 */
const populateConfig = {
    type: {
        populate: {
            remote_icon: true,
            remote_marker: true,
        },
    },
    // Reviews are fetched separately via paginated /reviews endpoint
    // Site only includes averageRating and reviewCount
    owners: true,
    facilities: true,
    sub_types: true,
    images: true,
    tags: true,
    likes: true,
    route_metadata: true,
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
const populateSite = (_config, { strapi: _strapi }) => {
    return async (context, next) => {
        enrichCtx(context);
        await next();
    };
};
exports.default = populateSite;
