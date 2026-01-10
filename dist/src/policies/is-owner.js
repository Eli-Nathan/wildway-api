"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const isOwner = async (policyContext, _config, { strapi }) => {
    if (policyContext.state.user) {
        if (policyContext.state.route) {
            const apiName = policyContext.state.route.info.apiName;
            const controllerName = policyContext.state.route.handler.split(".")[0];
            const { id } = policyContext.params;
            const idQuery = id ? { id: { $eq: id } } : {};
            const entity = await strapi.db
                .query(`api::${apiName}.${controllerName}`)
                .findMany({
                where: {
                    ...idQuery,
                    owner: policyContext.state.user.id,
                },
            });
            if (!policyContext.query) {
                policyContext.query = {};
            }
            if (!policyContext.query.filters) {
                policyContext.query.filters = {};
            }
            policyContext.query.filters.owner = policyContext.state.user.id;
            if (entity && entity.length > 0) {
                return true;
            }
        }
        return true;
    }
    return false;
};
exports.default = isOwner;
