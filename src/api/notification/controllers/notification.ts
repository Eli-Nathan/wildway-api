// @ts-nocheck
import { factories } from "@strapi/strapi";

interface StrapiContext {
  params: {
    id?: string;
  };
  state: {
    user: {
      id: number;
    };
  };
  notFound: (message?: string) => void;
}

export default factories.createCoreController(
  "api::notification.notification",
  ({ strapi }) => ({
    async markAsRead(ctx: StrapiContext) {
      const notificationId = ctx.params.id;
      const userId = ctx.state.user.id;

      // Verify ownership
      const notification = await strapi.db
        .query("api::notification.notification")
        .findOne({
          where: { id: notificationId, recipient: userId },
        });

      if (!notification) {
        return ctx.notFound("Notification not found");
      }

      const updated = await strapi.db
        .query("api::notification.notification")
        .update({
          where: { id: notificationId },
          data: { is_read: true },
        });

      return {
        data: {
          id: updated.id,
          attributes: updated,
        },
      };
    },
  })
);
