"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController("api::notification.notification", ({ strapi }) => ({
    async markAsRead(ctx) {
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
}));
