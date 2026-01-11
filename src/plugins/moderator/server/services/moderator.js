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
      
      // Update the site with the edit data
      // Filter out any relation fields or invalid fields from edit.data
      const updateData = {};
      
      // Only include valid scalar fields from edit.data
      if (edit.data) {
        const allowedFields = [
          'title', 'description', 'lat', 'lng', 'latlng',
          'tel', 'pricerange', 'category', 'region', 
          'url', 'maplink', 'email', 'priority', 'image'
        ];
        
        for (const field of allowedFields) {
          if (edit.data[field] !== undefined) {
            updateData[field] = edit.data[field];
          }
        }
      }
      
      // Add images if they exist
      if (edit.images) {
        updateData.images = edit.images;
      }
      
      // Handle relation fields separately if they exist in edit.data
      if (edit.data?.type) {
        updateData.type = edit.data.type;
      }
      
      if (edit.data?.facilities) {
        updateData.facilities = edit.data.facilities;
      }
      
      if (edit.data?.sub_types) {
        updateData.sub_types = edit.data.sub_types;
      }
      
      const approved = await strapi.db.query(`api::site.site`).update({
        where: {
          id: edit.site.id,
        },
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
