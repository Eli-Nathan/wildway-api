"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
const slack_1 = require("../../../nomad/slack");
exports.default = strapi_1.factories.createCoreController("api::review.review", ({ strapi }) => ({
    async create(ctx) {
        var _a, _b, _c;
        const requestData = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || {};
        const userId = ((_b = ctx.state.user) === null || _b === void 0 ? void 0 : _b.id) || requestData.owner;
        const siteId = requestData.site;
        // Validate rating is between 1 and 5
        if (!requestData.rating || requestData.rating < 1 || requestData.rating > 5) {
            ctx.status = 400;
            ctx.body = {
                error: "Rating must be between 1 and 5",
            };
            return;
        }
        // Check for existing review by this user for this site (unique constraint)
        const existingReview = await strapi.db.query("api::review.review").findOne({
            where: {
                owner: userId,
                site: siteId,
                status: { $ne: "rejected" },
            },
        });
        if (existingReview) {
            ctx.status = 409;
            ctx.body = {
                error: "You have already reviewed this site. You can delete your existing review and create a new one.",
            };
            return;
        }
        // Create the review
        const review = await strapi.db.query("api::review.review").create({
            data: {
                title: requestData.title,
                review: requestData.review,
                rating: requestData.rating,
                site: siteId,
                owner: userId,
                image: ((_c = requestData.image) === null || _c === void 0 ? void 0 : _c[0]) || null,
            },
        });
        await (0, slack_1.sendEntryToSlack)({ data: review }, "review", ctx);
        // Return in Strapi 4 format
        return {
            data: {
                id: review.id,
                attributes: review,
            },
            meta: {},
        };
    },
}));
