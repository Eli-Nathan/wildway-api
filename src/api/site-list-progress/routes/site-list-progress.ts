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
    // Get user's progress for a specific list
    {
      method: "GET",
      path: "/site-list-progress/:listId",
      handler: "site-list-progress.getProgress",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "api::auth-user.is-user"],
      },
    },
    // Toggle completion of a site in a list
    {
      method: "PUT",
      path: "/site-list-progress/:listId/toggle/:siteId",
      handler: "site-list-progress.toggleSiteCompletion",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "api::auth-user.is-user"],
      },
    },
    // Get which lists a site is completed in (lite endpoint for site page badges)
    {
      method: "GET",
      path: "/site-list-progress/site/:siteId",
      handler: "site-list-progress.getSiteProgress",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "api::auth-user.is-user"],
      },
    },
  ],
};

export default config;
