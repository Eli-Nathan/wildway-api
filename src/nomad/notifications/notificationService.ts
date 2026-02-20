import type { StrapiInstance } from "../../types/strapi";
import sendEmail from "../emails/sendEmail";
import { getMessaging } from "firebase-admin/messaging";

export type NotificationType =
  | "status_change"
  | "review_reply"
  | "new_review"
  | "site_like"
  | "route_favourite"
  | "follower_new";

export type RelatedEntityType =
  | "site"
  | "review"
  | "edit_request"
  | "addition_request"
  | "user_route"
  | "auth_user";

interface NotificationData {
  recipientId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: number;
  metadata?: Record<string, unknown>;
  emailContent?: {
    subject: string;
    text: string;
    html: string;
  };
}

interface NotificationPreferences {
  email_status_changes: boolean;
  email_review_replies: boolean;
  email_new_reviews: boolean;
  email_likes: boolean;
  email_route_favourites: boolean;
  push_status_changes: boolean;
  push_review_replies: boolean;
  push_new_reviews: boolean;
  push_likes: boolean;
  push_route_favourites: boolean;
  mute_all: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

// Map notification type to preference key
const typeToPreferenceKey: Record<NotificationType, string> = {
  status_change: "status_changes",
  review_reply: "review_replies",
  new_review: "new_reviews",
  site_like: "likes",
  route_favourite: "route_favourites",
  follower_new: "status_changes", // Default to status_changes for now
};

export async function getNotificationPreferences(
  strapi: StrapiInstance,
  userId: number
): Promise<NotificationPreferences | null> {
  const prefs = await strapi.db
    .query("api::notification-preference.notification-preference")
    .findOne({
      where: { user: userId },
    });

  return prefs;
}

export async function shouldSendNotification(
  strapi: StrapiInstance,
  recipientId: number,
  notificationType: NotificationType,
  channel: "email" | "push"
): Promise<boolean> {
  const prefs = await getNotificationPreferences(strapi, recipientId);

  // If no prefs exist, use defaults (all ON)
  if (!prefs) return true;

  // Check mute_all
  if (prefs.mute_all) return false;

  // Check channel-specific preference
  const prefKey = typeToPreferenceKey[notificationType];
  const fullPrefKey = `${channel}_${prefKey}` as keyof NotificationPreferences;
  return prefs[fullPrefKey] !== false;
}

export function isInQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quiet_hours_enabled) return false;

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

async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  strapi: StrapiInstance
): Promise<boolean> {
  try {
    strapi.log.info(`Attempting push notification to token: ${fcmToken.substring(0, 20)}...`);

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
            badge: 1,
          },
        },
      },
      data: {
        screen: "notifications",
      },
    };

    strapi.log.info(`Sending via Firebase Admin SDK...`);
    strapi.log.info(`Full FCM token: ${fcmToken}`);
    const messaging = getMessaging();
    strapi.log.info(`Got messaging instance, app name: ${messaging.app.name}`);
    strapi.log.info(`Message payload: ${JSON.stringify(message)}`);
    strapi.log.info(`Calling messaging.send()...`);
    const response = await messaging.send(message);
    strapi.log.info(`FCM send success, message ID: ${response}`);
    return true;
  } catch (err: unknown) {
    strapi.log.error("FCM send caught error type:", typeof err);
    strapi.log.error("FCM send caught error:", String(err));
    if (err instanceof Error) {
      strapi.log.error("FCM Error.message:", err.message);
      strapi.log.error("FCM Error.name:", err.name);
      strapi.log.error("FCM Error.stack:", err.stack?.substring(0, 500));
    }
    if (err && typeof err === 'object') {
      strapi.log.error("FCM error keys:", Object.keys(err));
      strapi.log.error("FCM error own props:", Object.getOwnPropertyNames(err));
      for (const key of Object.keys(err)) {
        strapi.log.error(`FCM error[${key}]:`, (err as Record<string, unknown>)[key]);
      }
    }
    return false;
  }
}

export async function createNotification(
  strapi: StrapiInstance,
  data: NotificationData
): Promise<void> {
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

    strapi.log.info(
      `Created notification for user ${data.recipientId}: ${data.type}`
    );

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
      const shouldEmail = await shouldSendNotification(
        strapi,
        data.recipientId,
        data.type,
        "email"
      );

      if (shouldEmail) {
        try {
          await sendEmail({
            strapi,
            subject: data.emailContent.subject,
            address: recipient.email,
            text: data.emailContent.text,
            html: data.emailContent.html,
          });
          strapi.log.info(`Sent email notification to ${recipient.email}`);
        } catch (emailErr) {
          strapi.log.error(
            `Failed to send email notification to ${recipient.email}:`,
            emailErr
          );
        }
      } else {
        strapi.log.info(
          `Email notification skipped for user ${data.recipientId} due to preferences`
        );
      }
    }

    // Send push notification if user has FCM token
    if (recipient.fcm_token) {
      const shouldPush = await shouldSendNotification(
        strapi,
        data.recipientId,
        data.type,
        "push"
      );
      const prefs = await getNotificationPreferences(strapi, data.recipientId);

      if (shouldPush && (!prefs || !isInQuietHours(prefs))) {
        const sent = await sendPushNotification(
          recipient.fcm_token,
          data.title,
          data.message,
          strapi
        );
        if (sent) {
          strapi.log.info(`Sent push notification to user ${data.recipientId}`);
        }
      } else {
        strapi.log.info(
          `Push notification skipped for user ${data.recipientId} due to preferences or quiet hours`
        );
      }
    }
  } catch (err) {
    strapi.log.error("Failed to create notification:", err);
  }
}

export default {
  createNotification,
  shouldSendNotification,
  getNotificationPreferences,
  isInQuietHours,
};
