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
        policies: ["global::is-admin"],
      },
    },
  ],
};

export default config;
