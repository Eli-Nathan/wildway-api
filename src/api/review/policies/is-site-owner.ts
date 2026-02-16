import type { PolicyContext, StrapiInstance } from "../../../types/strapi";

/**
 * Policy to check if the authenticated user owns the site that a review belongs to.
 * Used for business owner reply functionality.
 *
 * On success, stores the review in ctx.state.review for use by controllers,
 * avoiding duplicate database queries.
 */
const isSiteOwner = async (
  policyContext: PolicyContext,
  _config: Record<string, unknown>,
  { strapi }: { strapi: StrapiInstance }
): Promise<boolean> => {
  if (!policyContext.state.user) {
    return false;
  }

  const { id: reviewId } = policyContext.params;

  if (!reviewId) {
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
  const ownerIds = (review.site.owners || []).map((owner: { id: number }) => owner.id);
  const isOwner = ownerIds.includes(policyContext.state.user.id);

  // Store review in state for controller use (avoids duplicate query)
  if (isOwner) {
    policyContext.state.review = review;
  }

  return isOwner;
};

export default isSiteOwner;
