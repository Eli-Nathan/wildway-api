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
      path: "/sites",
      handler: "site.find",
      config: {
        auth: false, // Disable Strapi JWT auth - Firebase auth handled by middleware
        middlewares: ["api::site.populate-sites"],
      },
    },
    {
      method: "GET",
      path: "/sites/search",
      handler: "site.search",
      config: {
        auth: false,
        middlewares: ["api::site.populate-sites"],
      },
    },
    {
      method: "GET",
      path: "/sites/recent",
      handler: "site.findRecent",
      config: {
        auth: false,
        middlewares: ["api::site.populate-sites"],
      },
    },
    {
      method: "GET",
      path: "/sites/:id",
      handler: "site.findOne",
      config: {
        auth: false,
        middlewares: ["api::site.populate-site"],
      },
    },
    {
      method: "GET",
      path: "/sites/uid/:uid",
      handler: "site.findOneByUID",
      config: {
        auth: false,
        middlewares: ["api::site.populate-site"],
      },
    },
    {
      method: "POST",
      path: "/sites",
      handler: "site.create",
    },
    {
      method: "PUT",
      path: "/sites/:id",
      handler: "site.update",
    },
  ],
};

export default config;
