async function updateSiteReviewStats(siteId: number) {
  if (!siteId) return;

  const reviews = await strapi.db.query("api::review.review").findMany({
    where: {
      site: siteId,
      moderation_status: "complete",
    },
    select: ["rating"],
  });

  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewCount
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
    const moderatorService = strapi.plugin("moderator")?.service("moderator");
    if (moderatorService?.updateSitePriority) {
      await moderatorService.updateSitePriority(siteId);
    }
  } catch (err) {
    // Don't fail if moderator plugin isn't available
    strapi.log.warn(`Could not update site priority: ${err}`);
  }
}

// Helper to get site ID from result - handles both direct ID and object formats
async function getSiteIdFromResult(result: any, reviewId?: number): Promise<number | null> {
  // Direct ID
  if (typeof result.site === "number") {
    return result.site;
  }
  // Object with ID
  if (result.site?.id) {
    return result.site.id;
  }
  // If site not in result, fetch it from the review
  if (reviewId) {
    const review = await strapi.db.query("api::review.review").findOne({
      where: { id: reviewId },
      populate: { site: { select: ["id"] } },
    });
    return review?.site?.id || null;
  }
  return null;
}

export default {
  async afterCreate(event: any) {
    const { result } = event;
    const siteId = await getSiteIdFromResult(result, result.id);
    if (siteId) {
      await updateSiteReviewStats(siteId);
    }
  },

  async afterUpdate(event: any) {
    const { result } = event;
    const siteId = await getSiteIdFromResult(result, result.id);
    if (siteId) {
      await updateSiteReviewStats(siteId);
    }
  },

  async afterDelete(event: any) {
    const { result } = event;
    const siteId = await getSiteIdFromResult(result, result.id);
    if (siteId) {
      await updateSiteReviewStats(siteId);
    }
  },
};
