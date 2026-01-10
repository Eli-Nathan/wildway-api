"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
const slack_1 = require("../../../nomad/slack");
exports.default = strapi_1.factories.createCoreController("api::addition-request.addition-request", ({ strapi }) => ({
    async create(ctx) {
        if (ctx.state.user) {
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
