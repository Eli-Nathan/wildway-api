"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
const slack_1 = require("../../../nomad/slack");
exports.default = strapi_1.factories.createCoreController("api::review.review", ({ strapi }) => ({
    async findBySite(ctx) {
        const { siteId } = ctx.params;
        const { page = 1, pageSize = 5 } = ctx.query;
        const pageNum = parseInt(page, 10);
        const pageSizeNum = parseInt(pageSize, 10);
        const [reviews, total] = await Promise.all([
            strapi.db.query("api::review.review").findMany({
                where: {
                    site: siteId,
                    moderation_status: "complete",
                },
                populate: {
                    owner: {
                        populate: ['profile_pic'],
                    },
                    image: true,
                },
                orderBy: { createdAt: "desc" },
                limit: pageSizeNum,
                offset: (pageNum - 1) * pageSizeNum,
            }),
            strapi.db.query("api::review.review").count({
                where: {
                    site: siteId,
                    moderation_status: "complete",
                },
            }),
        ]);
        // Set body directly to avoid Strapi's response transformation
        // Add status alias for backwards compat (moderation_status is the DB field)
        ctx.body = {
            data: reviews.map((r) => ({ ...r, status: r.moderation_status })),
            meta: {
                pagination: {
                    page: pageNum,
                    pageSize: pageSizeNum,
                    pageCount: Math.ceil(total / pageSizeNum),
                    total,
                },
            },
        };
    },
    // Public endpoint for web SEO - returns limited review data
    async findBySitePublic(ctx) {
        const { siteId } = ctx.params;
        const { limit = 10 } = ctx.query;
        const limitNum = Math.min(parseInt(limit, 10), 20);
        const reviews = await strapi.db.query("api::review.review").findMany({
            where: {
                site: siteId,
                moderation_status: "complete",
            },
            select: ["id", "title", "review", "rating", "createdAt"],
            populate: {
                owner: {
                    select: ["name"],
                },
            },
            orderBy: { createdAt: "desc" },
            limit: limitNum,
        });
        ctx.body = {
            data: reviews.map((r) => {
                var _a;
                return ({
                    id: r.id,
                    title: r.title,
                    review: r.review,
                    rating: r.rating,
                    createdAt: r.createdAt,
                    authorName: ((_a = r.owner) === null || _a === void 0 ? void 0 : _a.name) || "Anonymous",
                });
            }),
        };
    },
    async findByUser(ctx) {
        const { userId } = ctx.params;
        const { page = 1, pageSize = 5 } = ctx.query;
        const pageNum = parseInt(page, 10);
        const pageSizeNum = parseInt(pageSize, 10);
        const [reviews, total] = await Promise.all([
            strapi.db.query("api::review.review").findMany({
                where: {
                    owner: userId,
                    moderation_status: "complete",
                },
                populate: {
                    site: {
                        select: ["id", "title"],
                    },
                    image: true,
                },
                orderBy: { createdAt: "desc" },
                limit: pageSizeNum,
                offset: (pageNum - 1) * pageSizeNum,
            }),
            strapi.db.query("api::review.review").count({
                where: {
                    owner: userId,
                    moderation_status: "complete",
                },
            }),
        ]);
        // Add status alias for backwards compat (moderation_status is the DB field)
        ctx.body = {
            data: reviews.map((r) => ({ ...r, status: r.moderation_status })),
            meta: {
                pagination: {
                    page: pageNum,
                    pageSize: pageSizeNum,
                    pageCount: Math.ceil(total / pageSizeNum),
                    total,
                },
            },
        };
    },
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
                moderation_status: { $ne: "rejected" },
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
        // Return in Strapi 4 format with status alias for backwards compat
        return {
            data: {
                id: review.id,
                attributes: {
                    ...review,
                    status: review.moderation_status, // Alias for old app versions
                },
            },
            meta: {},
        };
    },
}));
