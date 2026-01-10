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
    },
    {
      method: "GET",
      path: "/search/fuzzy",
      handler: "search.fuzzySearch",
    },
  ],
};

export default config;