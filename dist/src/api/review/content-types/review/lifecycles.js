"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function updateSiteReviewStats(siteId) {
    var _a;
    if (!siteId)
        return;
    const reviews = await strapi.db.query("api::review.review").findMany({
        where: {
            site: siteId,
            moderation_status: "complete",
        },
        select: ["rating"],
    });
    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : null;
    await strapi.db.query("api::site.site").update({
        where: { id: siteId },
        data: {
            reviewCount,
            averageRating,
        },
    });
    // Recalculate site priority (reviews affect priority scoring)
    try {
        const moderatorService = (_a = strapi.plugin("moderator")) === null || _a === void 0 ? void 0 : _a.service("moderator");
        if (moderatorService === null || moderatorService === void 0 ? void 0 : moderatorService.updateSitePriority) {
            await moderatorService.updateSitePriority(siteId);
        }
    }
    catch (err) {
        // Don't fail if moderator plugin isn't available
        strapi.log.warn(`Could not update site priority: ${err}`);
    }
}
// Helper to get site ID from result - handles both direct ID and object formats
async function getSiteIdFromResult(result, reviewId) {
    var _a, _b;
    // Direct ID
    if (typeof result.site === "number") {
        return result.site;
    }
    // Object with ID
    if ((_a = result.site) === null || _a === void 0 ? void 0 : _a.id) {
        return result.site.id;
    }
    // If site not in result, fetch it from the review
    if (reviewId) {
        const review = await strapi.db.query("api::review.review").findOne({
            where: { id: reviewId },
            populate: { site: { select: ["id"] } },
        });
        return ((_b = review === null || review === void 0 ? void 0 : review.site) === null || _b === void 0 ? void 0 : _b.id) || null;
    }
    return null;
}
exports.default = {
    async afterCreate(event) {
        const { result } = event;
        const siteId = await getSiteIdFromResult(result, result.id);
        if (siteId) {
            await updateSiteReviewStats(siteId);
        }
    },
    async afterUpdate(event) {
        const { result } = event;
        const siteId = await getSiteIdFromResult(result, result.id);
        if (siteId) {
            await updateSiteReviewStats(siteId);
        }
    },
    async afterDelete(event) {
        const { result } = event;
        const siteId = await getSiteIdFromResult(result, result.id);
        if (siteId) {
            await updateSiteReviewStats(siteId);
        }
    },
};
