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
      path: "/plan-shares",
      handler: "plan-share.find",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::is-plan-owner"],
      },
    },
    {
      method: "GET",
      path: "/plan-shares/:id",
      handler: "plan-share.findOne",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::is-plan-owner"],
      },
    },
    {
      method: "POST",
      path: "/plan-shares",
      handler: "plan-share.create",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::is-plan-owner"],
      },
    },
    {
      method: "PUT",
      path: "/plan-shares/:id",
      handler: "plan-share.update",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::is-plan-owner"],
      },
    },
    {
      method: "DELETE",
      path: "/plan-shares/:id",
      handler: "plan-share.delete",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::is-plan-owner"],
      },
    },
  ],
};

export default config;
