interface RouteConfig {
  method: string;
  path: string;
  handler: string;
  config?: {
    middlewares?: string[];
  };
}

interface RoutesConfig {
  routes: RouteConfig[];
}

const config: RoutesConfig = {
  routes: [
    {
      method: "GET",
      path: "/facilities",
      handler: "facility.find",
      config: {
        middlewares: ["api::facility.populate-facilities"],
      },
    },
  ],
};

export default config;
