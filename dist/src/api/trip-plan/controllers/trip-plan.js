"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
const populateConfig = {
    stops: {
        populate: {
            site: {
                populate: {
                    type: true,
                    images: true,
                },
            },
        },
    },
    owner: true,
    shares: {
        populate: {
            sharedWith: true,
        },
    },
    checkins: true,
};
exports.default = strapi_1.factories.createCoreController("api::trip-plan.trip-plan", ({ strapi }) => ({
    async find(ctx) {
        const currentUser = ctx.state.user;
        const plans = await strapi.db
            .query("api::trip-plan.trip-plan")
            .findMany({
            where: { owner: { id: currentUser.id } },
            populate: populateConfig,
            orderBy: { createdAt: "desc" },
        });
        return {
            data: plans.map((plan) => ({
                id: plan.id,
                attributes: plan,
            })),
            meta: {},
        };
    },
    async sharedWithMe(ctx) {
        const currentUser = ctx.state.user;
        // Find all accepted shares for the current user
        const shares = await strapi.db
            .query("api::plan-share.plan-share")
            .findMany({
            where: {
                sharedWith: { id: currentUser.id },
                status: "accepted",
            },
            populate: {
                tripPlan: {
                    populate: {
                        stops: { populate: { site: true } },
                        owner: true,
                    },
                },
            },
        });
        const plans = shares
            .map((share) => share.tripPlan)
            .filter(Boolean);
        return {
            data: plans.map((plan) => ({
                id: plan.id,
                attributes: plan,
            })),
            meta: {},
        };
    },
    async create(ctx) {
        var _a, _b, _c, _d, _e, _f;
        const requestData = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || {};
        const ownerId = typeof requestData.owner === "object"
            ? (_b = requestData.owner) === null || _b === void 0 ? void 0 : _b.id
            : ((_c = requestData.owner) !== null && _c !== void 0 ? _c : (_d = ctx.state.user) === null || _d === void 0 ? void 0 : _d.id);
        const stops = (requestData.stops || []).map((stop) => {
            var _a;
            return ({
                site: typeof stop.site === "object" && stop.site !== null
                    ? stop.site.id
                    : ((_a = stop.site) !== null && _a !== void 0 ? _a : null),
                customLocation: stop.customLocation || null,
                dayNumber: stop.dayNumber || null,
                plannedArrival: stop.plannedArrival || null,
                plannedDeparture: stop.plannedDeparture || null,
                notes: stop.notes || null,
            });
        });
        const plan = await strapi.documents("api::trip-plan.trip-plan").create({
            data: {
                name: requestData.name,
                description: requestData.description || null,
                timingMode: requestData.timingMode || "flexible",
                status: requestData.status || "draft",
                startDate: requestData.startDate || null,
                endDate: requestData.endDate || null,
                shareCode: requestData.shareCode || null,
                overdueAlertsEnabled: (_e = requestData.overdueAlertsEnabled) !== null && _e !== void 0 ? _e : false,
                autoCheckinEnabled: (_f = requestData.autoCheckinEnabled) !== null && _f !== void 0 ? _f : false,
                owner: ownerId,
                stops,
            },
            populate: populateConfig,
        });
        return {
            data: {
                id: plan.id,
                documentId: plan.documentId,
                attributes: plan,
            },
            meta: {},
        };
    },
    async findOne(ctx) {
        const { id } = ctx.params;
        // Check if ID is numeric
        const isNumeric = /^\d+$/.test(id);
        let entity;
        if (isNumeric) {
            // If numeric, look up using db.query to get the record and its documentId
            entity = await strapi.db.query("api::trip-plan.trip-plan").findOne({
                where: { id },
                populate: populateConfig,
            });
        }
        else {
            // If not numeric, use standard document service (expects documentId)
            entity = await strapi.documents("api::trip-plan.trip-plan").findOne({
                documentId: id,
                populate: populateConfig,
            });
        }
        if (!entity) {
            return ctx.notFound();
        }
        return {
            data: {
                id: entity.id,
                documentId: entity.documentId,
                attributes: entity,
            },
            meta: {},
        };
    },
    async update(ctx) {
        var _a;
        const requestData = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || {};
        // In Strapi 5, we can update by documentId OR id using the documents service
        // But we first need to find the entity to get its documentId if an ID was passed
        const existing = await strapi.db
            .query("api::trip-plan.trip-plan")
            .findOne({
            where: { id: ctx.params.id },
        });
        if (!existing) {
            ctx.status = 404;
            return { status: 404, message: "Plan not found" };
        }
        const updated = await strapi.documents("api::trip-plan.trip-plan").update({
            documentId: existing.documentId,
            data: {
                ...requestData,
                ...(requestData.stops && {
                    stops: requestData.stops.map((stop) => {
                        var _a;
                        return ({
                            site: typeof stop.site === "object" && stop.site !== null
                                ? stop.site.id
                                : ((_a = stop.site) !== null && _a !== void 0 ? _a : null),
                            customLocation: stop.customLocation || null,
                            dayNumber: stop.dayNumber || null,
                            plannedArrival: stop.plannedArrival || null,
                            plannedDeparture: stop.plannedDeparture || null,
                            notes: stop.notes || null,
                        });
                    }),
                }),
            },
            populate: populateConfig,
        });
        return {
            data: {
                id: updated.id,
                documentId: updated.documentId,
                attributes: updated,
            },
            meta: {},
        };
    },
    async delete(ctx) {
        var _a, _b;
        const { id } = ctx.params;
        // Look up by numeric ID to get documentId
        const existing = await strapi.db
            .query("api::trip-plan.trip-plan")
            .findOne({
            where: { id },
            populate: ["owner"],
        });
        if (!existing) {
            ctx.status = 404;
            return { error: "Plan not found" };
        }
        // Check ownership
        if (((_a = existing.owner) === null || _a === void 0 ? void 0 : _a.id) !== ((_b = ctx.state.user) === null || _b === void 0 ? void 0 : _b.id)) {
            ctx.status = 403;
            return { error: "Not your plan" };
        }
        await strapi.documents("api::trip-plan.trip-plan").delete({
            documentId: existing.documentId,
        });
        return { data: { id: existing.id } };
    },
}));
