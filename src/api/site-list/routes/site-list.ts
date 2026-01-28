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
    // Public endpoints - browse all lists
    {
      method: "GET",
      path: "/site-lists",
      handler: "site-list.find",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/site-lists/:id",
      handler: "site-list.findOne",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/site-lists/slug/:slug",
      handler: "site-list.findOneBySlug",
      config: {
        auth: false,
      },
    },
    // Future: User list CRUD (requires auth)
    {
      method: "POST",
      path: "/site-lists",
      handler: "site-list.create",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::set-owner"],
      },
    },
    {
      method: "PUT",
      path: "/site-lists/:id",
      handler: "site-list.update",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::is-owner"],
      },
    },
    {
      method: "DELETE",
      path: "/site-lists/:id",
      handler: "site-list.delete",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::is-owner"],
      },
    },
    // Save/unsave a list
    {
      method: "PUT",
      path: "/site-lists/:id/save",
      handler: "site-list.toggleSave",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "is-user"],
      },
    },
  ],
};

export default config;
