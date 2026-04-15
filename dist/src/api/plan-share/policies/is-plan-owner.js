"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Policy to check if the user is the OWNER of the trip plan related to the resource.
 * Used for plan-share (only owner can share) and plan-checkin management.
 */
const isPlanOwner = async (policyContext, _config, { strapi }) => {
    const user = policyContext.state.user;
    if (!user || !user.id) {
        return false;
    }
    // Ensure query and filters objects exist
    if (!policyContext.query) {
        policyContext.query = {};
    }
    if (!policyContext.query.filters) {
        policyContext.query.filters = {};
    }
    // Force owner filter on the related tripPlan
    policyContext.query.filters.tripPlan = {
        owner: { id: { $eq: user.id } }
    };
    return true;
};
exports.default = isPlanOwner;
