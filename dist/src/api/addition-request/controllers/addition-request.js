"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
const slack_1 = require("../../../nomad/slack");
/**
 * Strapi 5: Transform request data for compatibility
 * - Remove fields not in schema (location)
 * - Transform relations to connect syntax
 */
const transformRequestData = (data) => {
    const transformed = { ...data };
    // Remove location (not in schema - frontend sends it but we only need lat/lng)
    delete transformed.location;
    // Transform single relation: type
    if (typeof transformed.type === "number") {
        transformed.type = { connect: [{ id: transformed.type }] };
    }
    // Transform array relations: facilities, sub_types, potential_duplicates
    if (Array.isArray(transformed.facilities)) {
        transformed.facilities = {
            connect: transformed.facilities.map((id) => ({ id })),
        };
    }
    if (Array.isArray(transformed.sub_types)) {
        transformed.sub_types = {
            connect: transformed.sub_types.map((id) => ({ id })),
        };
    }
    if (Array.isArray(transformed.potential_duplicates)) {
        transformed.potential_duplicates = {
            connect: transformed.potential_duplicates.map((id) => ({ id })),
        };
    }
    return transformed;
};
exports.default = strapi_1.factories.createCoreController("api::addition-request.addition-request", ({ strapi }) => ({
    async create(ctx) {
        if (ctx.state.user) {
            // Strapi 5: Transform request data
            ctx.request.body.data = transformRequestData(ctx.request.body.data);
            if (ctx.request.body.data.addingBusiness &&
                ctx.state.user.role &&
                ctx.state.user.role.level > 0 &&
                (ctx.state.user.siteCount || 0) < (ctx.state.user.maxSites || 0)) {
                const newSite = await strapi.db.query(`api::site.site`).create({
                    data: {
                        ...ctx.request.body.data,
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
                // @ts-expect-error - Strapi core controller method
                const addition = await super.create(ctx);
                await (0, slack_1.sendEntryToSlack)(addition, "additionRequest", ctx);
                // @ts-expect-error - Strapi core controller method
                return this.sanitizeOutput(addition, ctx);
            }
        }
    },
}));
