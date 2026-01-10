interface RouteConfig {
  method: string;
  path: string;
  handler: string;
  config?: {
    auth?: boolean;
    policies?: string[];
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
      path: "/search",
      handler: "search.globalSearch",
    },
    {
      method: "GET",
      path: "/v2/search",
      handler: "search.globalSearchWithOSM",
    },
    {
      method: "POST",
      path: "/search/check-similar",
      handler: "search.checkSimilarSites",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "GET",
      path: "/search/fuzzy",
      handler: "search.fuzzySearch",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};

export default config;