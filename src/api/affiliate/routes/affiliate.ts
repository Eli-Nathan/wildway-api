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
      path: "/affiliates",
      handler: "affiliate.find",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/affiliates/:id",
      handler: "affiliate.findOne",
      config: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/affiliates",
      handler: "affiliate.create",
    },
    {
      method: "PUT",
      path: "/affiliates/:id",
      handler: "affiliate.update",
    },
    {
      method: "DELETE",
      path: "/affiliates/:id",
      handler: "affiliate.delete",
    },
    {
      method: "GET",
      path: "/affiliate/redirect",
      handler: "affiliate.redirect",
      config: {
        auth: false,
      },
    },
  ],
};

export default config;
