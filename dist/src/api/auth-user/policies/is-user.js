"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = async (policyContext, config, { strapi }) => {
    // User already verified in firebase-auth middleware - just check it exists
    if (policyContext.state.user && policyContext.state.user.id) {
        // Set the user id in params for controllers to use
        if (!policyContext.params) {
            policyContext.params = {};
        }
        policyContext.params.id = policyContext.state.user.id;
        return true;
    }
    return false;
};
