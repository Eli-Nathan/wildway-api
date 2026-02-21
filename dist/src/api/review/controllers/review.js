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
                select: ["id", "title", "review", "rating", "createdAt", "moderation_status", "owner_reply", "owner_reply_at"],
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
    // Public endpoint for web SEO - returns review data with minimal author info
    async findBySitePublic(ctx) {
        const { siteId } = ctx.params;
        const { limit = 10 } = ctx.query;
        const limitNum = Math.min(parseInt(limit, 10), 20);
        const reviews = await strapi.db.query("api::review.review").findMany({
            where: {
                site: siteId,
                moderation_status: "complete",
            },
            select: ["id", "title", "review", "rating", "createdAt", "owner_reply", "owner_reply_at"],
            populate: {
                owner: {
                    select: ["id", "name", "avatar"],
                    populate: {
                        profile_pic: {
                            select: ["url"],
                        },
                    },
                },
                image: {
                    select: ["url"],
                },
            },
            orderBy: { createdAt: "desc" },
            limit: limitNum,
        });
        ctx.body = {
            data: reviews.map((r) => {
                var _a, _b, _c, _d, _e, _f;
                return ({
                    id: r.id,
                    title: r.title,
                    review: r.review,
                    rating: r.rating,
                    createdAt: r.createdAt,
                    author: {
                        id: (_a = r.owner) === null || _a === void 0 ? void 0 : _a.id,
                        name: ((_b = r.owner) === null || _b === void 0 ? void 0 : _b.name) || "Anonymous",
                        avatar: ((_d = (_c = r.owner) === null || _c === void 0 ? void 0 : _c.profile_pic) === null || _d === void 0 ? void 0 : _d.url) || ((_e = r.owner) === null || _e === void 0 ? void 0 : _e.avatar) || null,
                    },
                    image: ((_f = r.image) === null || _f === void 0 ? void 0 : _f.url) ? { url: r.image.url } : null,
                    owner_reply: r.owner_reply || null,
                    owner_reply_at: r.owner_reply_at || null,
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
    /**
     * Add or update a business owner's reply to a review.
     * Only site owners can reply (enforced by is-site-owner policy).
     * The policy stores the review in ctx.state.review to avoid duplicate queries.
     */
    async addReply(ctx) {
        var _a;
        const { id: reviewId } = ctx.params;
        const requestData = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || {};
        const { owner_reply } = requestData;
        const MAX_REPLY_LENGTH = 2000;
        if (!owner_reply || typeof owner_reply !== "string" || owner_reply.trim().length === 0) {
            ctx.status = 400;
            ctx.body = {
                error: "Reply text is required",
            };
            return;
        }
        if (owner_reply.trim().length > MAX_REPLY_LENGTH) {
            ctx.status = 400;
            ctx.body = {
                error: `Reply must be ${MAX_REPLY_LENGTH} characters or less`,
            };
            return;
        }
        // Use the review from policy (stored in ctx.state.review)
        const existingReview = ctx.state.review;
        if (!existingReview) {
            ctx.status = 404;
            ctx.body = {
                error: "Review not found",
            };
            return;
        }
        if (existingReview.moderation_status !== "complete") {
            ctx.status = 400;
            ctx.body = {
                error: "Can only reply to approved reviews",
            };
            return;
        }
        // Update the review with the reply
        const updated = await strapi.db.query("api::review.review").update({
            where: { id: reviewId },
            data: {
                owner_reply: owner_reply.trim(),
                owner_reply_at: new Date().toISOString(),
            },
        });
        ctx.body = {
            data: {
                id: updated.id,
                owner_reply: updated.owner_reply,
                owner_reply_at: updated.owner_reply_at,
            },
        };
    },
    /**
     * Delete a business owner's reply from a review.
     * Only site owners can delete (enforced by is-site-owner policy).
     * The policy stores the review in ctx.state.review to avoid duplicate queries.
     */
    async deleteReply(ctx) {
        const { id: reviewId } = ctx.params;
        // Use the review from policy (stored in ctx.state.review)
        const existingReview = ctx.state.review;
        if (!existingReview) {
            ctx.status = 404;
            ctx.body = {
                error: "Review not found",
            };
            return;
        }
        if (!existingReview.owner_reply) {
            ctx.status = 400;
            ctx.body = {
                error: "No reply to delete",
            };
            return;
        }
        // Clear the reply fields
        await strapi.db.query("api::review.review").update({
            where: { id: reviewId },
            data: {
                owner_reply: null,
                owner_reply_at: null,
            },
        });
        ctx.body = {
            data: {
                id: reviewId,
                message: "Reply deleted successfully",
            },
        };
    },
}));
