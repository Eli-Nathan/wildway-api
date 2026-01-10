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
      path: "/addition-requests",
      handler: "addition-request.find",
      config: {
        middlewares: ["api::addition-request.populate-additions"],
        policies: ["plugin::users-permissions.isAuthed", "global::is-owner"],
      },
    },
    {
      method: "GET",
      path: "/addition-requests/:id",
      handler: "addition-request.findOne",
      config: {
        middlewares: ["api::addition-request.populate-additions"],
        policies: ["plugin::users-permissions.isAuthed", "global::is-owner"],
      },
    },
    {
      method: "POST",
      path: "/addition-requests",
      handler: "addition-request.create",
      config: {
        middlewares: ["api::addition-request.populate-additions"],
        policies: ["plugin::users-permissions.isAuthed", "global::set-owner"],
      },
    },
  ],
};

export default config;
