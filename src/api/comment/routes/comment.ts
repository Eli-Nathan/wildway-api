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
      path: "/comments",
      handler: "comment.find",
      config: {
        middlewares: ["api::comment.populate-comments"],
      },
    },
    {
      method: "POST",
      path: "/comments",
      handler: "comment.create",
      config: {
        middlewares: ["api::comment.populate-comments"],
        policies: ["plugin::users-permissions.isAuthed", "global::set-owner"],
      },
    },
    {
      method: "DELETE",
      path: "/comments/:id",
      handler: "comment.delete",
      config: {
        middlewares: ["api::comment.populate-comments"],
        policies: ["plugin::users-permissions.isAuthed", "global::is-owner"],
      },
    },
  ],
};

export default config;
