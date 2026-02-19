import { getNewReviewMailContent, sendEmail } from "../../../../nomad/emails";
import {
  createNotification,
  shouldSendNotification,
} from "../../../../nomad/notifications";

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

    // Send notification to each owner using notification service
    for (const owner of review.site.owners) {
      await createNotification(strapi, {
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
  } catch (err) {
    strapi.log.error(`Failed to notify site owners of review ${reviewId}:`, err);
  }
}

async function notifyReviewOwnerOfReply(reviewId: number, replyText: string) {
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

    if (!review?.owner?.id) {
      strapi.log.info(`No owner to notify for review reply ${reviewId}`);
      return;
    }

    // Create a simple email content for reply notification
    const emailContent = {
      subject: `Business replied to your review of ${review.site?.title}`,
      text: `The owner of ${review.site?.title} replied to your review:\n\n"${replyText}"`,
      html: `
        <p>The owner of <strong>${review.site?.title}</strong> replied to your review:</p>
        <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0;">
          ${replyText}
        </blockquote>
        <p>
          <a href="https://wildway.app/places/${review.site?.slug}">View on Wildway</a>
        </p>
      `,
    };

    await createNotification(strapi, {
      recipientId: review.owner.id,
      type: "review_reply",
      title: "Business replied to your review",
      message: `The owner of ${review.site?.title} replied: "${replyText.substring(0, 100)}${replyText.length > 100 ? "..." : ""}"`,
      relatedEntityType: "review",
      relatedEntityId: reviewId,
      metadata: {
        siteId: review.site?.id,
        siteTitle: review.site?.title,
        replyPreview: replyText.substring(0, 200),
      },
      emailContent: review.owner.email ? emailContent : undefined,
    });
  } catch (err) {
    strapi.log.error(`Failed to notify review owner of reply ${reviewId}:`, err);
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
    const wasJustApproved =
      newStatus === "complete" && params?.data?.moderation_status === "complete";

    if (wasJustApproved) {
      // Don't block the response - send notification asynchronously
      notifySiteOwnersOfNewReview(result.id).catch((err) => {
        strapi.log.error(`Error in async review notification:`, err);
      });
    }

    // Check if owner reply was just added
    const replyJustAdded =
      params?.data?.owner_reply && params?.data?.owner_reply_at;

    if (replyJustAdded) {
      // Don't block the response - send notification asynchronously
      notifyReviewOwnerOfReply(result.id, params.data.owner_reply).catch(
        (err) => {
          strapi.log.error(`Error in async reply notification:`, err);
        }
      );
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
