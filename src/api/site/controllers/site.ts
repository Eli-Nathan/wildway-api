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
    userId?: string;
  };
  request: {
    query: {
      query?: string;
      start?: number;
      limit?: number;
      page?: string;
      pageSize?: string;
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
  reviews?: unknown[];
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

interface Review {
  id: number;
  title?: string;
  review?: string;
  rating?: number;
  status?: string;
  image?: { url: string };
  owner?: {
    id: number;
    name: string;
    businessName?: string;
    profile_pic?: { url: string };
    avatar?: string;
  };
}

/**
 * Record map impressions for the sites returned by a map query.
 * Upserts a daily aggregated count per site in the map_impressions table.
 * This powers the "Map Impressions" metric on business account analytics,
 * showing site owners how often their place appears in map results.
 *
 * In production (PostgreSQL), uses a single batch upsert via ON CONFLICT
 * for performance — one query regardless of result count (~200 sites).
 * In local dev (SQLite), uses INSERT OR REPLACE as a fallback.
 *
 * Fire-and-forget — failures are logged but never block the API response.
 */
async function recordMapImpressions(strapi: any, siteIds: number[]) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const now = new Date().toISOString();
  const knex = strapi.db.connection;
  const isPostgres = knex.client.config.client === "postgres";

  if (isPostgres) {
    // PostgreSQL: single batch upsert with ON CONFLICT
    const values = siteIds
      .map((id) => `(gen_random_uuid(), ${id}, '${today}', 1, '${now}', '${now}', '${now}')`)
      .join(", ");

    await knex.raw(`
      INSERT INTO map_impressions (document_id, site_id, date, count, created_at, updated_at, published_at)
      VALUES ${values}
      ON CONFLICT (site_id, date)
      DO UPDATE SET count = map_impressions.count + 1, updated_at = '${now}'
    `);
  } else {
    // SQLite fallback for local dev — individual upserts via Strapi API
    for (const siteId of siteIds) {
      const existing = await strapi.db
        .query("api::map-impression.map-impression")
        .findOne({ where: { site_id: siteId, date: today } });

      if (existing) {
        await strapi.db.query("api::map-impression.map-impression").update({
          where: { id: existing.id },
          data: { count: existing.count + 1 },
        });
      } else {
        await strapi.db.query("api::map-impression.map-impression").create({
          data: { site_id: siteId, date: today, count: 1 },
        });
      }
    }
  }
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
      const requestedLimit =
        listIds.length > 0
          ? undefined // No limit when filtering by lists
          : ctx.query.limit || ctx.query.pagination?.limit;

      // Check if type filters are applied (user selected specific types)
      const hasTypeFilters = baseFilters?.$and?.some((filter: any) =>
        filter.type || filter.siteType
      );

      // Common query options
      const baseQueryOptions = {
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
          "region",
        ],
        orderBy: ctx.query.sort || [{ priority: "DESC" }, { id: "DESC" }],
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
      };

      let sites: any[];

      // If no type filters and we have a limit, fetch N per type for fair distribution
      if (!hasTypeFilters && requestedLimit && listIds.length === 0) {
        // Get all site types
        const siteTypes = await strapi.db.query("api::site-type.site-type").findMany({
          select: ["id", "name"],
        });

        // Fetch up to the full limit per type - ensures we hit the limit even if some types
        // have few/no sites in the area. Queries run in parallel so latency is similar.
        const perTypeLimit = requestedLimit;

        const sitesByType = await Promise.all(
          siteTypes.map(async (siteType) => {
            const typeWhereClause = {
              ...whereClause,
              type: { id: siteType.id },
            };

            return strapi.db.query("api::site.site").findMany({
              ...baseQueryOptions,
              where: typeWhereClause,
              limit: perTypeLimit,
            });
          })
        );

        // Round-robin interleave results from each type
        const interleaved: any[] = [];
        let hasMore = true;
        const typeArrays = sitesByType.map(arr => [...arr]); // Clone arrays

        while (hasMore && interleaved.length < requestedLimit) {
          hasMore = false;
          for (const typeArr of typeArrays) {
            if (typeArr.length > 0) {
              interleaved.push(typeArr.shift());
              hasMore = true;
              if (interleaved.length >= requestedLimit) {
                break;
              }
            }
          }
        }

        sites = interleaved;
      } else {
        // Type filters applied or no limit - use standard query
        sites = await strapi.db.query("api::site.site").findMany({
          ...baseQueryOptions,
          where: whereClause,
          limit: requestedLimit,
        });
      }

      // Record map impressions — fire-and-forget, production only.
      // Prevents local dev and staging from polluting impression data.
      if (process.env.NODE_ENV === "production") {
        const siteIds = (sites as any[]).map((s: any) => s.id).filter(Boolean);
        if (siteIds.length > 0) {
          recordMapImpressions(strapi, siteIds).catch((err) => {
            strapi.log.error("Failed to record map impressions:", err);
          });
        }
      }

      return {
        data: (sites as any[]).map((site: any) => {
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
        select: ["id", "title", "image", "lat", "lng", "slug", "region"],
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

    async findByUser(ctx: StrapiContext) {
      const userId = ctx.params.userId;
      const page = parseInt(ctx.request.query.page as string) || 1;
      const pageSize = parseInt(ctx.request.query.pageSize as string) || 20;
      const offset = (page - 1) * pageSize;

      // Get total count
      const total = await strapi.db.query("api::site.site").count({
        where: {
          added_by: {
            id: userId,
          },
        },
      });

      // Get paginated sites with full populate for card display
      const sites = await strapi.db.query("api::site.site").findMany({
        where: {
          added_by: {
            id: userId,
          },
        },
        orderBy: { createdAt: "DESC" },
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
          tags: true,
          route_metadata: true,
        },
        limit: pageSize,
        offset,
      });

      const pageCount = Math.ceil(total / pageSize);

      return {
        data: (sites as Site[]).map((site) => ({
          id: site.id,
          attributes: site,
        })),
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount,
            total,
          },
        },
      };
    },

    async findOne(ctx: StrapiContext) {
      // Strapi 5: Use db.query directly
      const siteData = await strapi.db.query("api::site.site").findOne({
        where: { id: ctx.params.id },
        populate: {
          type: true,
          reviews: true,
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
          reviews: true,
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

    async delete(ctx: StrapiContext) {
      const siteId = ctx.params.id;

      // Check if site exists
      const existingSite = await strapi.db.query("api::site.site").findOne({
        where: { id: siteId },
        select: ["id", "documentId", "title"],
      });

      if (!existingSite) {
        ctx.status = 404;
        return { error: { status: 404, message: "Site not found" } };
      }

      // Delete the site
      await strapi.db.query("api::site.site").delete({
        where: { id: siteId },
      });

      strapi.log.info(`Deleted site ${siteId}: ${existingSite.title}`);

      return {
        data: {
          id: existingSite.id,
          title: existingSite.title,
        },
        meta: { message: "Site deleted successfully" },
      };
    },

    async getAnalytics(ctx: StrapiContext) {
      const { id } = ctx.params;
      const userId = ctx.state.user?.id;

      // Verify user owns this site
      const site = await strapi.db.query("api::site.site").findOne({
        where: { id },
        populate: { owners: { select: ["id"] } },
      });

      if (!site) {
        ctx.status = 404;
        return { error: { status: 404, message: "Site not found" } };
      }

      const isOwner = site.owners?.some((owner: { id: number }) => owner.id === userId);
      if (!isOwner) {
        ctx.status = 403;
        return { error: { status: 403, message: "You do not own this site" } };
      }

      // Query Google Analytics
      const { BetaAnalyticsDataClient } = require("@google-analytics/data");
      const analyticsClient = new BetaAnalyticsDataClient();
      const propertyId = process.env.GA4_PROPERTY_ID;

      if (!propertyId) {
        strapi.log.warn("GA4_PROPERTY_ID not configured");
        return {
          data: {
            views: null,
            ctaClicks: null,
            mapImpressions: null,
            searchImpressions: null,
          },
          meta: { error: "Analytics not configured" },
        };
      }

      // Helper to create a report query with two date ranges and both metrics
      const createReportQuery = (eventName: string, dimensionName: string, dimensionValue: string) => ({
        property: `properties/${propertyId}`,
        dateRanges: [
          { startDate: "30daysAgo", endDate: "today", name: "current" },
          { startDate: "60daysAgo", endDate: "31daysAgo", name: "previous" },
        ],
        dimensions: [{ name: dimensionName }],
        metrics: [
          { name: "eventCount" },
          { name: "activeUsers" },
        ],
        dimensionFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: "eventName",
                  stringFilter: { value: eventName },
                },
              },
              {
                filter: {
                  fieldName: dimensionName,
                  stringFilter: { value: dimensionValue },
                },
              },
            ],
          },
        },
      });

      // Helper to parse response with two date ranges
      // GA4 returns metrics for each date range in sequence within the same row:
      // metricValues[0] = eventCount for current period
      // metricValues[1] = activeUsers for current period
      // metricValues[2] = eventCount for previous period
      // metricValues[3] = activeUsers for previous period
      const parseResponse = (response: any) => {
        const row = response.rows?.[0];

        const currentCount = parseInt(row?.metricValues?.[0]?.value || "0", 10);
        const currentUsers = parseInt(row?.metricValues?.[1]?.value || "0", 10);
        const previousCount = parseInt(row?.metricValues?.[2]?.value || "0", 10);
        const previousUsers = parseInt(row?.metricValues?.[3]?.value || "0", 10);

        // Calculate percentage change (avoid division by zero)
        const countChange = previousCount > 0
          ? Math.round(((currentCount - previousCount) / previousCount) * 100)
          : currentCount > 0 ? 100 : 0;
        const usersChange = previousUsers > 0
          ? Math.round(((currentUsers - previousUsers) / previousUsers) * 100)
          : currentUsers > 0 ? 100 : 0;

        return {
          total: currentCount,
          uniqueUsers: currentUsers,
          previousTotal: previousCount,
          previousUniqueUsers: previousUsers,
          totalChange: countChange,
          uniqueUsersChange: usersChange,
        };
      };

      // Query map impressions from our own database (not GA4).
      // Map impressions are recorded server-side when the sites endpoint
      // returns results, stored as daily aggregated counts per site.
      const getMapImpressions = async (siteId: string) => {
        const knex = strapi.db.connection;
        const isPostgres = knex.client.config.client === "postgres";

        // Date arithmetic differs between PostgreSQL and SQLite
        const currentDateClause = isPostgres
          ? "date >= CURRENT_DATE - INTERVAL '30 days'"
          : "date >= date('now', '-30 days')";
        const previousStartClause = isPostgres
          ? "date >= CURRENT_DATE - INTERVAL '60 days'"
          : "date >= date('now', '-60 days')";
        const previousEndClause = isPostgres
          ? "date < CURRENT_DATE - INTERVAL '30 days'"
          : "date < date('now', '-30 days')";

        const currentResult = await knex("map_impressions")
          .where("site_id", siteId)
          .andWhereRaw(currentDateClause)
          .sum("count as total")
          .first();
        const previousResult = await knex("map_impressions")
          .where("site_id", siteId)
          .andWhereRaw(previousStartClause)
          .andWhereRaw(previousEndClause)
          .sum("count as total")
          .first();

        const currentTotal = parseInt(currentResult?.total || "0", 10);
        const previousTotal = parseInt(previousResult?.total || "0", 10);
        const totalChange = previousTotal > 0
          ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
          : currentTotal > 0 ? 100 : 0;

        return {
          total: currentTotal,
          uniqueUsers: 0, // Not tracked per-user for map impressions
          previousTotal,
          previousUniqueUsers: 0,
          totalChange,
          uniqueUsersChange: 0,
        };
      };

      try {
        // Run GA4 queries and local map impressions query in parallel
        const [viewsResponse, ctaResponse, mapImpressions, searchImpressionsResponse] = await Promise.all([
          analyticsClient.runReport(createReportQuery("site_page_viewed", "customEvent:id", String(id))),
          analyticsClient.runReport(createReportQuery("cta_clicked", "customEvent:site_id", String(id))),
          getMapImpressions(String(id)),
          analyticsClient.runReport(createReportQuery("searched", "customEvent:id", String(id))),
        ]);

        return {
          data: {
            views: parseResponse(viewsResponse[0]),
            ctaClicks: parseResponse(ctaResponse[0]),
            mapImpressions,
            searchImpressions: parseResponse(searchImpressionsResponse[0]),
          },
          meta: { period: "last_30_days", comparedTo: "previous_30_days" },
        };
      } catch (error) {
        strapi.log.error("Analytics query failed:", error);
        return {
          data: {
            views: null,
            ctaClicks: null,
            mapImpressions: null,
            searchImpressions: null,
          },
          meta: { error: "Failed to fetch analytics" },
        };
      }
    },

    /**
     * Find all sites within geographic bounds - used for offline region downloads
     * Returns all matching sites with full data needed for offline storage
     */
    async findWithinBounds(ctx: StrapiContext) {
      const { north, south, east, west } = ctx.request.query as {
        north?: string;
        south?: string;
        east?: string;
        west?: string;
      };

      // Validate required params
      if (!north || !south || !east || !west) {
        ctx.status = 400;
        return {
          error: {
            status: 400,
            message: "Missing required bounds parameters: north, south, east, west",
          },
        };
      }

      const bounds = {
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west),
      };

      // Validate bounds are numbers
      if (Object.values(bounds).some(isNaN)) {
        ctx.status = 400;
        return {
          error: {
            status: 400,
            message: "Bounds parameters must be valid numbers",
          },
        };
      }

      // Query sites within bounds
      const sites = await strapi.db.query("api::site.site").findMany({
        where: {
          lat: { $gte: bounds.south, $lte: bounds.north },
          lng: { $gte: bounds.west, $lte: bounds.east },
        },
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
          route_metadata: true,
          tags: true,
        },
        // No limit - return all sites in bounds for offline storage
      });

      // Estimate storage size
      const estimatedSizeMb = Math.round((sites.length * 2) / 10) / 10; // ~2KB per site

      return {
        data: (sites as Site[]).map((site) => ({
          id: site.id,
          attributes: { ...site, isOwned: !!site.owners?.length },
        })),
        meta: {
          siteCount: sites.length,
          bounds,
          estimatedSizeMb,
        },
      };
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

      // Fetch owner's role features to determine what tier features are available
      let ownerFeatures: Record<string, boolean> | null = null;
      if (siteHasOwners && siteOwners[0]?.id) {
        const ownerWithRole = await strapi.db.query("api::auth-user.auth-user").findOne({
          where: { id: siteOwners[0].id },
          populate: { role: true },
        });
        ownerFeatures = ownerWithRole?.role?.features || null;
      }
      const reviews = (site?.data?.attributes as Site & { reviews?: Review[] })?.reviews;
      const sanitizedReviews = shouldSanitizeChildren
        ? sanitizeApiResponse(reviews)
        : reviews;
      const enrichedReviews = await (
        await Promise.all(
          (sanitizedReviews || []).map(async (review: Review) => {
            const reviewEntity = await strapi.db
              .query("api::review.review")
              .findOne({
                where: { id: review.id, moderation_status: "complete" },
                populate: {
                  owner: {
                    populate: true,
                  },
                  image: true,
                },
              });
            if (reviewEntity) {
              return {
                ...review,
                rating: reviewEntity.rating,
                image: reviewEntity.image,
                owner: {
                  id: reviewEntity.owner.id,
                  name:
                    reviewEntity.owner.businessName || reviewEntity.owner.name,
                  avatar:
                    reviewEntity.owner?.profile_pic?.url ||
                    reviewEntity.owner.avatar,
                },
              };
            }
          })
        )
      ).filter(Boolean);

      // Fetch guides related to this site's type, sub_types, and facilities
      const siteAttributes = site?.data?.attributes as any;
      const typeId = siteAttributes?.type?.id;
      const subTypeIds = siteAttributes?.sub_types?.map((st: any) => st.id) || [];
      const facilityIds = siteAttributes?.facilities?.map((f: any) => f.id) || [];

      const allTypeIds = [typeId, ...subTypeIds].filter(Boolean);

      let guides: any[] = [];
      if (allTypeIds.length > 0 || facilityIds.length > 0) {
        const guideConditions: any[] = [];

        if (allTypeIds.length > 0) {
          guideConditions.push({ site_types: { id: { $in: allTypeIds } } });
        }
        if (facilityIds.length > 0) {
          guideConditions.push({ facilities: { id: { $in: facilityIds } } });
        }

        guides = await strapi.db.query("api::guide.guide").findMany({
          where: {
            publishedAt: { $notNull: true },
            $or: guideConditions,
          },
          select: ["id", "title", "slug", "link_message"],
          populate: {
            feature_image: true,
          },
        });

        // Deduplicate guides (in case a guide matches both type and facility)
        const seenIds = new Set();
        guides = guides.filter((guide) => {
          if (seenIds.has(guide.id)) return false;
          seenIds.add(guide.id);
          return true;
        });
      }

      // @ts-expect-error - Strapi core controller method
      const output = await this.sanitizeOutput(site, ctx);

      // Filter tier-gated features based on owner's subscription
      const attributes = output.data.attributes;
      const filteredAttributes = {
        ...attributes,
        // Only include CTA if owner has custom_cta feature
        cta_label: ownerFeatures?.custom_cta ? attributes.cta_label : null,
        cta_url: ownerFeatures?.custom_cta ? attributes.cta_url : null,
        // Only include social links if owner has social_links feature
        social_links: ownerFeatures?.social_links ? attributes.social_links : null,
      };

      return {
        ...output,
        data: {
          id: output.data.id,
          attributes: {
            ...filteredAttributes,
            reviews: enrichedReviews,
            // Backwards compatibility: old apps expect comments field
            // TODO: Remove after all users have updated to new app version
            comments: [],
            isOwned: siteHasOwners,
            owner: parsedSiteOwner,
            addedBy: parsedSiteAddedBy,
            contributors: parsedSiteContributors,
            likes: parsedSiteLikes,
            guides,
            // Include owner's features so frontend can check analytics_dashboard and reply_to_reviews
            ownerFeatures: siteHasOwners ? ownerFeatures : null,
          },
        },
      };
    },
  })
);
