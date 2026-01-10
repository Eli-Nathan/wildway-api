/**
 * A set of functions called "actions" for `search`
 */

interface SearchController {
  globalSearch: (ctx: any, next: any) => Promise<void>;
  globalSearchWithOSM: (ctx: any, next: any) => Promise<void>;
}

const searchController: SearchController = {
  globalSearch: async (ctx, next) => {
    try {
      const {
        query,
        sitesStart = 0,
        sitesLimit = 25,
        popularRoutesStart = 0,
        popularRoutesLimit = 25,
        communityRoutesStart = 0,
        communityRoutesLimit = 25,
        usersStart = 0,
        usersLimit = 25,
      } = ctx.request.query;

      let sites;
      let unlistedSites;
      let popularRoutes;
      let communityRoutes;
      let people;

      sites = await strapi
        .service("api::search.search")
        .searchSites(query, sitesStart, sitesLimit);

      popularRoutes = await strapi
        .service("api::search.search")
        .searchPopularRoutes(query, popularRoutesStart, popularRoutesLimit);

      if (ctx.state.user) {
        communityRoutes = await strapi
          .service("api::search.search")
          .searchCommunityRoutes(
            query,
            communityRoutesStart,
            communityRoutesLimit
          );
        people = await strapi
          .service("api::search.search")
          .searchUsers(query, usersStart, usersLimit);
      }

      ctx.body = {
        sites,
        popularRoutes,
        communityRoutes,
        people,
      };
    } catch (err) {
      ctx.badRequest("Post report controller error", { moreDetails: err });
    }
  },
  
  globalSearchWithOSM: async (ctx, next) => {
    try {
      const {
        query,
        sitesStart = 0,
        sitesLimit = 25,
        popularRoutesStart = 0,
        popularRoutesLimit = 25,
        communityRoutesStart = 0,
        communityRoutesLimit = 25,
        usersStart = 0,
        usersLimit = 25,
      } = ctx.request.query;

      let sites;
      let unlistedSites;
      let popularRoutes;
      let communityRoutes;
      let people;

      sites = await strapi
        .service("api::search.search")
        .searchSites(query, sitesStart, sitesLimit);

      unlistedSites = await strapi
        .service("api::search.search")
        .searchUnlistedSites(query);

      popularRoutes = await strapi
        .service("api::search.search")
        .searchPopularRoutes(query, popularRoutesStart, popularRoutesLimit);

      if (ctx.state.user) {
        communityRoutes = await strapi
          .service("api::search.search")
          .searchCommunityRoutes(
            query,
            communityRoutesStart,
            communityRoutesLimit
          );
        people = await strapi
          .service("api::search.search")
          .searchUsers(query, usersStart, usersLimit);
      }

      ctx.body = {
        places: [
          ...sites,
          ...unlistedSites.map(
            strapi.service("api::search.search").transformOSMToUnlistedSite
          ),
        ],
        popularRoutes,
        communityRoutes,
        people,
      };
    } catch (err) {
      ctx.badRequest("Post report controller error", { moreDetails: err });
    }
  },
};

export default searchController;