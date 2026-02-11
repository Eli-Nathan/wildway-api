/**
 * Backwards compatibility routes for deprecated comments API.
 * These allow old app versions to continue working until they update.
 * TODO: Remove after all users have updated to the new app version with reviews.
 */

interface RouteConfig {
  method: string;
  path: string;
  handler: string;
  config?: {
    auth?: boolean;
    policies?: string[];
  };
}

const config: { routes: RouteConfig[] } = {
  routes: [
    {
      method: "GET",
      path: "/comments",
      handler: "comment.find",
      config: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/comments",
      handler: "comment.create",
      config: {
        auth: false,
        policies: ["global::firebase-authed"],
      },
    },
    {
      method: "DELETE",
      path: "/comments/:id",
      handler: "comment.delete",
      config: {
        auth: false,
        policies: ["global::firebase-authed"],
      },
    },
  ],
};

export default config;
