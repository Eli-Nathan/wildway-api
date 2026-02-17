import { getNewReviewMailContent, sendEmail } from "../../../../nomad/emails";

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

async function notifySiteOwnersOfNewReview(reviewId: number) {
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

    if (!review?.site?.owners?.length) {
      strapi.log.info(`No owners to notify for review ${reviewId}`);
      return;
    }

    const emailData = {
      reviewerName: review.owner?.name || "A user",
      rating: review.rating,
      title: review.title,
      review: review.review || undefined,
      siteTitle: review.site.title,
      siteSlug: review.site.slug,
    };

    const emailContent = getNewReviewMailContent(emailData);

    // Send email to each owner
    for (const owner of review.site.owners) {
      if (owner.email) {
        try {
          await sendEmail({
            strapi,
            subject: emailContent.subject,
            address: owner.email,
            text: emailContent.text,
            html: emailContent.html,
          });
          strapi.log.info(
            `Sent new review notification to ${owner.email} for site ${review.site.title}`
          );
        } catch (emailErr) {
          strapi.log.error(
            `Failed to send review notification to ${owner.email}:`,
            emailErr
          );
        }
      }
    }
  } catch (err) {
    strapi.log.error(`Failed to notify site owners of review ${reviewId}:`, err);
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
    const { result, params } = event;
    const siteId = await getSiteIdFromResult(result, result.id);
    if (siteId) {
      await updateSiteReviewStats(siteId);
    }

    // Check if review was just approved (moderation_status changed to "complete")
    const newStatus = result.moderation_status;
    const wasJustApproved = newStatus === "complete" && params?.data?.moderation_status === "complete";

    if (wasJustApproved) {
      // Don't block the response - send email asynchronously
      notifySiteOwnersOfNewReview(result.id).catch((err) => {
        strapi.log.error(`Error in async review notification:`, err);
      });
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
