"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
const slack_1 = require("../../../nomad/slack");
exports.default = strapi_1.factories.createCoreController("api::comment.comment", ({ strapi }) => ({
    async create(ctx) {
        var _a, _b;
        const requestData = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || {};
        // Strapi 5: Use db.query directly (accepts simple IDs for relations)
        const comment = await strapi.db.query("api::comment.comment").create({
            data: {
                title: requestData.title,
                comment: requestData.comment,
                site: requestData.site,
                owner: ((_b = ctx.state.user) === null || _b === void 0 ? void 0 : _b.id) || requestData.owner,
            },
        });
        await (0, slack_1.sendEntryToSlack)({ data: comment }, "comment", ctx);
        // Return in Strapi 4 format
        return {
            data: {
                id: comment.id,
                attributes: comment,
            },
            meta: {},
        };
    },
}));
