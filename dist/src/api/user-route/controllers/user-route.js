"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
const logger_1 = __importDefault(require("../../../nomad/logger"));
const getPolyline_1 = __importDefault(require("../../../nomad/getPolyline"));
const checkIfPlacesMatch = (api, req) => {
    if (api.length !== req.length) {
        return false;
    }
    const eachMatch = api.map((place, i) => {
        if (place.site && req[i].site) {
            return place.site.id === req[i].site;
        }
        else if (place.custom && req[i].custom) {
            const matchingLat = place.custom.lat === req[i].custom.lat;
            const matchingLng = place.custom.lng === req[i].custom.lng;
            return matchingLat && matchingLng;
        }
        return false;
    });
    return eachMatch.every(Boolean);
};
exports.default = strapi_1.factories.createCoreController("api::user-route.user-route", ({ strapi }) => ({
    async find(ctx) {
        if (!ctx.query) {
            ctx.query = {};
        }
        if (!ctx.query.filters) {
            ctx.query.filters = {};
        }
        ctx.query.filters.owner = ctx.state.user.id;
        // @ts-expect-error - Strapi core controller method
        const routes = await super.find(ctx);
        // @ts-expect-error - Strapi core controller method
        return this.sanitizeOutput(routes, ctx);
    },
    async findOne(ctx) {
        const route = await strapi.db.query("api::user-route.user-route").findOne({
            where: {
                id: ctx.params.id,
                owner: ctx.state.user.id,
            },
            populate: {
                image: true,
                sites: {
                    populate: {
                        site: {
                            populate: {
                                type: true,
                                images: true,
                            },
                        },
                    },
                },
                owner: {
                    populate: {
                        profile_pic: true,
                    },
                },
            },
        });
        if (!route) {
            ctx.status = 404;
            return { status: 404, message: "Route not found" };
        }
        // @ts-expect-error - Strapi core controller method
        return this.transformResponse(route);
    },
    async findPublic(ctx) {
        if (!ctx.query) {
            ctx.query = {};
        }
        if (!ctx.query.filters) {
            ctx.query.filters = {};
        }
        // Strapi 5: Use object notation for populate
        const existingPopulate = ctx.query.populate || {};
        ctx.query.populate = typeof existingPopulate === "object" && !Array.isArray(existingPopulate)
            ? {
                ...existingPopulate,
                image: true,
                owner: {
                    populate: {
                        profile_pic: true,
                    },
                },
            }
            : {
                image: true,
                owner: {
                    populate: {
                        profile_pic: true,
                    },
                },
            };
        ctx.query.filters.public = true;
        // @ts-expect-error - Strapi core controller method
        const routes = await super.find(ctx);
        // @ts-expect-error - Strapi core controller method
        return this.sanitizeOutput(routes, ctx);
    },
    async findRoutesByUserId(ctx) {
        if (!ctx.query) {
            ctx.query = {};
        }
        if (!ctx.query.filters) {
            ctx.query.filters = {};
        }
        // Strapi 5: Use object notation for populate
        const existingPopulate = ctx.query.populate || {};
        ctx.query.populate = typeof existingPopulate === "object" && !Array.isArray(existingPopulate)
            ? {
                ...existingPopulate,
                image: true,
                owner: {
                    populate: {
                        profile_pic: true,
                    },
                },
            }
            : {
                image: true,
                owner: {
                    populate: {
                        profile_pic: true,
                    },
                },
            };
        const isOwner = Number(ctx.state.user.id) === Number(ctx.params.id);
        if (!isOwner) {
            ctx.query.filters.public = true;
        }
        ctx.query.filters.owner = Number(ctx.params.id);
        // @ts-expect-error - Strapi core controller method
        const routes = await super.find(ctx);
        // @ts-expect-error - Strapi core controller method
        return this.sanitizeOutput(routes, ctx);
    },
    async findOnePublic(ctx) {
        const route = await strapi.db.query("api::user-route.user-route").findOne({
            where: {
                id: ctx.params.id,
                public: true,
            },
            populate: {
                image: true,
                sites: {
                    populate: {
                        site: {
                            populate: {
                                type: true,
                                images: true,
                            },
                        },
                    },
                },
                owner: {
                    populate: {
                        profile_pic: true,
                    },
                },
            },
        });
        // @ts-expect-error - Strapi core controller method
        return this.transformResponse(route);
    },
    async create(ctx) {
        var _a, _b;
        if (!((_b = (_a = ctx.request) === null || _a === void 0 ? void 0 : _a.body) === null || _b === void 0 ? void 0 : _b.data)) {
            return {
                status: 400,
                message: "Bad request",
            };
        }
        const requestData = ctx.request.body.data;
        const sitesAsWaypoints = (requestData.sites || []).map((site) => {
            if (site.custom) {
                return {
                    latitude: site.custom.lat,
                    longitude: site.custom.lng,
                };
            }
            return {
                latitude: site.lat,
                longitude: site.lng,
            };
        });
        const waypointsWithoutFirstAndLast = [...sitesAsWaypoints].filter((_f, i) => i !== 0 && i !== sitesAsWaypoints.length - 1);
        const waypoints = waypointsWithoutFirstAndLast.length > 0
            ? waypointsWithoutFirstAndLast
            : undefined;
        const origin = sitesAsWaypoints === null || sitesAsWaypoints === void 0 ? void 0 : sitesAsWaypoints[0];
        const destination = sitesAsWaypoints === null || sitesAsWaypoints === void 0 ? void 0 : sitesAsWaypoints[sitesAsWaypoints.length - 1];
        const polyline = await (0, getPolyline_1.default)({
            waypoints,
            origin,
            destination,
            mode: requestData.mode,
        });
        // Strapi 5: Clean sites data for db.query
        // - Remove lat/lng (not in component schema, only used for polyline above)
        // - Keep site relation as simple ID (db.query accepts this)
        const cleanedSites = (requestData.sites || []).map((site) => {
            if (site.site) {
                // Site reference: just keep the site ID
                return { site: site.site };
            }
            // Custom site: just keep the custom field
            return { custom: site.custom };
        });
        // Use db.query directly (accepts simple IDs for relations)
        const route = await strapi.db.query("api::user-route.user-route").create({
            data: {
                name: requestData.name,
                public: requestData.public || false,
                mode: requestData.mode,
                polyline: polyline || undefined,
                sites: cleanedSites,
                owner: ctx.state.user.id,
            },
        });
        if (!polyline) {
            logger_1.default.warn("No polyline generated when creating route:", route === null || route === void 0 ? void 0 : route.id);
        }
        // Return in Strapi 4 format
        return {
            data: {
                id: route.id,
                attributes: route,
            },
            meta: {},
        };
    },
    async update(ctx) {
        var _a;
        const existingRoute = (await strapi.db.query("api::user-route.user-route").findOne({
            where: { id: ctx.params.id },
            select: ["id", "polyline", "mode"],
            populate: {
                sites: {
                    populate: {
                        site: { select: ["id"] },
                    },
                },
            },
        }));
        const requestData = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data;
        if (!requestData) {
            return { status: 400, message: "Bad request" };
        }
        const sitesHaveChanged = !checkIfPlacesMatch(existingRoute.sites, requestData.sites || []);
        const sitesAsWaypoints = (requestData.sites || []).map((site) => {
            if (site.custom) {
                return {
                    latitude: site.custom.lat,
                    longitude: site.custom.lng,
                };
            }
            return {
                latitude: site.lat,
                longitude: site.lng,
            };
        });
        let polyline;
        if (sitesHaveChanged ||
            existingRoute.mode !== requestData.mode) {
            const waypointsWithoutFirstAndLast = [...sitesAsWaypoints].filter((_f, i) => i !== 0 && i !== sitesAsWaypoints.length - 1);
            const waypoints = waypointsWithoutFirstAndLast.length > 0
                ? waypointsWithoutFirstAndLast
                : undefined;
            const origin = sitesAsWaypoints === null || sitesAsWaypoints === void 0 ? void 0 : sitesAsWaypoints[0];
            const destination = sitesAsWaypoints === null || sitesAsWaypoints === void 0 ? void 0 : sitesAsWaypoints[sitesAsWaypoints.length - 1];
            polyline = await (0, getPolyline_1.default)({
                waypoints,
                origin,
                destination,
                mode: requestData.mode,
            });
            if (!polyline) {
                logger_1.default.warn(`No polyline generated when updating route: ${ctx.params.id}`);
            }
        }
        // Strapi 5: Clean sites data for db.query
        const cleanedSites = (requestData.sites || []).map((site) => {
            if (site.site) {
                return { site: site.site };
            }
            return { custom: site.custom };
        });
        // Build update data
        const updateData = {};
        if (requestData.name !== undefined)
            updateData.name = requestData.name;
        if (requestData.public !== undefined)
            updateData.public = requestData.public;
        if (requestData.mode !== undefined)
            updateData.mode = requestData.mode;
        if (requestData.sites !== undefined)
            updateData.sites = cleanedSites;
        if (polyline)
            updateData.polyline = polyline;
        // Use db.query directly
        const route = await strapi.db.query("api::user-route.user-route").update({
            where: { id: ctx.params.id },
            data: updateData,
        });
        // Return in Strapi 4 format
        return {
            data: {
                id: route.id,
                attributes: route,
            },
            meta: {},
        };
    },
}));
