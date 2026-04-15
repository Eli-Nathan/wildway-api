"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Global policy to check if the user is the owner of the entity.
 * In Strapi 5, we prefer injecting filters to handle both list and detail views securely.
 */
const isOwner = async (policyContext, _config, { strapi }) => {
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
    // Force owner filter
    policyContext.query.filters.owner = { id: { $eq: user.id } };
    return true;
};
exports.default = isOwner;
