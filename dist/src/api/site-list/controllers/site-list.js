"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
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
function getNestedValue(obj, path) {
    return path.split(".").reduce((current, key) => current === null || current === void 0 ? void 0 : current[key], obj);
}
// Helper: Get sort value (handles special cases like likes_count)
function getSortValue(site, fieldPath) {
    var _a;
    if (fieldPath === "likes_count") {
        return ((_a = site.likes) === null || _a === void 0 ? void 0 : _a.length) || 0;
    }
    return getNestedValue(site, fieldPath);
}
// Helper: Sort sites with null/undefined values at end
function sortSites(sites, fieldPath, order) {
    return [...sites].sort((a, b) => {
        const aVal = getSortValue(a, fieldPath);
        const bVal = getSortValue(b, fieldPath);
        // Handle null/undefined - always put at end
        if (aVal == null && bVal == null) {
            // Secondary sort by title for stability
            return (a.title || "").localeCompare(b.title || "");
        }
        if (aVal == null)
            return 1;
        if (bVal == null)
            return -1;
        // Compare values
        let comparison = 0;
        if (typeof aVal === "string" && typeof bVal === "string") {
            comparison = aVal.localeCompare(bVal);
        }
        else {
            comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        }
        return order === "asc" ? comparison : -comparison;
    });
}
// Helper: Filter sites by search term (title only, case-insensitive)
function filterSitesBySearch(sites, searchTerm) {
    if (!searchTerm)
        return sites;
    const term = searchTerm.toLowerCase().trim();
    return sites.filter((site) => { var _a; return (_a = site.title) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(term); });
}
// Built-in sort fields available on all lists
const BUILTIN_SORT_FIELDS = ["title", "likes_count"];
// Helper: Validate sort field against allowed fields
function isValidSortField(sort, sortableFields) {
    // Allow built-in sort fields
    if (BUILTIN_SORT_FIELDS.includes(sort)) {
        return true;
    }
    // Allow fields defined in sortable_fields
    if (sortableFields === null || sortableFields === void 0 ? void 0 : sortableFields.some((f) => f.field_path === sort)) {
        return true;
    }
    return false;
}
// Helper: Sanitize order parameter
function sanitizeOrder(order) {
    return order === "desc" ? "desc" : "asc";
}
// Helper: Process sites with search and sort
function processSites(sites, search, sort, order, sortableFields) {
    let processed = sites || [];
    // Apply search filter
    if (search) {
        processed = filterSitesBySearch(processed, search);
    }
    // Apply sorting (only if sort field is valid)
    if (sort && isValidSortField(sort, sortableFields)) {
        processed = sortSites(processed, sort, order);
    }
    else if ((sortableFields === null || sortableFields === void 0 ? void 0 : sortableFields.length) > 0) {
        // Use default sort if defined
        const defaultSort = sortableFields.find((f) => f.is_default);
        if (defaultSort) {
            processed = sortSites(processed, defaultSort.field_path, defaultSort.default_order || "asc");
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
exports.default = strapi_1.factories.createCoreController("api::site-list.site-list", ({ strapi }) => ({
    /**
     * Find all site lists (admin lists + public user lists)
     */
    async find(ctx) {
        const isAuthenticated = !!ctx.state.user;
        let whereClause = {
            owner_type: "admin",
        };
        // If authenticated, also show user's own lists + public user lists
        if (isAuthenticated) {
            whereClause = {
                $or: [
                    { owner_type: "admin" },
                    { owner: ctx.state.user.id },
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
        const listsWithCount = lists.map((list) => {
            var _a;
            return ({
                ...list,
                siteCount: ((_a = list.sites) === null || _a === void 0 ? void 0 : _a.length) || 0,
            });
        });
        return {
            data: listsWithCount.map((list) => ({
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
    async findOne(ctx) {
        var _a, _b, _c;
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
        const isOwner = ((_a = ctx.state.user) === null || _a === void 0 ? void 0 : _a.id) === ((_b = list.owner) === null || _b === void 0 ? void 0 : _b.id);
        if (list.owner_type === "user" && !list.public && !isOwner) {
            ctx.status = 403;
            return { status: 403, message: "This list is private" };
        }
        // Process sites: filter and sort
        const totalSiteCount = ((_c = list.sites) === null || _c === void 0 ? void 0 : _c.length) || 0;
        const processedSites = processSites(list.sites, search, sortBy, order, list.sortable_fields);
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
    async findOneBySlug(ctx) {
        var _a, _b, _c;
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
        const isOwner = ((_a = ctx.state.user) === null || _a === void 0 ? void 0 : _a.id) === ((_b = list.owner) === null || _b === void 0 ? void 0 : _b.id);
        if (list.owner_type === "user" && !list.public && !isOwner) {
            ctx.status = 403;
            return { status: 403, message: "This list is private" };
        }
        // Process sites: filter and sort
        const totalSiteCount = ((_c = list.sites) === null || _c === void 0 ? void 0 : _c.length) || 0;
        const processedSites = processSites(list.sites, search, sortBy, order, list.sortable_fields);
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
    async create(ctx) {
        var _a, _b;
        const requestData = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || {};
        const list = await strapi.db.query("api::site-list.site-list").create({
            data: {
                name: requestData.name,
                description: requestData.description,
                icon: requestData.icon,
                iconify: requestData.iconify,
                category: requestData.category || "Walks",
                difficulty: requestData.difficulty,
                owner_type: "user",
                owner: ctx.state.user.id,
                public: (_b = requestData.public) !== null && _b !== void 0 ? _b : false,
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
    async update(ctx) {
        var _a, _b, _c, _d;
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
        if (existingList.owner_type === "user" &&
            ((_a = existingList.owner) === null || _a === void 0 ? void 0 : _a.id) !== ((_b = ctx.state.user) === null || _b === void 0 ? void 0 : _b.id)) {
            ctx.status = 403;
            return { status: 403, message: "You cannot edit this list" };
        }
        const requestData = ((_c = ctx.request.body) === null || _c === void 0 ? void 0 : _c.data) || {};
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
                    siteCount: ((_d = updated.sites) === null || _d === void 0 ? void 0 : _d.length) || 0,
                },
            },
            meta: {},
        };
    },
    /**
     * Delete a site list (owner only for user lists)
     */
    async delete(ctx) {
        var _a, _b;
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
        if (((_a = existingList.owner) === null || _a === void 0 ? void 0 : _a.id) !== ((_b = ctx.state.user) === null || _b === void 0 ? void 0 : _b.id)) {
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
    async toggleSave(ctx) {
        var _a;
        const listId = parseInt(ctx.params.id, 10);
        const userId = ctx.state.user.id;
        // Get current user's saved lists
        const user = await strapi.db.query("api::auth-user.auth-user").findOne({
            where: { id: userId },
            populate: { saved_site_lists: { select: ["id"] } },
        });
        const savedListIds = ((_a = user.saved_site_lists) === null || _a === void 0 ? void 0 : _a.map((l) => l.id)) || [];
        const isSaved = savedListIds.includes(listId);
        const updatedSavedLists = isSaved
            ? savedListIds.filter((id) => id !== listId)
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
    async findMyLists(ctx) {
        const userId = ctx.state.user.id;
        const lists = await strapi.db.query("api::site-list.site-list").findMany({
            where: {
                owner: userId,
                owner_type: "user",
            },
            populate: listPopulateConfig,
            orderBy: [{ createdAt: "desc" }],
        });
        const listsWithCount = lists.map((list) => {
            var _a;
            return ({
                ...list,
                siteCount: ((_a = list.sites) === null || _a === void 0 ? void 0 : _a.length) || 0,
            });
        });
        return {
            data: listsWithCount.map((list) => ({
                id: list.id,
                attributes: list,
            })),
            meta: {},
        };
    },
    /**
     * Admin update for admin-owned lists (bypasses owner check)
     * Uses X-Admin-Secret header for authentication
     */
    async adminUpdate(ctx) {
        var _a, _b;
        const existingList = await strapi.db
            .query("api::site-list.site-list")
            .findOne({
            where: { id: ctx.params.id },
        });
        if (!existingList) {
            ctx.status = 404;
            return { status: 404, message: "List not found" };
        }
        const requestData = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || {};
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
                    siteCount: ((_b = updated.sites) === null || _b === void 0 ? void 0 : _b.length) || 0,
                },
            },
            meta: {},
        };
    },
    /**
     * Get lists saved by the current user
     */
    async findSavedLists(ctx) {
        const userId = ctx.state.user.id;
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
        const listsWithCount = lists.map((list) => {
            var _a;
            return ({
                ...list,
                siteCount: ((_a = list.sites) === null || _a === void 0 ? void 0 : _a.length) || 0,
            });
        });
        return {
            data: listsWithCount.map((list) => ({
                id: list.id,
                attributes: list,
            })),
            meta: {},
        };
    },
}));
