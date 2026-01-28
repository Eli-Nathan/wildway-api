"use strict";

const {
  getRejectedMailContent,
  getApprovedMailContent,
  sendEmail,
} = require("../../../../../dist/src/nomad/emails");
const slugify = require("slugify");

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

  async getComments() {
    const comments = await strapi.db.query("api::comment.comment").findMany({
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
    return comments;
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
    } else if (collection === "comment") {
      title = rejected.site.title;
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
    const approved = await strapi.db.query(`api::site.site`).create({
      data: {
        ...safeAddition,
        added_by: addition.owner.id,
        slug: slugify(addition.title),
      },
    });
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

  async approveComment(id) {
    const comment = await strapi.db.query(`api::comment.comment`).findOne({
      where: { id },
      populate: {
        owner: true,
        type: true,
        site: true,
      },
    });

    await strapi.db.query(`api::comment.comment`).update({
      where: { id: comment.id },
      data: {
        status: "complete",
      },
    });
    if (comment.owner) {
      const currentUser = await strapi.db
        .query(`api::auth-user.auth-user`)
        .findOne({
          where: { id: comment.owner.id },
        });

      await strapi.db.query(`api::auth-user.auth-user`).update({
        where: { id: currentUser.id },
        data: {
          score: currentUser.score + 1,
        },
      });
      const { text, html, subject } = getApprovedMailContent(
        "comment",
        comment.site.title,
        comment.site.slug,
        1
      );
      await sendEmail({
        strapi,
        subject,
        address: comment.owner.email,
        text,
        html,
      });
    }
    return comment;
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
});
