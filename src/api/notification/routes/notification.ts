interface RouteConfig {
  method: string;
  path: string;
  handler: string;
  config?: {
    auth?: boolean;
    policies?: string[];
  };
}

interface RoutesConfig {
  routes: RouteConfig[];
}

const config: RoutesConfig = {
  routes: [
    {
      method: "PUT",
      path: "/notifications/:id/read",
      handler: "notification.markAsRead",
      config: {
        auth: false,
        policies: ["global::firebase-authed"],
      },
    },
  ],
};

export default config;
