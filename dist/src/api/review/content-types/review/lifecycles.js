"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emails_1 = require("../../../../wildway/emails");
const notifications_1 = require("../../../../wildway/notifications");
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
async function notifySiteOwnersOfNewReview(reviewId) {
    var _a, _b, _c;
    try {
        // Fetch the review with site, site owners, and reviewer info
        const review = await strapi.db.query("api::review.review").findOne({
            where: { id: reviewId },
            populate: {
                site: {
                    select: ["id", "title", "slug"],
                    populate: {
                        owners: {
                            select: ["id", "email", "name"],
                        },
                    },
                },
                owner: {
                    select: ["id", "name"],
                },
            },
        });
        if (!((_b = (_a = review === null || review === void 0 ? void 0 : review.site) === null || _a === void 0 ? void 0 : _a.owners) === null || _b === void 0 ? void 0 : _b.length)) {
            strapi.log.info(`No owners to notify for review ${reviewId}`);
            return;
        }
        const emailData = {
            reviewerName: ((_c = review.owner) === null || _c === void 0 ? void 0 : _c.name) || "A user",
            rating: review.rating,
            title: review.title,
            review: review.review || undefined,
            siteTitle: review.site.title,
            siteSlug: review.site.slug,
        };
        const emailContent = (0, emails_1.getNewReviewMailContent)(emailData);
        // Send notification to each owner using notification service
        for (const owner of review.site.owners) {
            await (0, notifications_1.createNotification)(strapi, {
                recipientId: owner.id,
                type: "new_review",
                title: "New review on your listing",
                message: `${emailData.reviewerName} left a ${emailData.rating}-star review on ${emailData.siteTitle}`,
                relatedEntityType: "review",
                relatedEntityId: reviewId,
                metadata: {
                    rating: emailData.rating,
                    reviewerName: emailData.reviewerName,
                    siteId: review.site.id,
                },
                emailContent: owner.email
                    ? {
                        subject: emailContent.subject,
                        text: emailContent.text,
                        html: emailContent.html,
                    }
                    : undefined,
            });
        }
    }
    catch (err) {
        strapi.log.error(`Failed to notify site owners of review ${reviewId}:`, err);
    }
}
async function notifyReviewOwnerOfReply(reviewId, replyText) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const review = await strapi.db.query("api::review.review").findOne({
            where: { id: reviewId },
            populate: {
                owner: {
                    select: ["id", "email", "name"],
                },
                site: {
                    select: ["id", "title", "slug"],
                },
            },
        });
        if (!((_a = review === null || review === void 0 ? void 0 : review.owner) === null || _a === void 0 ? void 0 : _a.id)) {
            strapi.log.info(`No owner to notify for review reply ${reviewId}`);
            return;
        }
        // Create a simple email content for reply notification
        const emailContent = {
            subject: `Business replied to your review of ${(_b = review.site) === null || _b === void 0 ? void 0 : _b.title}`,
            text: `The owner of ${(_c = review.site) === null || _c === void 0 ? void 0 : _c.title} replied to your review:\n\n"${replyText}"`,
            html: `
        <p>The owner of <strong>${(_d = review.site) === null || _d === void 0 ? void 0 : _d.title}</strong> replied to your review:</p>
        <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0;">
          ${replyText}
        </blockquote>
        <p>
          <a href="https://wildway.app/places/${(_e = review.site) === null || _e === void 0 ? void 0 : _e.slug}">View on Wildway</a>
        </p>
      `,
        };
        await (0, notifications_1.createNotification)(strapi, {
            recipientId: review.owner.id,
            type: "review_reply",
            title: "Business replied to your review",
            message: `The owner of ${(_f = review.site) === null || _f === void 0 ? void 0 : _f.title} replied: "${replyText.substring(0, 100)}${replyText.length > 100 ? "..." : ""}"`,
            relatedEntityType: "review",
            relatedEntityId: reviewId,
            metadata: {
                siteId: (_g = review.site) === null || _g === void 0 ? void 0 : _g.id,
                siteTitle: (_h = review.site) === null || _h === void 0 ? void 0 : _h.title,
                replyPreview: replyText.substring(0, 200),
            },
            emailContent: review.owner.email ? emailContent : undefined,
        });
    }
    catch (err) {
        strapi.log.error(`Failed to notify review owner of reply ${reviewId}:`, err);
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
        var _a, _b, _c;
        const { result, params } = event;
        const siteId = await getSiteIdFromResult(result, result.id);
        if (siteId) {
            await updateSiteReviewStats(siteId);
        }
        // Check if review was just approved (moderation_status changed to "complete")
        const newStatus = result.moderation_status;
        const wasJustApproved = newStatus === "complete" && ((_a = params === null || params === void 0 ? void 0 : params.data) === null || _a === void 0 ? void 0 : _a.moderation_status) === "complete";
        if (wasJustApproved) {
            // Don't block the response - send notification asynchronously
            notifySiteOwnersOfNewReview(result.id).catch((err) => {
                strapi.log.error(`Error in async review notification:`, err);
            });
        }
        // Check if owner reply was just added
        const replyJustAdded = ((_b = params === null || params === void 0 ? void 0 : params.data) === null || _b === void 0 ? void 0 : _b.owner_reply) && ((_c = params === null || params === void 0 ? void 0 : params.data) === null || _c === void 0 ? void 0 : _c.owner_reply_at);
        if (replyJustAdded) {
            // Don't block the response - send notification asynchronously
            notifyReviewOwnerOfReply(result.id, params.data.owner_reply).catch((err) => {
                strapi.log.error(`Error in async reply notification:`, err);
            });
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
