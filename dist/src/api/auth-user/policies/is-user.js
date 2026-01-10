"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = async (policyContext, config, { strapi }) => {
    if (policyContext.state.user &&
        policyContext.state.user.id &&
        policyContext.state.route) {
        const entity = await strapi.db.query(`api::auth-user.auth-user`).findOne({
            where: {
                id: policyContext.state.user.id,
            },
        });
        if (entity && entity.id) {
            if (!policyContext.params) {
                policyContext.params = {};
            }
            policyContext.params.id = entity.id;
            return true;
        }
    }
    return false;
};
