"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
const slack_1 = require("../../../nomad/slack");
exports.default = strapi_1.factories.createCoreController("api::comment.comment", ({ strapi }) => ({
    async create(ctx) {
        // @ts-expect-error - Strapi core controller method
        const comment = await super.create(ctx);
        await (0, slack_1.sendEntryToSlack)(comment, "comment", ctx);
        // @ts-expect-error - Strapi core controller method
        return this.sanitizeOutput(comment, ctx);
    },
}));
