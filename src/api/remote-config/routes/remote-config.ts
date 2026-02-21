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
      method: "POST",
      path: "/remote-config/enable-review-flag",
      handler: "remote-config.enableReviewFlag",
      config: {
        auth: false,
        policies: [], // Admin key validated in controller
      },
    },
    {
      method: "POST",
      path: "/remote-config/disable-review-flag",
      handler: "remote-config.disableReviewFlag",
      config: {
        auth: false,
        policies: [], // Admin key validated in controller
      },
    },
  ],
};

export default config;
