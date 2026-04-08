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
      path: "/sos-requests",
      handler: "sos-request.create",
      config: {
        auth: false,
        policies: ["global::firebase-authed"],
      },
    },
    {
      method: "GET",
      path: "/sos-requests/pending",
      handler: "sos-request.pending",
      config: {
        auth: false,
        policies: ["global::firebase-authed"],
      },
    },
    {
      method: "GET",
      path: "/sos-requests/sent",
      handler: "sos-request.sent",
      config: {
        auth: false,
        policies: ["global::firebase-authed"],
      },
    },
    {
      method: "PUT",
      path: "/sos-requests/:id/accept",
      handler: "sos-request.accept",
      config: {
        auth: false,
        policies: ["global::firebase-authed"],
      },
    },
    {
      method: "PUT",
      path: "/sos-requests/:id/decline",
      handler: "sos-request.decline",
      config: {
        auth: false,
        policies: ["global::firebase-authed"],
      },
    },
  ],
};

export default config;
