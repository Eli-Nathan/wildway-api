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
      path: "/trip-plans",
      handler: "trip-plan.find",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::is-plan-participant"],
      },
    },
    {
      method: "GET",
      path: "/trip-plans/:id",
      handler: "trip-plan.findOne",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::is-plan-participant"],
      },
    },
    {
      method: "GET",
      path: "/trip-plans/shared-with-me",
      handler: "trip-plan.sharedWithMe",
      config: {
        auth: false,
        policies: ["global::firebase-authed"],
      },
    },
    {
      method: "POST",
      path: "/trip-plans",
      handler: "trip-plan.create",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::set-owner"],
      },
    },
    {
      method: "PUT",
      path: "/trip-plans/:id",
      handler: "trip-plan.update",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::is-owner"],
      },
    },
    {
      method: "DELETE",
      path: "/trip-plans/:id",
      handler: "trip-plan.delete",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::is-owner"],
      },
    },
  ],
};

export default config;
