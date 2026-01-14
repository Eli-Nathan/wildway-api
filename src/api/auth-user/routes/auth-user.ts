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
  ],
};

export default config;
