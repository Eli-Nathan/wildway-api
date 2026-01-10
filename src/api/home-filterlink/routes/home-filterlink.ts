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
      path: "/home-filterlinks",
      handler: "home-filterlink.find",
      config: {
        middlewares: ["api::home-filterlink.populate-filterlinks"],
      },
    },
    {
      method: "GET",
      path: "/home-filterlinks/:id",
      handler: "home-filterlink.findOne",
      config: {
        middlewares: ["api::home-filterlink.populate-filterlinks"],
      },
    },
  ],
};

export default config;
