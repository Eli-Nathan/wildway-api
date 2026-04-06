"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = exports.isInQuietHours = exports.shouldSendNotification = exports.getNotificationPreferences = void 0;
const sendEmail_1 = __importDefault(require("../emails/sendEmail"));
const messaging_1 = require("firebase-admin/messaging");
// Map notification type to preference key
const typeToPreferenceKey = {
    status_change: "status_changes",
    review_reply: "review_replies",
    new_review: "new_reviews",
    site_like: "likes",
    route_favourite: "route_favourites",
    follower_new: "status_changes", // Default to status_changes for now
};
async function getNotificationPreferences(strapi, userId) {
    const prefs = await strapi.db
        .query("api::notification-preference.notification-preference")
        .findOne({
        where: { user: userId },
    });
    return prefs;
}
exports.getNotificationPreferences = getNotificationPreferences;
async function shouldSendNotification(strapi, recipientId, notificationType, channel) {
    const prefs = await getNotificationPreferences(strapi, recipientId);
    // If no prefs exist, use defaults (all ON)
    if (!prefs)
        return true;
    // Check mute_all
    if (prefs.mute_all)
        return false;
    // Check channel-specific preference
    const prefKey = typeToPreferenceKey[notificationType];
    const fullPrefKey = `${channel}_${prefKey}`;
    return prefs[fullPrefKey] !== false;
}
exports.shouldSendNotification = shouldSendNotification;
function isInQuietHours(prefs) {
    if (!prefs.quiet_hours_enabled)
        return false;
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    const start = prefs.quiet_hours_start;
    const end = prefs.quiet_hours_end;
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
        return currentTime >= start || currentTime < end;
    }
    return currentTime >= start && currentTime < end;
}
exports.isInQuietHours = isInQuietHours;
async function sendPushNotification(fcmToken, title, body, recipientId, strapi) {
    try {
        // Get actual unread notification count for badge
        const unreadCount = await strapi.db
            .query("api::notification.notification")
            .count({
            where: { recipient: recipientId, is_read: false },
        });
        const message = {
            token: fcmToken,
            notification: {
                title,
                body,
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default",
                        badge: unreadCount,
                    },
                },
            },
            android: {
                priority: "high",
                notification: {
                    channelId: "default_channel",
                    sound: "default",
                    priority: "high",
                    defaultSound: true,
                    defaultVibrateTimings: true,
                },
            },
            data: {
                screen: "notifications",
            },
        };
        const messaging = (0, messaging_1.getMessaging)();
        await messaging.send(message);
        return true;
    }
    catch (err) {
        strapi.log.error("FCM send error:", err instanceof Error ? err.message : String(err));
        return false;
    }
}
async function createNotification(strapi, data) {
    try {
        // Always create in-app notification
        await strapi.db.query("api::notification.notification").create({
            data: {
                recipient: data.recipientId,
                type: data.type,
                title: data.title,
                message: data.message,
                related_entity_type: data.relatedEntityType,
                related_entity_id: data.relatedEntityId,
                metadata: data.metadata,
                is_read: false,
            },
        });
        strapi.log.info(`Created notification for user ${data.recipientId}: ${data.type}`);
        // Get recipient details for email
        const recipient = await strapi.db
            .query("api::auth-user.auth-user")
            .findOne({
            where: { id: data.recipientId },
            select: ["id", "email", "fcm_token"],
        });
        if (!recipient) {
            strapi.log.warn(`Recipient ${data.recipientId} not found`);
            return;
        }
        // Send email if preferences allow and email content provided
        if (data.emailContent) {
            const shouldEmail = await shouldSendNotification(strapi, data.recipientId, data.type, "email");
            if (shouldEmail) {
                try {
                    await (0, sendEmail_1.default)({
                        strapi,
                        subject: data.emailContent.subject,
                        address: recipient.email,
                        text: data.emailContent.text,
                        html: data.emailContent.html,
                    });
                    strapi.log.info(`Sent email notification to ${recipient.email}`);
                }
                catch (emailErr) {
                    strapi.log.error(`Failed to send email notification to ${recipient.email}:`, emailErr);
                }
            }
            else {
                strapi.log.info(`Email notification skipped for user ${data.recipientId} due to preferences`);
            }
        }
        // Send push notification if user has FCM token
        if (recipient.fcm_token) {
            const shouldPush = await shouldSendNotification(strapi, data.recipientId, data.type, "push");
            const prefs = await getNotificationPreferences(strapi, data.recipientId);
            if (shouldPush && (!prefs || !isInQuietHours(prefs))) {
                const sent = await sendPushNotification(recipient.fcm_token, data.title, data.message, data.recipientId, strapi);
                if (sent) {
                    strapi.log.info(`Sent push notification to user ${data.recipientId}`);
                }
            }
            else {
                strapi.log.info(`Push notification skipped for user ${data.recipientId} due to preferences or quiet hours`);
            }
        }
    }
    catch (err) {
        strapi.log.error("Failed to create notification:", err);
    }
}
exports.createNotification = createNotification;
exports.default = {
    createNotification,
    shouldSendNotification,
    getNotificationPreferences,
    isInQuietHours,
};
