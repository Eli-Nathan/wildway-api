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
      path: "/user-routes",
      handler: "user-route.find",
      config: {
        auth: false,
        middlewares: ["api::user-route.populate-user-routes"],
        policies: ["global::firebase-authed", "global::is-owner"],
      },
    },
    {
      method: "GET",
      path: "/user-routes/public",
      handler: "user-route.findPublic",
      config: {
        auth: false,
        middlewares: ["api::user-route.populate-user-routes"],
        policies: ["global::firebase-authed"],
      },
    },
    {
      method: "GET",
      path: "/user-routes/user/:id",
      handler: "user-route.findRoutesByUserId",
      config: {
        auth: false,
        middlewares: ["api::user-route.populate-user-routes"],
        policies: ["global::firebase-authed"],
      },
    },
    {
      method: "GET",
      path: "/user-routes/:id",
      handler: "user-route.findOne",
      config: {
        auth: false,
        middlewares: ["api::user-route.populate-user-routes"],
        policies: ["global::firebase-authed", "global::is-owner"],
      },
    },
    {
      method: "GET",
      path: "/user-routes/public/:id",
      handler: "user-route.findOnePublic",
      config: {
        auth: false,
        middlewares: ["api::user-route.populate-user-routes"],
        policies: ["global::firebase-authed"],
      },
    },
    {
      method: "POST",
      path: "/user-routes",
      handler: "user-route.create",
      config: {
        auth: false,
        middlewares: ["api::user-route.populate-user-routes"],
        policies: ["global::firebase-authed", "global::set-owner"],
      },
    },
    {
      method: "PUT",
      path: "/user-routes/:id",
      handler: "user-route.update",
      config: {
        auth: false,
        middlewares: ["api::user-route.populate-user-routes"],
        policies: ["global::firebase-authed", "global::is-owner"],
      },
    },
    {
      method: "DELETE",
      path: "/user-routes/:id",
      handler: "user-route.delete",
      config: {
        auth: false,
        middlewares: ["api::user-route.populate-user-routes"],
        policies: ["global::firebase-authed", "global::is-owner"],
      },
    },
  ],
};

export default config;
