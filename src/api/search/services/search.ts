import { getPlacesFromQuery } from "../../../nomad/dataEnrichment/place";

/**
 * search service
 */

interface SearchService {
  searchSites: (query: string, start?: number, limit?: number) => Promise<any>;
  searchUnlistedSites: (query: string) => Promise<any>;
}

const searchService: SearchService = {
  searchSites: async (query: string, start = 0, limit = 10) => {
    try {
      // fetching data
      const sites = await strapi.entityService.findMany("api::site.site", {
        start,
        limit,
        fields: [
          "title",
          "description",
          "category",
          "image",
          "lat",
          "lng",
          "slug",
        ],
        filters: {
          title: {
            $containsi: query,
          },
        },
        sort: { priority: "DESC" },
        populate: {
          type: {
            populate: {
              remote_icon: true,
              remote_marker: true,
            },
          },
          images: true,
          facilities: true,
          sub_types: true,
          owners: true,
        },
      });

      // return the reduced data
      return sites;
    } catch (err) {
      return err;
    }
  },

  searchUnlistedSites: async (query: string) => {
    try {
      const unlistedSites = await getPlacesFromQuery(query);
      return unlistedSites;
    } catch (err) {
      return err;
    }
  },
};

export default searchService;