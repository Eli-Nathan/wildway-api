// @ts-nocheck
import { factories } from "@strapi/strapi";

interface StrapiContext {
  query: {
    populate?: any;
    filters?: any;
    search?: string;
    sortBy?: string;
    order?: "asc" | "desc";
  };
  params: {
    id?: string;
    uid?: string;
  };
  state: {
    user?: {
      id: number;
    };
  };
  request: {
    body?: {
      data?: any;
    };
  };
  status?: number;
}

const populateConfig = {
  image: true,
  owner: {
    populate: {
      profile_pic: true,
    },
  },
  sites: {
    populate: {
      type: true,
      images: true,
      route_metadata: true,
      likes: { select: ["id"] },
    },
  },
  sortable_fields: true,
};

// Helper: Get nested field value from object using dot notation
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

// Helper: Get sort value (handles special cases like likes_count)
function getSortValue(site: any, fieldPath: string): any {
  if (fieldPath === "likes_count") {
    return site.likes?.length || 0;
  }
  return getNestedValue(site, fieldPath);
}

// Helper: Sort sites with null/undefined values at end
function sortSites(
  sites: any[],
  fieldPath: string,
  order: "asc" | "desc"
): any[] {
  return [...sites].sort((a, b) => {
    const aVal = getSortValue(a, fieldPath);
    const bVal = getSortValue(b, fieldPath);

    // Handle null/undefined - always put at end
    if (aVal == null && bVal == null) {
      // Secondary sort by title for stability
      return (a.title || "").localeCompare(b.title || "");
    }
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    // Compare values
    let comparison = 0;
    if (typeof aVal === "string" && typeof bVal === "string") {
      comparison = aVal.localeCompare(bVal);
    } else {
      comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    }

    return order === "asc" ? comparison : -comparison;
  });
}

// Helper: Filter sites by search term (title only, case-insensitive)
function filterSitesBySearch(sites: any[], searchTerm: string): any[] {
  if (!searchTerm) return sites;

  const term = searchTerm.toLowerCase().trim();
  return sites.filter((site) => site.title?.toLowerCase().includes(term));
}

// Built-in sort fields available on all lists
const BUILTIN_SORT_FIELDS = ["title", "likes_count"];

// Helper: Validate sort field against allowed fields
function isValidSortField(
  sort: string,
  sortableFields: any[] | undefined
): boolean {
  // Allow built-in sort fields
  if (BUILTIN_SORT_FIELDS.includes(sort)) {
    return true;
  }
  // Allow fields defined in sortable_fields
  if (sortableFields?.some((f: any) => f.field_path === sort)) {
    return true;
  }
  return false;
}

// Helper: Sanitize order parameter
function sanitizeOrder(order: any): "asc" | "desc" {
  return order === "desc" ? "desc" : "asc";
}

// Helper: Process sites with search and sort
function processSites(
  sites: any[],
  search: string | undefined,
  sort: string | undefined,
  order: "asc" | "desc",
  sortableFields: any[] | undefined
): any[] {
  let processed = sites || [];

  // Apply search filter
  if (search) {
    processed = filterSitesBySearch(processed, search);
  }

  // Apply sorting (only if sort field is valid)
  if (sort && isValidSortField(sort, sortableFields)) {
    processed = sortSites(processed, sort, order);
  } else if (sortableFields?.length > 0) {
    // Use default sort if defined
    const defaultSort = sortableFields.find((f: any) => f.is_default);
    if (defaultSort) {
      processed = sortSites(
        processed,
        defaultSort.field_path,
        defaultSort.default_order || "asc"
      );
    }
  }

  return processed;
}

const listPopulateConfig = {
  image: true,
  sites: {
    select: ["id"],
  },
};

export default factories.createCoreController(
  "api::site-list.site-list",
  ({ strapi }) => ({
    /**
     * Find all site lists (admin lists + public user lists)
     */
    async find(ctx: StrapiContext) {
      const isAuthenticated = !!ctx.state.user;

      let whereClause: any = {
        owner_type: "admin",
      };

      // If authenticated, also show user's own lists + public user lists
      if (isAuthenticated) {
        whereClause = {
          $or: [
            { owner_type: "admin" },
            { owner: ctx.state.user!.id },
            { owner_type: "user", public: true },
          ],
        };
      }

      const lists = await strapi.db.query("api::site-list.site-list").findMany({
        where: whereClause,
        populate: listPopulateConfig,
        orderBy: [{ priority: "desc" }, { name: "asc" }],
      });

      // Add site count to each list
      const listsWithCount = lists.map((list: any) => ({
        ...list,
        siteCount: list.sites?.length || 0,
      }));

      return {
        data: listsWithCount.map((list: any) => ({
          id: list.id,
          attributes: list,
        })),
        meta: {},
      };
    },

    /**
     * Find one site list by ID
     * Supports query params: search, sort, order
     */
    async findOne(ctx: StrapiContext) {
      const { search, sortBy } = ctx.query;
      const order = sanitizeOrder(ctx.query.order);

      const list = await strapi.db.query("api::site-list.site-list").findOne({
        where: { id: ctx.params.id },
        populate: populateConfig,
      });

      if (!list) {
        ctx.status = 404;
        return { status: 404, message: "List not found" };
      }

      // Check visibility
      const isOwner = ctx.state.user?.id === list.owner?.id;
      if (list.owner_type === "user" && !list.public && !isOwner) {
        ctx.status = 403;
        return { status: 403, message: "This list is private" };
      }

      // Process sites: filter and sort
      const totalSiteCount = list.sites?.length || 0;
      const processedSites = processSites(
        list.sites,
        search,
        sortBy,
        order,
        list.sortable_fields
      );

      return {
        data: {
          id: list.id,
          attributes: {
            ...list,
            sites: processedSites,
            siteCount: processedSites.length,
            totalSiteCount,
          },
        },
        meta: {},
      };
    },

    /**
     * Find one site list by slug (uid)
     * Supports query params: search, sort, order
     */
    async findOneBySlug(ctx: StrapiContext) {
      const { search, sortBy } = ctx.query;
      const order = sanitizeOrder(ctx.query.order);

      const list = await strapi.db.query("api::site-list.site-list").findOne({
        where: { slug: ctx.params.uid },
        populate: populateConfig,
      });

      if (!list) {
        ctx.status = 404;
        return { status: 404, message: "List not found" };
      }

      // Check visibility
      const isOwner = ctx.state.user?.id === list.owner?.id;
      if (list.owner_type === "user" && !list.public && !isOwner) {
        ctx.status = 403;
        return { status: 403, message: "This list is private" };
      }

      // Process sites: filter and sort
      const totalSiteCount = list.sites?.length || 0;
      const processedSites = processSites(
        list.sites,
        search,
        sortBy,
        order,
        list.sortable_fields
      );

      return {
        data: {
          id: list.id,
          attributes: {
            ...list,
            sites: processedSites,
            siteCount: processedSites.length,
            totalSiteCount,
          },
        },
        meta: {},
      };
    },

    /**
     * Create a new site list (for future user-defined lists)
     */
    async create(ctx: StrapiContext) {
      const requestData = ctx.request.body?.data || {};

      const list = await strapi.db.query("api::site-list.site-list").create({
        data: {
          name: requestData.name,
          description: requestData.description,
          icon: requestData.icon,
          iconify: requestData.iconify,
          category: requestData.category || "Walks",
          difficulty: requestData.difficulty,
          owner_type: "user",
          owner: ctx.state.user!.id,
          public: requestData.public ?? false,
          sites: requestData.sites || [],
        },
      });

      return {
        data: {
          id: list.id,
          attributes: list,
        },
        meta: {},
      };
    },

    /**
     * Update a site list (owner or admin only)
     */
    async update(ctx: StrapiContext) {
      const existingList = await strapi.db
        .query("api::site-list.site-list")
        .findOne({
          where: { id: ctx.params.id },
          populate: { owner: true },
        });

      if (!existingList) {
        ctx.status = 404;
        return { status: 404, message: "List not found" };
      }

      // Check ownership for user lists
      if (
        existingList.owner_type === "user" &&
        existingList.owner?.id !== ctx.state.user?.id
      ) {
        ctx.status = 403;
        return { status: 403, message: "You cannot edit this list" };
      }

      const requestData = ctx.request.body?.data || {};

      const updated = await strapi.db.query("api::site-list.site-list").update({
        where: { id: ctx.params.id },
        data: requestData,
        populate: populateConfig,
      });

      return {
        data: {
          id: updated.id,
          attributes: {
            ...updated,
            siteCount: updated.sites?.length || 0,
          },
        },
        meta: {},
      };
    },

    /**
     * Delete a site list (owner only for user lists)
     */
    async delete(ctx: StrapiContext) {
      const existingList = await strapi.db
        .query("api::site-list.site-list")
        .findOne({
          where: { id: ctx.params.id },
          populate: { owner: true },
        });

      if (!existingList) {
        ctx.status = 404;
        return { status: 404, message: "List not found" };
      }

      // Only user lists can be deleted by their owner
      if (existingList.owner_type === "admin") {
        ctx.status = 403;
        return { status: 403, message: "Admin lists cannot be deleted" };
      }

      if (existingList.owner?.id !== ctx.state.user?.id) {
        ctx.status = 403;
        return { status: 403, message: "You cannot delete this list" };
      }

      await strapi.db.query("api::site-list.site-list").delete({
        where: { id: ctx.params.id },
      });

      return {
        data: { id: ctx.params.id },
        meta: {},
      };
    },

    /**
     * Toggle save/unsave a list for the current user
     */
    async toggleSave(ctx: StrapiContext) {
      const listId = parseInt(ctx.params.id!, 10);
      const userId = ctx.state.user!.id;

      // Get current user's saved lists
      const user = await strapi.db.query("api::auth-user.auth-user").findOne({
        where: { id: userId },
        populate: { saved_site_lists: { select: ["id"] } },
      });

      const savedListIds =
        user.saved_site_lists?.map((l: any) => l.id) || [];
      const isSaved = savedListIds.includes(listId);

      const updatedSavedLists = isSaved
        ? savedListIds.filter((id: number) => id !== listId)
        : [...savedListIds, listId];

      await strapi.db.query("api::auth-user.auth-user").update({
        where: { id: userId },
        data: { saved_site_lists: updatedSavedLists },
      });

      return {
        data: { saved: !isSaved },
        meta: {},
      };
    },

    /**
     * Get lists created by the current user
     */
    async findMyLists(ctx: StrapiContext) {
      const userId = ctx.state.user!.id;

      const lists = await strapi.db.query("api::site-list.site-list").findMany({
        where: {
          owner: userId,
          owner_type: "user",
        },
        populate: listPopulateConfig,
        orderBy: [{ createdAt: "desc" }],
      });

      const listsWithCount = lists.map((list: any) => ({
        ...list,
        siteCount: list.sites?.length || 0,
      }));

      return {
        data: listsWithCount.map((list: any) => ({
          id: list.id,
          attributes: list,
        })),
        meta: {},
      };
    },

    /**
     * Get lists saved by the current user
     */
    async findSavedLists(ctx: StrapiContext) {
      const userId = ctx.state.user!.id;

      // Get user with saved lists
      const user = await strapi.db.query("api::auth-user.auth-user").findOne({
        where: { id: userId },
        populate: {
          saved_site_lists: {
            populate: listPopulateConfig,
          },
        },
      });

      const lists = user.saved_site_lists || [];

      const listsWithCount = lists.map((list: any) => ({
        ...list,
        siteCount: list.sites?.length || 0,
      }));

      return {
        data: listsWithCount.map((list: any) => ({
          id: list.id,
          attributes: list,
        })),
        meta: {},
      };
    },
  })
);
