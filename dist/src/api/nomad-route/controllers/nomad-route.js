"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
// Site types to show in POIs list (viewpoints, historic, interesting - not camping/parking)
const POI_TYPE_IDS = [26, 9, 27]; // view-point, historic, wow/interesting
// Limits for POIs and stays
const POI_LIMIT = 200;
const STAY_LIMIT = 100;
/**
 * Calculate priority score for a site.
 * Higher score = more prominent in the list.
 *
 * Uses the pre-calculated priority field from the moderator plugin.
 * That field accounts for: description, images, site-lists, likes, business tier.
 *
 * We also add a small boost for images here since they improve visual appeal in lists.
 */
function calculatePriority(site) {
    // Use the pre-calculated priority from the moderator plugin
    let score = site.priority || 0;
    // Small visual boost for sites with images (they look better in horizontal lists)
    if (site.images && site.images.length > 0) {
        score += 1;
    }
    return score;
}
/**
 * Filter and sort POIs by type and priority
 */
function filterAndSortPOIs(pois) {
    if (!pois || !Array.isArray(pois))
        return [];
    return pois
        // Filter to only show viewpoints, historic, interesting
        .filter((poi) => {
        var _a;
        const typeId = (_a = poi.type) === null || _a === void 0 ? void 0 : _a.id;
        return typeId && POI_TYPE_IDS.includes(typeId);
    })
        // Calculate and attach priority score
        .map((poi) => ({
        ...poi,
        _priorityScore: calculatePriority(poi),
    }))
        // Sort by priority (highest first)
        .sort((a, b) => b._priorityScore - a._priorityScore)
        // Limit results
        .slice(0, POI_LIMIT)
        // Remove internal score field
        .map(({ _priorityScore, ...poi }) => poi);
}
/**
 * Sort stays by priority and limit
 */
function filterAndSortStays(stays) {
    if (!stays || !Array.isArray(stays))
        return [];
    return stays
        .map((stay) => ({
        ...stay,
        _priorityScore: calculatePriority(stay),
    }))
        .sort((a, b) => b._priorityScore - a._priorityScore)
        .slice(0, STAY_LIMIT)
        .map(({ _priorityScore, ...stay }) => stay);
}
exports.default = strapi_1.factories.createCoreController("api::nomad-route.nomad-route", ({ strapi }) => ({
    async find(ctx) {
        // @ts-expect-error - Strapi core controller method
        const routes = await super.find(ctx);
        // @ts-expect-error - Strapi core controller method
        return this.sanitizeOutput(routes, ctx);
    },
    async findOne(ctx) {
        const route = await strapi.db.query("api::nomad-route.nomad-route").findOne({
            where: { id: ctx.params.id },
            populate: {
                image: true,
                tags: true,
                pois: {
                    populate: {
                        type: {
                            populate: {
                                remote_icon: true,
                                remote_marker: true,
                            },
                        },
                        images: true,
                        site_lists: { select: ["id"] },
                    },
                },
                stay: {
                    populate: {
                        type: {
                            populate: {
                                remote_icon: true,
                                remote_marker: true,
                            },
                        },
                        images: true,
                        site_lists: { select: ["id"] },
                    },
                },
            },
        });
        if (!route) {
            ctx.status = 404;
            return { status: 404, message: "Route not found" };
        }
        // Filter and sort POIs/stays by type and priority
        route.pois = filterAndSortPOIs(route.pois);
        route.stay = filterAndSortStays(route.stay);
        // @ts-expect-error - Strapi core controller method
        return this.transformResponse(route, ctx);
    },
    async findOneByUID(ctx) {
        const route = await strapi.db
            .query("api::nomad-route.nomad-route")
            .findOne({
            where: { slug: ctx.params.slug },
            populate: {
                image: true,
                tags: true,
                pois: {
                    populate: {
                        type: {
                            populate: {
                                remote_icon: true,
                                remote_marker: true,
                            },
                        },
                        images: true,
                        site_lists: { select: ["id"] },
                    },
                },
                stay: {
                    populate: {
                        type: {
                            populate: {
                                remote_icon: true,
                                remote_marker: true,
                            },
                        },
                        images: true,
                        site_lists: { select: ["id"] },
                    },
                },
            },
        });
        if (!route) {
            ctx.status = 404;
            return { status: 404, message: "Route not found" };
        }
        // Filter and sort POIs/stays by type and priority
        route.pois = filterAndSortPOIs(route.pois);
        route.stay = filterAndSortStays(route.stay);
        // @ts-expect-error - Strapi core controller method
        return this.transformResponse(route, ctx);
    },
    /**
     * Admin update for nomad routes (bypasses auth)
     * Uses X-Admin-Secret header for authentication
     */
    async adminUpdate(ctx) {
        var _a, _b, _c;
        const existingRoute = await strapi.db
            .query("api::nomad-route.nomad-route")
            .findOne({
            where: { id: ctx.params.id },
        });
        if (!existingRoute) {
            ctx.status = 404;
            return { status: 404, message: "Route not found" };
        }
        const requestData = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || {};
        const updated = await strapi.db
            .query("api::nomad-route.nomad-route")
            .update({
            where: { id: ctx.params.id },
            data: requestData,
            populate: {
                pois: { select: ["id"] },
                stay: { select: ["id"] },
            },
        });
        return {
            data: {
                id: updated.id,
                attributes: {
                    ...updated,
                    poisCount: ((_b = updated.pois) === null || _b === void 0 ? void 0 : _b.length) || 0,
                    stayCount: ((_c = updated.stay) === null || _c === void 0 ? void 0 : _c.length) || 0,
                },
            },
            meta: {},
        };
    },
}));
