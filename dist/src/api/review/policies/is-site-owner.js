"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Policy to check if the authenticated user owns the site that a review belongs to
 * AND has the required feature enabled in their role.
 * Used for business owner reply functionality.
 *
 * On success, stores the review in ctx.state.review for use by controllers,
 * avoiding duplicate database queries.
 */
const isSiteOwner = async (policyContext, _config, { strapi }) => {
    var _a;
    if (!policyContext.state.user) {
        return false;
    }
    const { id: reviewId } = policyContext.params;
    if (!reviewId) {
        return false;
    }
    // Get the user's role with features
    const user = await strapi.db.query("api::auth-user.auth-user").findOne({
        where: { id: policyContext.state.user.id },
        populate: {
            role: {
                select: ["id", "features"],
            },
        },
    });
    // Check if user's role has the reply_to_reviews feature
    const features = ((_a = user === null || user === void 0 ? void 0 : user.role) === null || _a === void 0 ? void 0 : _a.features) || {};
    if (!features.reply_to_reviews) {
        strapi.log.info(`User ${policyContext.state.user.id} denied reply - role missing reply_to_reviews feature`);
        return false;
    }
    // Get the review with its site and site owners
    const review = await strapi.db.query("api::review.review").findOne({
        where: { id: reviewId },
        populate: {
            site: {
                populate: {
                    owners: {
                        select: ["id"],
                    },
                },
            },
        },
    });
    if (!review || !review.site) {
        return false;
    }
    // Check if the authenticated user is one of the site owners
    const ownerIds = (review.site.owners || []).map((owner) => owner.id);
    const isOwner = ownerIds.includes(policyContext.state.user.id);
    // Store review in state for controller use (avoids duplicate query)
    if (isOwner) {
        policyContext.state.review = review;
    }
    return isOwner;
};
exports.default = isSiteOwner;
