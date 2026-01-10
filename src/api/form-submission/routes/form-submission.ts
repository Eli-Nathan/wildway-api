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
      path: "/form-submissions",
      handler: "form-submission.find",
    },
    {
      method: "GET",
      path: "/form-submissions/:id",
      handler: "form-submission.findOne",
    },
    {
      method: "POST",
      path: "/form-submissions/:id",
      handler: "form-submission.create",
    },
  ],
};

export default config;
