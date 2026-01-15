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
// Helper to format a relation in Strapi 4 format
const formatRelation = (relation) => {
    if (!relation)
        return null;
    const { id, documentId, ...attrs } = relation;
    return { data: { id, attributes: attrs } };
};
// Helper to format entity in Strapi 4 format (id separate from attributes)
const formatStrapi4Response = (entity) => {
    const { id, documentId, ...attributes } = entity;
    // Format sites array - each site component may have a nested site relation
    if (attributes.sites && Array.isArray(attributes.sites)) {
        attributes.sites = attributes.sites.map((siteItem) => {
            if (siteItem.site && typeof siteItem.site === 'object') {
                // Format the nested site relation in Strapi 4 format
                const site = siteItem.site;
                const { id: siteId, documentId: siteDocId, ...siteAttrs } = site;
                // Format nested type relation
                if (siteAttrs.type && typeof siteAttrs.type === 'object') {
                    siteAttrs.type = formatRelation(siteAttrs.type);
                }
                // Format nested images relation (array)
                if (siteAttrs.images && Array.isArray(siteAttrs.images)) {
                    siteAttrs.images = {
                        data: siteAttrs.images.map((img) => {
                            const { id: imgId, documentId: imgDocId, ...imgAttrs } = img;
                            return { id: imgId, attributes: imgAttrs };
                        }),
                    };
                }
                return {
                    ...siteItem,
                    site: {
                        data: {
                            id: siteId,
                            attributes: siteAttrs,
                        },
                    },
                };
            }
            return siteItem;
        });
    }
    return {
        id,
        attributes,
    };
};
exports.default = strapi_1.factories.createCoreController("api::user-route.user-route", ({ strapi }) => ({
    async find(ctx) {
        // Strapi 5: Use db.query directly for better control
        const routes = await strapi.db.query("api::user-route.user-route").findMany({
            where: {
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
            },
            orderBy: { createdAt: "desc" },
        });
        // Return in Strapi 4 format
        return {
            data: routes.map((route) => formatStrapi4Response(route)),
            meta: {
                pagination: {
                    page: 1,
                    pageSize: routes.length,
                    pageCount: 1,
                    total: routes.length,
                },
            },
        };
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
        return { data: formatStrapi4Response(route), meta: {} };
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
        if (!route) {
            ctx.status = 404;
            return { status: 404, message: "Route not found" };
        }
        return { data: formatStrapi4Response(route), meta: {} };
    },
    async create(ctx) {
        var _a, _b, _c, _d;
        if (!((_b = (_a = ctx.request) === null || _a === void 0 ? void 0 : _a.body) === null || _b === void 0 ? void 0 : _b.data)) {
            return {
                status: 400,
                message: "Bad request",
            };
        }
        if (!((_d = (_c = ctx.state) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.id)) {
            logger_1.default.error("user-route create: No user in context");
            return {
                status: 401,
                message: "Unauthorized",
            };
        }
        const requestData = ctx.request.body.data;
        logger_1.default.info("user-route create: Starting with data: " + JSON.stringify(requestData));
        logger_1.default.info("user-route create: Incoming sites: " + JSON.stringify(requestData.sites));
        try {
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
            // Strapi 5 Document Service: For components with relations, use simple IDs
            const cleanedSites = (requestData.sites || []).map((siteItem) => {
                if (siteItem.site) {
                    // Site reference: use simple ID for Document Service
                    const siteId = typeof siteItem.site === 'object' ? siteItem.site.id : siteItem.site;
                    return { site: siteId };
                }
                // Custom site: just keep the custom field
                return { custom: siteItem.custom };
            });
            logger_1.default.info("user-route create: Cleaned sites: " + JSON.stringify(cleanedSites));
            // Ensure owner is just an ID
            const ownerId = typeof ctx.state.user.id === 'object'
                ? ctx.state.user.id.id || ctx.state.user.id
                : ctx.state.user.id;
            logger_1.default.info("user-route create: Owner ID: " + ownerId + " (type: " + typeof ownerId + ")");
            // Use Document Service API for Strapi 5 - handles components with relations properly
            const createData = {
                name: requestData.name,
                public: requestData.public || false,
                mode: requestData.mode,
                polyline: polyline || undefined,
                owner: ownerId,
                sites: cleanedSites,
            };
            logger_1.default.info("user-route create: Create data: " + JSON.stringify(createData));
            const createdRoute = await strapi.documents("api::user-route.user-route").create({
                data: createData,
            });
            if (!polyline) {
                logger_1.default.warn("No polyline generated when creating route:", createdRoute === null || createdRoute === void 0 ? void 0 : createdRoute.documentId);
            }
            logger_1.default.info("user-route create: Success, route id:", createdRoute === null || createdRoute === void 0 ? void 0 : createdRoute.id, "documentId:", createdRoute === null || createdRoute === void 0 ? void 0 : createdRoute.documentId);
            // Fetch the full route with sites populated for the response
            const route = await strapi.db.query("api::user-route.user-route").findOne({
                where: { id: createdRoute.id },
                populate: {
                    image: true,
                    sites: {
                        populate: {
                            site: true,
                        },
                    },
                },
            });
            // Return in Strapi 4 format
            return { data: formatStrapi4Response(route), meta: {} };
        }
        catch (error) {
            logger_1.default.error("user-route create: Error:", error);
            throw error;
        }
    },
    async update(ctx) {
        var _a;
        // First get the existing route to check for changes and get documentId
        const existingRoute = (await strapi.db.query("api::user-route.user-route").findOne({
            where: { id: ctx.params.id },
            select: ["id", "documentId", "polyline", "mode"],
            populate: {
                sites: {
                    populate: {
                        site: { select: ["id"] },
                    },
                },
            },
        }));
        if (!existingRoute) {
            return { status: 404, message: "Route not found" };
        }
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
        // Strapi 5 Document Service: For components with relations, use simple IDs
        const cleanedSites = (requestData.sites || []).map((siteItem) => {
            if (siteItem.site) {
                const siteId = typeof siteItem.site === 'object' ? siteItem.site.id : siteItem.site;
                return { site: siteId };
            }
            return { custom: siteItem.custom };
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
        logger_1.default.info("user-route update: documentId:", existingRoute.documentId, "data:", JSON.stringify(updateData));
        // Use Document Service API for Strapi 5 - handles components with relations properly
        const route = await strapi.documents("api::user-route.user-route").update({
            documentId: existingRoute.documentId,
            data: updateData,
        });
        // Return in Strapi 4 format
        return { data: formatStrapi4Response(route), meta: {} };
    },
    async delete(ctx) {
        // First get the route to verify ownership and get documentId
        const existingRoute = await strapi.db.query("api::user-route.user-route").findOne({
            where: {
                id: ctx.params.id,
                owner: ctx.state.user.id,
            },
            select: ["id", "documentId"],
        });
        if (!existingRoute) {
            ctx.status = 404;
            return { status: 404, message: "Route not found" };
        }
        // Use Document Service to delete
        await strapi.documents("api::user-route.user-route").delete({
            documentId: existingRoute.documentId,
        });
        return { data: { id: existingRoute.id }, meta: {} };
    },
}));
