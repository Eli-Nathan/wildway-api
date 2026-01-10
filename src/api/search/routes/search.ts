interface Route {
  method: string;
  path: string;
  handler: string;
}

interface SearchRoutes {
  routes: Route[];
}

const searchRoutes: SearchRoutes = {
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
  ],
};

export default searchRoutes;