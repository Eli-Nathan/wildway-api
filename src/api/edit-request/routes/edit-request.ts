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
      path: "/edit-requests",
      handler: "edit-request.find",
      config: {
        middlewares: ["api::edit-request.populate-edits"],
        policies: ["plugin::users-permissions.isAuthed", "global::is-owner"],
      },
    },
    {
      method: "GET",
      path: "/edit-requests/:id",
      handler: "edit-request.findOne",
      config: {
        middlewares: ["api::edit-request.populate-edits"],
        policies: ["plugin::users-permissions.isAuthed", "global::is-owner"],
      },
    },
    {
      method: "POST",
      path: "/edit-requests",
      handler: "edit-request.create",
      config: {
        middlewares: ["api::edit-request.populate-edits"],
        policies: ["plugin::users-permissions.isAuthed", "global::set-owner"],
      },
    },
  ],
};

export default config;
