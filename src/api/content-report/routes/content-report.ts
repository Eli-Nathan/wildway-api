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
      method: "POST",
      path: "/content-reports",
      handler: "content-report.create",
      config: {
        auth: false,
        policies: ["global::firebase-authed", "global::set-owner"],
      },
    },
    {
      method: "GET",
      path: "/content-reports",
      handler: "content-report.find",
      config: {
        auth: false,
        policies: ["global::firebase-authed"],
      },
    },
  ],
};

export default config;
