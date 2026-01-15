"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
const slack_1 = require("../../../nomad/slack");
/**
 * Strapi 5: Clean request data for db.query compatibility
 * - Remove fields not in schema (location)
 * - Keep relations as simple IDs (db.query accepts this format)
 */
const cleanRequestData = (data) => {
    const cleaned = { ...data };
    // Remove location (not in schema - frontend sends it but we only need lat/lng)
    delete cleaned.location;
    // Remove addingBusiness flag (not in schema, only used for logic)
    delete cleaned.addingBusiness;
    return cleaned;
};
exports.default = strapi_1.factories.createCoreController("api::addition-request.addition-request", ({ strapi }) => ({
    async create(ctx) {
        if (ctx.state.user) {
            const requestData = ctx.request.body.data;
            if (requestData.addingBusiness &&
                ctx.state.user.role &&
                ctx.state.user.role.level > 0 &&
                (ctx.state.user.siteCount || 0) < (ctx.state.user.maxSites || 0)) {
                const cleanedData = cleanRequestData(requestData);
                const newSite = await strapi.db.query(`api::site.site`).create({
                    data: {
                        ...cleanedData,
                        owners: [ctx.state.user.id],
                    },
                });
                return {
                    data: {
                        attributes: {
                            // @ts-expect-error - Strapi core controller method
                            site: await this.sanitizeOutput(newSite, ctx),
                            ownerUpdated: true,
                        },
                    },
                };
            }
            else {
                // Strapi 5: Use db.query directly (accepts simple IDs for relations)
                const cleanedData = cleanRequestData(requestData);
                const addition = await strapi.db.query("api::addition-request.addition-request").create({
                    data: {
                        ...cleanedData,
                        owner: ctx.state.user.id,
                    },
                });
                await (0, slack_1.sendEntryToSlack)({ data: addition }, "additionRequest", ctx);
                // Return in Strapi 4 format
                return {
                    data: {
                        id: addition.id,
                        attributes: addition,
                    },
                    meta: {},
                };
            }
        }
    },
}));
