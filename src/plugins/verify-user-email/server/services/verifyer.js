"use strict";
const authAdmin = require("firebase-admin/auth");
const {
  getWelcomeMailContent,
  sendEmail,
} = require("../../../../nomad/emails");

module.exports = ({ strapi }) => ({
  async getUnverifiedUsers() {
    const unverifiedUsers = await strapi.db
      .query("api::auth-user.auth-user")
      .findMany({
        where: {
          isVerified: false,
        },
      });
    return unverifiedUsers;
  },
  async verifyUser(id) {
    const user = await strapi.db.query(`api::auth-user.auth-user`).findOne({
      where: { id },
    });
    authAdmin.getAuth().updateUser(user.user_id, { emailVerified: true });
    const updatedUser = await strapi.db
      .query(`api::auth-user.auth-user`)
      .update({
        where: { id },
        data: {
          isVerified: true,
        },
      });

    // Send welcome email
    if (user.email) {
      try {
        const { subject, text, html } = getWelcomeMailContent(
          user.displayName || ""
        );
        await sendEmail({
          strapi,
          subject,
          address: user.email,
          text,
          html,
        });
      } catch (error) {
        strapi.log.error(`Failed to send welcome email to ${user.email}:`, error);
      }
    }

    return updatedUser;
  },
});
