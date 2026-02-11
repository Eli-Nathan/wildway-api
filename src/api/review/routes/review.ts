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
      path: "/reviews/site/:siteId",
      handler: "review.findBySite",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/reviews",
      handler: "review.find",
      config: {
        auth: false,
        middlewares: ["api::review.populate-reviews"],
      },
    },
    {
      method: "POST",
      path: "/reviews",
      handler: "review.create",
      config: {
        auth: false,
        middlewares: ["api::review.populate-reviews"],
        policies: ["global::firebase-authed", "global::set-owner"],
      },
    },
    {
      method: "DELETE",
      path: "/reviews/:id",
      handler: "review.delete",
      config: {
        auth: false,
        middlewares: ["api::review.populate-reviews"],
        policies: ["global::firebase-authed", "global::is-owner"],
      },
    },
  ],
};

export default config;
