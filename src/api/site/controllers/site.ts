// @ts-nocheck
import qs from "qs";
import { factories } from "@strapi/strapi";
import sanitizeApiResponse from "../../../nomad/sanitizeApiResponse";

interface StrapiContext {
  query: {
    filters?: Record<string, unknown>;
    sort?: Record<string, string> | string;
    limit?: number;
    pagination?: {
      limit?: number;
    };
    listIds?: string; // Comma-separated list IDs
    listModes?: Record<string, "completed" | "incomplete" | "all">;
  };
  params: {
    id?: string;
    uid?: string;
  };
  request: {
    query: {
      query?: string;
      start?: number;
      limit?: number;
    };
  };
  state: {
    user?: {
      id: number;
    };
  };
}

interface Site {
  id: number;
  title?: string;
  description?: string;
  category?: string;
  image?: string;
  lat?: number;
  lng?: number;
  slug?: string;
  owners?: Array<{ id: number }>;
  type?: Record<string, unknown>;
  images?: unknown[];
  facilities?: unknown[];
  sub_types?: unknown[];
  comments?: unknown[];
}

interface SiteWithUsers {
  owners?: Array<{
    id: number;
    name: string;
    businessName?: string;
    score?: number;
    level?: number;
    profile_pic?: { url: string };
    avatar?: string;
  }>;
  likes?: Array<{
    id: number;
    name: string;
    businessName?: string;
    score?: number;
    level?: number;
    profile_pic?: { url: string };
    avatar?: string;
  }>;
  added_by?: {
    id: number;
    name: string;
    businessName?: string;
    score?: number;
    level?: number;
    profile_pic?: { url: string };
    avatar?: string;
  };
  contributors: Array<{
    id: number;
    name: string;
    businessName?: string;
    score?: number;
    level?: number;
    profile_pic?: { url: string };
    avatar?: string;
  }>;
  images?: unknown[];
}

interface SiteResponse {
  data: {
    id: number;
    attributes: Site;
  };
}

interface Comment {
  id: number;
  status?: string;
  owner?: {
    id: number;
    name: string;
    businessName?: string;
    profile_pic?: { url: string };
    avatar?: string;
  };
}

export default factories.createCoreController(
  "api::site.site",
  ({ strapi }) => ({
    async _find(ctx: StrapiContext) {
      // @ts-expect-error - Strapi core controller method
      const sites = await super.find(ctx);
      // @ts-expect-error - Strapi core controller method
      return this.sanitizeOutput(sites, ctx);
    },

    async find(ctx: StrapiContext) {
      const baseFilters = qs.parse(ctx.query.filters as unknown as string);
      const listIdsParam = ctx.query.listIds;
      // listModes is sent as JSON string to preserve numeric keys
      let listModes: Record<string, string> = {};
      if (ctx.query.listModes) {
        try {
          let modeStr = ctx.query.listModes;
          if (typeof modeStr === 'string') {
            // Handle URL-encoded values (axios may encode special chars)
            if (modeStr.includes('%')) {
              modeStr = decodeURIComponent(modeStr);
            }
            listModes = JSON.parse(modeStr);
          } else {
            listModes = ctx.query.listModes as Record<string, string>;
          }
        } catch (e) {
          // Fall back to empty object if parsing fails
          listModes = {};
        }
      }
      const userId = ctx.state?.user?.id;

      // Parse list IDs from comma-separated string
      const listIds = listIdsParam
        ? listIdsParam.split(",").map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id))
        : [];

      let listSiteIds: number[] = [];
      let completedSiteIdsByList: Record<number, number[]> = {};

      // If list filters are provided, fetch sites from those lists
      if (listIds.length > 0) {
        // Get all sites that belong to the requested lists
        const listsWithSites = await strapi.db
          .query("api::site-list.site-list")
          .findMany({
            where: { id: { $in: listIds } },
            populate: { sites: { select: ["id"] } },
          });

        // Collect all site IDs from the lists
        const allListSiteIds = new Set<number>();
        listsWithSites.forEach((list: any) => {
          list.sites?.forEach((site: any) => allListSiteIds.add(site.id));
        });

        // If user is authenticated, get their completion progress
        if (userId) {
          const progressRecords = await strapi.db
            .query("api::site-list-progress.site-list-progress")
            .findMany({
              where: {
                user: userId,
                site_list: { id: { $in: listIds } },
              },
              populate: {
                site_list: { select: ["id"] },
                completed_sites: { select: ["id"] },
              },
            });

          // Build map of completed site IDs per list
          progressRecords.forEach((record: any) => {
            const listId = record.site_list?.id;
            if (listId) {
              completedSiteIdsByList[listId] =
                record.completed_sites?.map((s: any) => s.id) || [];
            }
          });

        }

        // Filter sites based on completion mode for each list
        listsWithSites.forEach((list: any) => {
          // Try both string and number keys for listModes lookup
          const mode = listModes[String(list.id)] || listModes[list.id] || "all";
          const completedIds = completedSiteIdsByList[list.id] || [];
          const completedSet = new Set(completedIds);

          list.sites?.forEach((site: any) => {
            const isCompleted = completedSet.has(site.id);

            if (mode === "all") {
              listSiteIds.push(site.id);
            } else if (mode === "completed" && isCompleted) {
              listSiteIds.push(site.id);
            } else if (mode === "incomplete" && !isCompleted) {
              listSiteIds.push(site.id);
            }
          });
        });

        // Remove duplicates
        listSiteIds = [...new Set(listSiteIds)];
      }

      // Build the combined query
      let whereClause: any;

      if (listIds.length > 0 && listSiteIds.length > 0) {
        // List filters are active - use UNION logic with standard filters
        // baseFilters.$and contains: [bounds..., standardFilters?]
        // We want: (bounds AND standardFilters) UNION (bounds AND listFilter)
        // Which is: bounds AND (standardFilters OR listFilter)
        const allFilters = (baseFilters as any)?.$and || [];

        // Separate bounds (lat/lng conditions) from standard filters
        const boundsFilters: any[] = [];
        const standardFilters: any[] = [];

        allFilters.forEach((filter: any) => {
          // Check if this filter is a bounds condition (has lat or lng key)
          const keys = Object.keys(filter);
          if (keys.length === 1 && (keys[0] === 'lat' || keys[0] === 'lng')) {
            boundsFilters.push(filter);
          } else {
            standardFilters.push(filter);
          }
        });

        // Build UNION query: bounds AND (standardFilters OR listFilter)
        const listFilter = { id: { $in: listSiteIds } };

        if (standardFilters.length > 0) {
          // Have both standard filters and list filters - use OR between them
          whereClause = {
            $and: [
              ...boundsFilters,
              {
                $or: [
                  { $and: standardFilters },
                  listFilter,
                ]
              }
            ]
          };
        } else {
          // Only list filters, no standard filters
          whereClause = {
            $and: [
              ...boundsFilters,
              listFilter,
            ]
          };
        }
      } else if (listIds.length > 0 && listSiteIds.length === 0) {
        // Lists selected but no sites match (e.g., all filtered out by completion mode)
        // Return empty result
        whereClause = { id: -1 };
      } else {
        // No list filters, just use base filters
        whereClause = baseFilters;
      }

      // Determine limit: no limit if filtering by lists, otherwise use provided limit
      const limit =
        listIds.length > 0
          ? undefined // No limit when filtering by lists
          : ctx.query.limit || ctx.query.pagination?.limit;

      const sites = await strapi.db.query("api::site.site").findMany({
        select: [
          "id",
          "documentId",
          "title",
          "description",
          "category",
          "image",
          "lat",
          "lng",
          "slug",
        ],
        where: whereClause,
        orderBy: ctx.query.sort || { priority: "DESC" },
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
          route_metadata: true,
        },
        limit,
      });

      return {
        data: (sites as Site[]).map((site: any) => {
          return {
            id: site.id,
            documentId: site.documentId,
            attributes: { ...site, isOwned: !!site.owners?.length },
          };
        }),
      };
    },

    async findRecent(ctx: StrapiContext) {
      const sites = await strapi.db.query("api::site.site").findMany({
        select: ["id", "title", "image", "lat", "lng", "slug"],
        where: {
          $or: [
            {
              owners: {
                $not: null,
              },
            },
            {
              added_by: {
                $not: null,
              },
            },
          ],
        },
        orderBy: ctx.query.sort || { priority: "DESC" },
        populate: {
          type: true,
          images: true,
          route_metadata: true,
        },
        limit: ctx.query.limit || ctx.query.pagination?.limit,
      });
      return {
        data: (sites as Site[]).map((site) => {
          return {
            id: site.id,
            attributes: { ...site, isOwned: !!site.owners?.length },
          };
        }),
      };
    },

    async findOne(ctx: StrapiContext) {
      // Strapi 5: Use db.query directly
      const siteData = await strapi.db.query("api::site.site").findOne({
        where: { id: ctx.params.id },
        populate: {
          type: true,
          comments: true,
          owners: {
            populate: { profile_pic: true },
          },
          facilities: true,
          sub_types: true,
          images: true,
          likes: true,
          added_by: {
            populate: { profile_pic: true },
          },
          contributors: {
            populate: { profile_pic: true },
          },
          route_metadata: true,
          site_lists: {
            select: ["id", "name", "slug", "icon", "iconify", "difficulty", "category"],
          },
          tags: true,
        },
      });

      if (!siteData) {
        return { data: null };
      }

      // Format as Strapi 4 response for parseSingleSite
      const { id, documentId, ...attributes } = siteData;
      const site = {
        data: {
          id,
          attributes,
        },
      };

      // @ts-expect-error - Custom method
      return this.parseSingleSite(ctx, site, siteData, false);
    },

    async findOneByUID(ctx: StrapiContext) {
      const site = await strapi.db.query("api::site.site").findOne({
        where: { slug: ctx.params.uid },
        populate: {
          type: true,
          comments: true,
          owners: {
            populate: { profile_pic: true },
          },
          facilities: true,
          sub_types: true,
          images: true,
          route_metadata: true,
          site_lists: {
            select: ["id", "name", "slug", "icon", "iconify", "difficulty", "category"],
          },
          tags: true,
        },
      });
      if (site) {
        const siteWithUsers = await strapi.db.query("api::site.site").findOne({
          where: { slug: ctx.params.uid },
          populate: {
            owners: {
              populate: { profile_pic: true },
            },
            added_by: {
              populate: { profile_pic: true },
            },
            contributors: {
              populate: { profile_pic: true },
            },
            images: true,
          },
        });
        const siteToParse = {
          data: {
            attributes: {
              ...site,
            },
          },
        };
        // @ts-expect-error - Custom method
        return this.parseSingleSite(ctx, siteToParse, siteWithUsers, false);
      }
    },

    async search(ctx: StrapiContext) {
      const { query, start = 0, limit = 25 } = ctx.request.query;
      const sites = await strapi
        .service("api::search.search")
        // @ts-expect-error - Service method
        .searchSites(query, start, limit);

      const unlistedSites = await strapi
        .service("api::search.search")
        // @ts-expect-error - Service method
        .searchUnlistedSites(query);

      // @ts-expect-error - Strapi core controller method
      return this.transformResponse(
        [
          ...sites,
          ...unlistedSites.map(
            // @ts-expect-error - Service method
            strapi.service("api::search.search").transformOSMToUnlistedSite
          ),
        ],
        ctx
      );
    },

    async parseSingleSite(
      ctx: StrapiContext,
      site: SiteResponse,
      siteWithUsers: SiteWithUsers,
      shouldSanitizeChildren = true
    ) {
      const siteOwners = siteWithUsers?.owners;
      const siteLikes = siteWithUsers?.likes;
      const siteAddedBy = siteWithUsers?.added_by;
      const parsedSiteContributors = siteWithUsers.contributors.map(
        (contributor) => ({
          id: contributor.id,
          name: contributor.name,
          businessName: contributor.businessName,
          score: contributor.score,
          level: contributor.level,
          avatar: contributor.profile_pic?.url || contributor.avatar,
        })
      );
      const parsedSiteLikes = siteLikes?.map((likeUser) => ({
        id: likeUser.id,
        name: likeUser.name,
        businessName: likeUser.businessName,
        score: likeUser.score,
        level: likeUser.level,
        avatar: likeUser.profile_pic?.url || likeUser.avatar,
      }));
      const parsedSiteAddedBy = siteAddedBy
        ? {
            id: siteAddedBy.id,
            name: siteAddedBy.name,
            businessName: siteAddedBy.businessName,
            score: siteAddedBy.score,
            level: siteAddedBy.level,
            avatar: siteAddedBy.profile_pic?.url || siteAddedBy.avatar,
          }
        : null;
      const parsedSiteOwner =
        siteOwners && siteOwners.length > 0
          ? {
              id: siteOwners[0].id,
              name: siteOwners[0].name,
              businessName: siteOwners[0].businessName,
              score: siteOwners[0].score,
              level: siteOwners[0].level,
              avatar: siteOwners[0].profile_pic?.url || siteOwners[0].avatar,
            }
          : null;
      const siteHasOwners = siteOwners ? siteOwners.length > 0 : false;
      const comments = (site?.data?.attributes as Site & { comments?: Comment[] })?.comments;
      const sanitizedComments = shouldSanitizeChildren
        ? sanitizeApiResponse(comments)
        : comments;
      const enrichedComments = await (
        await Promise.all(
          (sanitizedComments || []).map(async (comment: Comment) => {
            const commentEntity = await strapi.db
              .query("api::comment.comment")
              .findOne({
                where: { id: comment.id, status: "complete" },
                populate: {
                  owner: {
                    populate: true,
                  },
                },
              });
            if (commentEntity) {
              return {
                ...comment,
                owner: {
                  id: commentEntity.owner.id,
                  name:
                    commentEntity.owner.businessName || commentEntity.owner.name,
                  avatar:
                    commentEntity.owner?.profile_pic?.url ||
                    commentEntity.owner.avatar,
                },
              };
            }
          })
        )
      ).filter(Boolean);
      // @ts-expect-error - Strapi core controller method
      const output = await this.sanitizeOutput(site, ctx);
      return {
        ...output,
        data: {
          id: output.data.id,
          attributes: {
            ...output.data.attributes,
            comments: enrichedComments,
            isOwned: siteHasOwners,
            owner: parsedSiteOwner,
            addedBy: parsedSiteAddedBy,
            contributors: parsedSiteContributors,
            likes: parsedSiteLikes,
          },
        },
      };
    },
  })
);
