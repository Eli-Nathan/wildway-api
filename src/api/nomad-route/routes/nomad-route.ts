interface RouteConfig {
  method: string;
  path: string;
  handler: string;
  config?: {
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
      path: "/nomad-routes",
      handler: "nomad-route.find",
      config: {
        middlewares: ["api::nomad-route.populate-nomad-routes"],
      },
    },
    {
      method: "GET",
      path: "/nomad-routes/:id",
      handler: "nomad-route.findOne",
      config: {
        middlewares: ["api::nomad-route.populate-nomad-routes"],
      },
    },
    {
      method: "GET",
      path: "/nomad-routes/uid/:slug",
      handler: "nomad-route.findOneByUID",
      config: {
        middlewares: ["api::nomad-route.populate-nomad-routes"],
      },
    },
    // Admin update for nomad routes (uses X-Admin-Secret header)
    {
      method: "PUT",
      path: "/nomad-routes/:id/admin",
      handler: "nomad-route.adminUpdate",
      config: {
        auth: false,
        policies: ["global::is-admin"],
      },
    },
    // Offline data endpoint - returns route + all sites for offline download
    {
      method: "GET",
      path: "/nomad-routes/:id/offline",
      handler: "nomad-route.getOfflineData",
    },
  ],
};

export default config;
