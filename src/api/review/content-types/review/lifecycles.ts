async function updateSiteReviewStats(siteId: number) {
  if (!siteId) return;

  const reviews = await strapi.db.query("api::review.review").findMany({
    where: {
      site: siteId,
      status: "complete",
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
}

export default {
  async afterCreate(event: any) {
    const { result } = event;
    if (result.site) {
      await updateSiteReviewStats(result.site);
    }
  },

  async afterUpdate(event: any) {
    const { result } = event;
    if (result.site) {
      await updateSiteReviewStats(result.site);
    }
  },

  async afterDelete(event: any) {
    const { result } = event;
    if (result.site) {
      await updateSiteReviewStats(result.site);
    }
  },
};
