"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Policy to check if the user is the OWNER of the trip plan related to the resource.
 * Used for plan-share (only owner can share) and plan-checkin management.
 */
const isPlanOwner = async (policyContext, _config, { strapi }) => {
    var _a, _b, _c;
    const user = policyContext.state.user;
    if (!user || !user.id) {
        return false;
    }
    const { id } = policyContext.params;
    const apiName = policyContext.state.route.info.apiName;
    // 1. If we are looking for a specific entity by ID (findOne, update, delete)
    if (id) {
        let tripPlanId = null;
        if (apiName === 'trip-plan') {
            tripPlanId = id;
        }
        else if (apiName === 'plan-share') {
            const share = await strapi.db.query('api::plan-share.plan-share').findOne({
                where: { id },
                populate: ['tripPlan']
            });
            tripPlanId = (_a = share === null || share === void 0 ? void 0 : share.tripPlan) === null || _a === void 0 ? void 0 : _a.id;
        }
        else if (apiName === 'plan-checkin') {
            const checkin = await strapi.db.query('api::plan-checkin.plan-checkin').findOne({
                where: { id },
                populate: ['tripPlan']
            });
            tripPlanId = (_b = checkin === null || checkin === void 0 ? void 0 : checkin.tripPlan) === null || _b === void 0 ? void 0 : _b.id;
        }
        if (!tripPlanId)
            return false;
        // Check if user is owner of the trip plan
        const plan = await strapi.db.query('api::trip-plan.trip-plan').findOne({
            where: {
                id: tripPlanId,
                owner: { id: user.id }
            }
        });
        return !!plan;
    }
    // 2. If we are creating (POST)
    if (policyContext.request.method === 'POST') {
        const data = (_c = policyContext.request.body) === null || _c === void 0 ? void 0 : _c.data;
        const tripPlanId = data === null || data === void 0 ? void 0 : data.tripPlan;
        if (!tripPlanId)
            return false;
        const plan = await strapi.db.query('api::trip-plan.trip-plan').findOne({
            where: {
                id: tripPlanId,
                owner: { id: user.id }
            }
        });
        return !!plan;
    }
    // 3. If we are listing (find), inject filters
    if (!policyContext.query) {
        policyContext.query = {};
    }
    if (!policyContext.query.filters) {
        policyContext.query.filters = {};
    }
    policyContext.query.filters.tripPlan = {
        owner: { id: { $eq: user.id } }
    };
    return true;
};
exports.default = isPlanOwner;
