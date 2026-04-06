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
      path: "/plan-checkins",
      handler: "plan-checkin.find",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::is-plan-participant"],
      },
    },
    {
      method: "GET",
      path: "/plan-checkins/:id",
      handler: "plan-checkin.findOne",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::is-plan-participant"],
      },
    },
    {
      method: "POST",
      path: "/plan-checkins",
      handler: "plan-checkin.create",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::is-plan-participant"],
      },
    },
    {
      method: "PUT",
      path: "/plan-checkins/:id",
      handler: "plan-checkin.update",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::is-plan-owner"],
      },
    },
    {
      method: "DELETE",
      path: "/plan-checkins/:id",
      handler: "plan-checkin.delete",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::is-plan-owner"],
      },
    },
  ],
};

export default config;
