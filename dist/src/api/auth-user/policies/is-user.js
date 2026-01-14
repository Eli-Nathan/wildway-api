"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = async (policyContext, config, { strapi }) => {
    strapi.log.info("is-user policy: state.user =", JSON.stringify(policyContext.state.user));
    // Check if user exists in state (set by firebase-auth middleware)
    if (policyContext.state.user && policyContext.state.user.id) {
        strapi.log.info("is-user policy: User has DB id:", policyContext.state.user.id);
        // Verify user exists in DB
        const entity = await strapi.db.query(`api::auth-user.auth-user`).findOne({
            where: {
                id: policyContext.state.user.id,
            },
        });
        if (entity && entity.id) {
            strapi.log.info("is-user policy: User verified in DB");
            if (!policyContext.params) {
                policyContext.params = {};
            }
            policyContext.params.id = entity.id;
            return true;
        }
        strapi.log.warn("is-user policy: User not found in DB");
    }
    strapi.log.info("is-user policy: Returning false - no valid user");
    return false;
};
