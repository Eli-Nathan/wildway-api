"use strict";

module.exports = {
  async findAdditions(ctx) {
    ctx.body = await strapi
      .plugin("moderator")
      .service("moderator")
      .getAdditions();
  },
  async findEdits(ctx) {
    ctx.body = await strapi.plugin("moderator").service("moderator").getEdits();
  },
  async findAll(ctx) {
    const edits = await strapi
      .plugin("moderator")
      .service("moderator")
      .getEdits();
    const additions = await strapi
      .plugin("moderator")
      .service("moderator")
      .getAdditions();
    const reviews = await strapi
      .plugin("moderator")
      .service("moderator")
      .getReviews();
    ctx.body = {
      additions,
      edits,
      reviews,
    };
  },
  async reject(ctx) {
    const { params } = ctx;
    const rejected = await strapi
      .plugin("moderator")
      .service("moderator")
      .rejectRequest(params.collection, params.id);
    ctx.body = rejected;
  },
  async approveAddition(ctx) {
    const { params } = ctx;
    const approved = await strapi
      .plugin("moderator")
      .service("moderator")
      .approveAddition(params.id);
    ctx.body = approved;
  },
  async approveReview(ctx) {
    const { params } = ctx;
    const approved = await strapi
      .plugin("moderator")
      .service("moderator")
      .approveReview(params.id);
    ctx.body = approved;
  },
  async approveEdit(ctx) {
    const { params } = ctx;
    const approved = await strapi
      .plugin("moderator")
      .service("moderator")
      .approveEdit(params.id);
    ctx.body = approved;
  },
};
