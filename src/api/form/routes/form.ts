interface RouteConfig {
  method: string;
  path: string;
  handler: string;
}

interface RoutesConfig {
  routes: RouteConfig[];
}

const config: RoutesConfig = {
  routes: [
    {
      method: "GET",
      path: "/forms",
      handler: "form.find",
    },
    {
      method: "GET",
      path: "/forms/:id",
      handler: "form.findOne",
    },
  ],
};

export default config;
