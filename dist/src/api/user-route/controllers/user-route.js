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
        var _a, _b, _c, _d, _e, _g;
        if (!((_b = (_a = ctx.request) === null || _a === void 0 ? void 0 : _a.body) === null || _b === void 0 ? void 0 : _b.data)) {
            return {
                status: 400,
                message: "Bad request",
            };
        }
        const sitesAsWaypoints = (ctx.request.body.data.sites || []).map((site) => {
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
            mode: (_e = (_d = (_c = ctx.request) === null || _c === void 0 ? void 0 : _c.body) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.mode,
        });
        if (polyline) {
            ctx.request.body.data.polyline = polyline;
        }
        // Strapi 5: Transform sites to proper format
        // - Remove lat/lng (not in schema, only used for polyline generation above)
        // - Transform site relation to connect syntax
        if (ctx.request.body.data.sites) {
            ctx.request.body.data.sites = ctx.request.body.data.sites.map((site) => {
                if (site.site) {
                    // Site reference: transform to connect syntax, remove lat/lng
                    return {
                        site: { connect: [{ id: site.site }] },
                    };
                }
                // Custom site: just keep the custom field
                return { custom: site.custom };
            });
        }
        // @ts-expect-error - Strapi core controller method
        const route = await super.create(ctx);
        // @ts-expect-error - Strapi core controller method
        const sanitized = await this.sanitizeOutput(route, ctx);
        if (!polyline) {
            logger_1.default.warn("No polyline generated when creating route:", (_g = sanitized === null || sanitized === void 0 ? void 0 : sanitized.data) === null || _g === void 0 ? void 0 : _g.id);
        }
        return sanitized;
    },
    async update(ctx) {
        var _a, _b, _c, _d, _e, _g, _h, _j, _k, _l, _m, _o, _p;
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
        const sitesHaveChanged = !checkIfPlacesMatch(existingRoute.sites, ((_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.sites) || []);
        const sitesAsWaypoints = (((_d = (_c = ctx.request.body) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.sites) || []).map((site) => {
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
        if (sitesHaveChanged ||
            existingRoute.mode !== ((_h = (_g = (_e = ctx.request) === null || _e === void 0 ? void 0 : _e.body) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h.mode)) {
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
                mode: (_l = (_k = (_j = ctx.request) === null || _j === void 0 ? void 0 : _j.body) === null || _k === void 0 ? void 0 : _k.data) === null || _l === void 0 ? void 0 : _l.mode,
            });
            if (polyline && ((_m = ctx.request.body) === null || _m === void 0 ? void 0 : _m.data)) {
                ctx.request.body.data.polyline = polyline;
            }
            else {
                logger_1.default.warn(`No polyline generated when updating route: ${ctx.params.id}`);
            }
        }
        // Strapi 5: Transform sites to proper format
        // - Remove lat/lng (not in schema, only used for polyline generation above)
        // - Transform site relation to connect syntax
        if ((_p = (_o = ctx.request.body) === null || _o === void 0 ? void 0 : _o.data) === null || _p === void 0 ? void 0 : _p.sites) {
            ctx.request.body.data.sites = ctx.request.body.data.sites.map((site) => {
                if (site.site) {
                    // Site reference: transform to connect syntax, remove lat/lng
                    return {
                        site: { connect: [{ id: site.site }] },
                    };
                }
                // Custom site: just keep the custom field
                return { custom: site.custom };
            });
        }
        // @ts-expect-error - Strapi core controller method
        const route = await super.update(ctx);
        // @ts-expect-error - Strapi core controller method
        return await this.sanitizeOutput(route, ctx);
    },
}));
