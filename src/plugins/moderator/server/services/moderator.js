"use strict";

const {
  getRejectedMailContent,
  getApprovedMailContent,
  sendEmail,
} = require("../../../../../dist/src/nomad/emails");
const slugify = require("slugify");

/**
 * Calculate priority adjustments for a site based on content quality.
 *
 * Priority scoring:
 * - Has description (50+ chars): +1
 * - Has images: +2
 * - On a site-list: +2
 * - Likes: 1-10 = +5, 11-20 = +10, 20+ = +20
 * - Reviews: averageRating * 2 (so 5 stars = +10, 4 stars = +8, etc.)
 * - Future: business tier adds 50+ (to always rank above organic)
 *
 * @param {object} site - Current site data
 * @param {object} newData - New data being applied (optional)
 * @returns {number} - New priority value
 */
async function calculateSitePriority(strapi, site, newData = {}) {
  // Merge current site with new data to get effective values
  const effectiveData = { ...site, ...newData };

  let priority = 0;

  // Has meaningful description (50+ chars)
  const description = effectiveData.description || '';
  if (description.trim().length >= 50) {
    priority += 1;
  }

  // Has images
  const images = effectiveData.images || [];
  if (images.length > 0) {
    priority += 2;
  }

  // Check if on any site-lists (need to query if not provided)
  let siteLists = effectiveData.site_lists;
  if (!siteLists && site.id) {
    const siteWithLists = await strapi.db.query("api::site.site").findOne({
      where: { id: site.id },
      populate: { site_lists: { select: ["id"] } },
    });
    siteLists = siteWithLists?.site_lists || [];
  }
  if (siteLists && siteLists.length > 0) {
    priority += 2;
  }

  // Likes - tiered scoring
  let likes = effectiveData.likes;
  if (!likes && site.id) {
    const siteWithLikes = await strapi.db.query("api::site.site").findOne({
      where: { id: site.id },
      populate: { likes: { select: ["id"] } },
    });
    likes = siteWithLikes?.likes || [];
  }
  const likeCount = likes?.length || 0;
  if (likeCount > 20) {
    priority += 20;
  } else if (likeCount >= 11) {
    priority += 10;
  } else if (likeCount >= 1) {
    priority += 5;
  }

  // Reviews - rating-based scoring (averageRating * 2, so 5 stars = +10)
  let averageRating = effectiveData.averageRating;
  if (averageRating === undefined && site.id) {
    const siteWithRating = await strapi.db.query("api::site.site").findOne({
      where: { id: site.id },
      select: ["averageRating"],
    });
    averageRating = siteWithRating?.averageRating;
  }
  if (averageRating && averageRating > 0) {
    priority += Math.round(averageRating * 2);
  }

  // Future: business tier scoring (50+ to always rank above organic)
  // if (effectiveData.business_tier) {
  //   priority += 50 + (effectiveData.business_tier * 10);
  // }

  return priority;
}

/**
 * Update a site's priority based on its current content
 */
async function updateSitePriority(strapi, siteId) {
  const site = await strapi.db.query("api::site.site").findOne({
    where: { id: siteId },
    populate: {
      images: true,
      site_lists: { select: ["id"] },
      likes: { select: ["id"] },
    },
  });

  if (!site) return null;

  const newPriority = await calculateSitePriority(strapi, site);

  // Only update if priority changed
  if (newPriority !== site.priority) {
    await strapi.db.query("api::site.site").update({
      where: { id: siteId },
      data: { priority: newPriority },
    });
    console.log(`Updated site ${siteId} priority: ${site.priority || 0} -> ${newPriority}`);
  }

  return newPriority;
}

module.exports = ({ strapi }) => ({
  async getAdditions() {
    const additions = await strapi.db
      .query("api::addition-request.addition-request")
      .findMany({
        where: {
          $and: [
            {
              status: {
                $not: "rejected",
              },
            },
            {
              status: {
                $not: "complete",
              },
            },
          ],
        },
        populate: {
          owner: true,
        },
      });
    return additions;
  },

  async getEdits() {
    const edits = await strapi.db
      .query("api::edit-request.edit-request")
      .findMany({
        where: {
          $and: [
            {
              status: {
                $not: "rejected",
              },
            },
            {
              status: {
                $not: "complete",
              },
            },
          ],
        },
        populate: {
          owner: true,
          site: true,
        },
      });
    return edits;
  },

  async getReviews() {
    const reviews = await strapi.db.query("api::review.review").findMany({
      where: {
        $and: [
          {
            status: {
              $not: "rejected",
            },
          },
          {
            status: {
              $not: "complete",
            },
          },
        ],
      },
      populate: {
        owner: true,
        site: true,
        image: true,
      },
    });
    return reviews;
  },

  async rejectRequest(collection, id) {
    const rejected = await strapi.db
      .query(`api::${collection}.${collection}`)
      .update({
        where: {
          id,
        },
        data: {
          status: "rejected",
        },
        populate: {
          owner: true,
          site: true,
        },
      });
    let title = rejected.title;
    if (collection === "edit-request") {
      title = rejected.data.title;
    } else if (collection === "review") {
      title = rejected.site?.title || rejected.title;
    }
    const { text, html, subject } = getRejectedMailContent(collection, title);
    await sendEmail({
      strapi,
      subject,
      address: rejected.owner.email,
      text,
      html,
    });
    return rejected;
  },

  async approveAddition(id) {
    const addition = await strapi.db
      .query(`api::addition-request.addition-request`)
      .findOne({
        where: { id },
        populate: {
          owner: true,
          type: true,
          facilities: true,
          sub_types: true,
          images: true,
        },
      });
    const { owner, status, id: _id, ...safeAddition } = addition;

    // Calculate initial priority based on content
    const initialPriority = await calculateSitePriority(strapi, safeAddition);

    const approved = await strapi.db.query(`api::site.site`).create({
      data: {
        ...safeAddition,
        added_by: addition.owner.id,
        slug: slugify(addition.title),
        priority: initialPriority,
      },
    });
    console.log(`New site ${approved.id} created with priority: ${initialPriority}`);
    if (addition.owner) {
      const currentUser = await strapi.db
        .query(`api::auth-user.auth-user`)
        .findOne({
          where: { id: addition.owner.id },
        });

      await strapi.db.query(`api::auth-user.auth-user`).update({
        where: { id: currentUser.id },
        data: {
          score: currentUser.score + 10,
        },
      });

      const { text, html, subject } = getApprovedMailContent(
        "place addition",
        approved.title,
        approved.slug,
        10
      );
      await sendEmail({
        strapi,
        subject,
        address: addition.owner.email,
        text,
        html,
      });
    }
    await strapi.db.query(`api::addition-request.addition-request`).update({
      where: { id: addition.id },
      data: {
        status: "complete",
      },
    });
    return approved;
  },

  async approveReview(id) {
    const review = await strapi.db.query(`api::review.review`).findOne({
      where: { id },
      populate: {
        owner: true,
        site: true,
        image: true,
      },
    });

    await strapi.db.query(`api::review.review`).update({
      where: { id: review.id },
      data: {
        status: "complete",
      },
    });

    // Calculate and update site average rating
    await this.updateSiteAverageRating(review.site.id);

    // Recalculate site priority (reviews affect priority scoring)
    await updateSitePriority(strapi, review.site.id);

    if (review.owner) {
      const currentUser = await strapi.db
        .query(`api::auth-user.auth-user`)
        .findOne({
          where: { id: review.owner.id },
        });

      await strapi.db.query(`api::auth-user.auth-user`).update({
        where: { id: currentUser.id },
        data: {
          score: currentUser.score + 5,
        },
      });
      const { text, html, subject } = getApprovedMailContent(
        "review",
        review.site.title,
        review.site.slug,
        5
      );
      await sendEmail({
        strapi,
        subject,
        address: review.owner.email,
        text,
        html,
      });
    }
    return review;
  },

  async updateSiteAverageRating(siteId) {
    // Get all complete reviews for this site
    const reviews = await strapi.db.query("api::review.review").findMany({
      where: {
        site: siteId,
        status: "complete",
      },
    });

    const reviewCount = reviews.length;

    if (reviewCount === 0) {
      await strapi.db.query("api::site.site").update({
        where: { id: siteId },
        data: { averageRating: null, reviewCount: 0 },
      });
      return null;
    }

    // Calculate average
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const average = sum / reviewCount;
    const roundedAverage = Math.round(average * 100) / 100; // Round to 2 decimals

    // Update site with both average rating and review count
    await strapi.db.query("api::site.site").update({
      where: { id: siteId },
      data: { averageRating: roundedAverage, reviewCount },
    });

    console.log(`Updated site ${siteId} average rating: ${roundedAverage}, review count: ${reviewCount}`);
    return roundedAverage;
  },

  async approveEdit(id) {
    try {
      const edit = await strapi.db
        .query(`api::edit-request.edit-request`)
        .findOne({
          where: { id },
          populate: {
            owner: true,
            site: true,
            type: true,
            facilities: true,
            sub_types: true,
            images: true,
          },
        });

      if (!edit) {
        throw new Error(`Edit request with id ${id} not found`);
      }

      if (!edit.site) {
        throw new Error(`Site not found for edit request ${id}`);
      }

      // Parse edit.data if it's a string (JSON fields can sometimes be stored as strings)
      const editData = typeof edit.data === 'string' ? JSON.parse(edit.data) : edit.data;

      console.log('approveEdit - editData:', JSON.stringify(editData, null, 2));
      console.log('approveEdit - editData.route_metadata:', JSON.stringify(editData?.route_metadata, null, 2));

      // Update the site with the edit data
      // Filter out any relation fields or invalid fields from edit.data
      const updateData = {};
      
      // Only include valid scalar fields from editData
      if (editData) {
        const allowedFields = [
          'title', 'description', 'lat', 'lng', 'latlng',
          'tel', 'pricerange', 'category', 'region',
          'url', 'maplink', 'email', 'priority', 'image',
          'route_metadata'
        ];

        for (const field of allowedFields) {
          if (editData[field] !== undefined) {
            // For component fields like route_metadata, strip the id to allow proper update
            if (field === 'route_metadata' && editData[field]) {
              const { id, ...routeMetadataWithoutId } = editData[field];
              updateData[field] = routeMetadataWithoutId;
            } else {
              updateData[field] = editData[field];
            }
          }
        }
      }

      // Add images if they exist
      if (edit.images) {
        updateData.images = edit.images;
      }

      // Handle relation fields separately if they exist in editData
      if (editData?.type) {
        updateData.type = editData.type;
      }

      if (editData?.facilities) {
        updateData.facilities = editData.facilities;
      }

      if (editData?.sub_types) {
        updateData.sub_types = editData.sub_types;
      }

      console.log('approveEdit - updateData before save:', JSON.stringify(updateData, null, 2));

      // Use entityService instead of db.query to properly handle component fields like route_metadata
      const approved = await strapi.entityService.update('api::site.site', edit.site.id, {
        data: updateData,
      });

      // Recalculate and update site priority after edit is applied
      await updateSitePriority(strapi, edit.site.id);

      // Update the edit request status to complete first, before email/scoring
      await strapi.db.query(`api::edit-request.edit-request`).update({
        where: { id: edit.id },
        data: {
          status: "complete",
        },
      });
      
      // Handle owner scoring and email notifications
      if (edit.owner) {
        try {
          const currentUser = await strapi.db
            .query(`api::auth-user.auth-user`)
            .findOne({
              where: { id: edit.owner.id },
            });
            
          if (currentUser) {
            await strapi.db.query(`api::auth-user.auth-user`).update({
              where: { id: currentUser.id },
              data: {
                score: currentUser.score + 5,
              },
            });

            const { text, html, subject } = getApprovedMailContent(
              "edit request",
              approved.title,
              approved.slug || slugify(approved.title),
              5
            );
            await sendEmail({
              strapi,
              subject,
              address: edit.owner.email,
              text,
              html,
            });
          }
        } catch (emailError) {
          // Log email error but don't fail the whole operation
          console.error('Error sending approval email:', emailError);
        }
      }
      
      return approved;
    } catch (error) {
      console.error('Error in approveEdit:', error);
      throw error;
    }
  },

  /**
   * Recalculate and update a site's priority.
   * Call this when site content changes (images, likes, etc.)
   */
  async updateSitePriority(siteId) {
    return updateSitePriority(strapi, siteId);
  },
});
