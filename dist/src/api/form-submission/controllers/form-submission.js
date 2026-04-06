"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
const slack_1 = require("../../../wildway/slack");
exports.default = strapi_1.factories.createCoreController("api::form-submission.form-submission", ({ strapi }) => ({
    async create(ctx) {
        const requestBody = JSON.parse(ctx.request.body);
        if (ctx.params.id && requestBody.data) {
            // Strapi 5: Use db.query directly (accepts simple IDs for relations)
            const submission = await strapi.db.query("api::form-submission.form-submission").create({
                data: {
                    data: requestBody.data,
                    form: ctx.params.id,
                },
            });
            const result = {
                data: {
                    id: submission.id,
                    attributes: submission,
                },
                meta: {},
            };
            await (0, slack_1.sendEntryToSlack)(result, "form", ctx);
            return result;
        }
        ctx.status = 400;
        return {
            status: 400,
            message: "No data received",
        };
    },
}));
