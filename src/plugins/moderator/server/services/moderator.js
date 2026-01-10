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
    const approved = await strapi.db.query(`api::site.site`).update({
      where: {
        id: edit.site.id,
      },
      data: { images: edit.images, ...edit.data },
    });
    if (edit.owner) {
      const currentUser = await strapi.db
        .query(`api::auth-user.auth-user`)
        .findOne({
          where: { id: edit.owner.id },
        });
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
    await strapi.db.query(`api::edit-request.edit-request`).update({
      where: { id: edit.id },
      data: {
        status: "complete",
      },
    });
    return approved;
  },
});
