"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    globalSearch: async (ctx) => {
        try {
            const { query, sitesStart = 0, sitesLimit = 25, popularRoutesStart = 0, popularRoutesLimit = 25, communityRoutesStart = 0, communityRoutesLimit = 25, usersStart = 0, usersLimit = 25, } = ctx.request.query;
            let sites;
            let popularRoutes;
            let communityRoutes;
            let people;
            sites = await strapi
                .service("api::search.search")
                // @ts-expect-error - Service method
                .searchSites(query, sitesStart, sitesLimit);
            popularRoutes = await strapi
                .service("api::search.search")
                // @ts-expect-error - Service method
                .searchPopularRoutes(query, popularRoutesStart, popularRoutesLimit);
            if (ctx.state.user) {
                communityRoutes = await strapi
                    .service("api::search.search")
                    // @ts-expect-error - Service method
                    .searchCommunityRoutes(query, communityRoutesStart, communityRoutesLimit);
                people = await strapi
                    .service("api::search.search")
                    // @ts-expect-error - Service method
                    .searchUsers(query, usersStart, usersLimit);
            }
            ctx.body = {
                sites,
                popularRoutes,
                communityRoutes,
                people,
            };
        }
        catch (err) {
            ctx.badRequest("Post report controller error", { moreDetails: err });
        }
    },
    globalSearchWithOSM: async (ctx) => {
        try {
            const { query, sitesStart = 0, sitesLimit = 25, popularRoutesStart = 0, popularRoutesLimit = 25, communityRoutesStart = 0, communityRoutesLimit = 25, usersStart = 0, usersLimit = 25, } = ctx.request.query;
            let sites;
            let unlistedSites;
            let popularRoutes;
            let communityRoutes;
            let people;
            sites = await strapi
                .service("api::search.search")
                // @ts-expect-error - Service method
                .searchSites(query, sitesStart, sitesLimit);
            unlistedSites = await strapi
                .service("api::search.search")
                // @ts-expect-error - Service method
                .searchUnlistedSites(query);
            popularRoutes = await strapi
                .service("api::search.search")
                // @ts-expect-error - Service method
                .searchPopularRoutes(query, popularRoutesStart, popularRoutesLimit);
            if (ctx.state.user) {
                communityRoutes = await strapi
                    .service("api::search.search")
                    // @ts-expect-error - Service method
                    .searchCommunityRoutes(query, communityRoutesStart, communityRoutesLimit);
                people = await strapi
                    .service("api::search.search")
                    // @ts-expect-error - Service method
                    .searchUsers(query, usersStart, usersLimit);
            }
            ctx.body = {
                places: [
                    ...sites,
                    ...unlistedSites.map(
                    // @ts-expect-error - Service method
                    strapi.service("api::search.search").transformOSMToUnlistedSite),
                ],
                popularRoutes,
                communityRoutes,
                people,
            };
        }
        catch (err) {
            ctx.badRequest("Post report controller error", { moreDetails: err });
        }
    },
};
