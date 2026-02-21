interface RouteConfig {
  method: string;
  path: string;
  handler: string;
  config?: {
    auth?: boolean;
    middlewares?: string[];
    policies?: string[];
  };
}

interface RoutesConfig {
  routes: RouteConfig[];
}

const config: RoutesConfig = {
  routes: [
    {
      method: "GET",
      path: "/auth-users/me",
      handler: "auth-user.findMe",
      config: {
        auth: false, // Disable Strapi's default auth - we use Firebase
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "GET",
      path: "/auth-users/me/full",
      handler: "auth-user.findMeFull",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "GET",
      path: "/auth-users/profile/:id",
      handler: "auth-user.getProfile",
      config: {
        auth: false,
        policies: ["global::firebase-authed"],
      },
    },
    {
      method: "GET",
      path: "/auth-users/explore",
      handler: "auth-user.getHighProfileUsers",
      config: {
        auth: false,
        policies: ["global::firebase-authed"],
      },
    },
    {
      method: "GET",
      path: "/auth-users/subscription",
      handler: "auth-user.getSubscription",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "DELETE",
      path: "/auth-users/me",
      handler: "auth-user.delete",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "POST",
      path: "/auth-users",
      handler: "auth-user.create",
      config: {
        auth: false, // New users registering via Firebase
        policies: ["global::firebase-authed", "set-user"],
      },
    },
    {
      method: "PUT",
      path: "/auth-users/favourites/:id",
      handler: "auth-user.updateFavourites",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "PUT",
      path: "/auth-users/updateSavedRoutes",
      handler: "auth-user.updateSavedRoutes",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "PUT",
      path: "/auth-users/edit-profile",
      handler: "auth-user.editProfile",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "PUT",
      path: "/auth-users/me/verifyEmail",
      handler: "auth-user.verifyEmail",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "GET",
      path: "/auth-users/me/activity",
      handler: "auth-user.getActivity",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "GET",
      path: "/auth-users/me/notifications",
      handler: "auth-user.getNotifications",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "GET",
      path: "/auth-users/me/notifications/badge-count",
      handler: "auth-user.getNotificationBadgeCount",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "PUT",
      path: "/auth-users/me/notifications/mark-all-read",
      handler: "auth-user.markAllNotificationsRead",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "PUT",
      path: "/auth-users/me/notifications/:id/read",
      handler: "auth-user.markNotificationRead",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "GET",
      path: "/auth-users/me/notification-preferences",
      handler: "auth-user.getNotificationPreferences",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "PUT",
      path: "/auth-users/me/notification-preferences",
      handler: "auth-user.updateNotificationPreferences",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "PUT",
      path: "/auth-users/me/fcm-token",
      handler: "auth-user.updateFcmToken",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "POST",
      path: "/auth-users/me/test-push",
      handler: "auth-user.testPushNotification",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "GET",
      path: "/auth-users/me/marketing-preferences",
      handler: "auth-user.getMarketingPreferences",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
    {
      method: "PUT",
      path: "/auth-users/me/marketing-preferences",
      handler: "auth-user.updateMarketingPreferences",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
  ],
};

export default config;
