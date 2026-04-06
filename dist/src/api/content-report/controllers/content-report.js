"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
const slack_1 = require("../../../wildway/slack");
exports.default = strapi_1.factories.createCoreController("api::content-report.content-report", ({ strapi }) => ({
    async create(ctx) {
        var _a, _b;
        const requestData = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || {};
        // Validate required fields
        if (!requestData.category) {
            return ctx.badRequest("Category is required");
        }
        if (!requestData.description) {
            return ctx.badRequest("Description is required");
        }
        if (!requestData.contentType) {
            return ctx.badRequest("Content type is required");
        }
        if (!requestData.contentId) {
            return ctx.badRequest("Content ID is required");
        }
        // Validate word count (max 200 words)
        const description = requestData.description || "";
        const wordCount = description.trim().split(/\s+/).filter((w) => w.length > 0).length;
        if (wordCount > 200) {
            return ctx.badRequest("Description exceeds 200 word limit");
        }
        // Create the content report
        const report = await strapi.db.query("api::content-report.content-report").create({
            data: {
                category: requestData.category,
                description: requestData.description,
                contentType: requestData.contentType,
                contentId: requestData.contentId,
                contentTitle: requestData.contentTitle,
                reporter: (_b = ctx.state.user) === null || _b === void 0 ? void 0 : _b.id,
                moderation_status: "submitted",
            },
        });
        // Send Slack notification
        await (0, slack_1.sendEntryToSlack)({ data: report }, "contentReport", ctx);
        // Return in Strapi 4 format for backwards compatibility
        return {
            data: {
                id: report.id,
                attributes: report,
            },
            meta: {},
        };
    },
}));
