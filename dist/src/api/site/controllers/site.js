"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const qs_1 = __importDefault(require("qs"));
const strapi_1 = require("@strapi/strapi");
const sanitizeApiResponse_1 = __importDefault(require("../../../nomad/sanitizeApiResponse"));
exports.default = strapi_1.factories.createCoreController("api::site.site", ({ strapi }) => ({
    async _find(ctx) {
        // @ts-expect-error - Strapi core controller method
        const sites = await super.find(ctx);
        // @ts-expect-error - Strapi core controller method
        return this.sanitizeOutput(sites, ctx);
    },
    async find(ctx) {
        var _a, _b, _c, _d;
        const baseFilters = qs_1.default.parse(ctx.query.filters);
        const listIdsParam = ctx.query.listIds;
        // listModes is sent as JSON string to preserve numeric keys
        let listModes = {};
        if (ctx.query.listModes) {
            try {
                let modeStr = ctx.query.listModes;
                if (typeof modeStr === 'string') {
                    // Handle URL-encoded values (axios may encode special chars)
                    if (modeStr.includes('%')) {
                        modeStr = decodeURIComponent(modeStr);
                    }
                    listModes = JSON.parse(modeStr);
                }
                else {
                    listModes = ctx.query.listModes;
                }
            }
            catch (e) {
                // Fall back to empty object if parsing fails
                listModes = {};
            }
        }
        const userId = (_b = (_a = ctx.state) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
        // Parse list IDs from comma-separated string
        const listIds = listIdsParam
            ? listIdsParam.split(",").map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id))
            : [];
        let listSiteIds = [];
        let completedSiteIdsByList = {};
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
            const allListSiteIds = new Set();
            listsWithSites.forEach((list) => {
                var _a;
                (_a = list.sites) === null || _a === void 0 ? void 0 : _a.forEach((site) => allListSiteIds.add(site.id));
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
                progressRecords.forEach((record) => {
                    var _a, _b;
                    const listId = (_a = record.site_list) === null || _a === void 0 ? void 0 : _a.id;
                    if (listId) {
                        completedSiteIdsByList[listId] =
                            ((_b = record.completed_sites) === null || _b === void 0 ? void 0 : _b.map((s) => s.id)) || [];
                    }
                });
            }
            // Filter sites based on completion mode for each list
            listsWithSites.forEach((list) => {
                var _a;
                // Try both string and number keys for listModes lookup
                const mode = listModes[String(list.id)] || listModes[list.id] || "all";
                const completedIds = completedSiteIdsByList[list.id] || [];
                const completedSet = new Set(completedIds);
                (_a = list.sites) === null || _a === void 0 ? void 0 : _a.forEach((site) => {
                    const isCompleted = completedSet.has(site.id);
                    if (mode === "all") {
                        listSiteIds.push(site.id);
                    }
                    else if (mode === "completed" && isCompleted) {
                        listSiteIds.push(site.id);
                    }
                    else if (mode === "incomplete" && !isCompleted) {
                        listSiteIds.push(site.id);
                    }
                });
            });
            // Remove duplicates
            listSiteIds = [...new Set(listSiteIds)];
        }
        // Build the combined query
        let whereClause;
        if (listIds.length > 0 && listSiteIds.length > 0) {
            // List filters are active - use UNION logic with standard filters
            // baseFilters.$and contains: [bounds..., standardFilters?]
            // We want: (bounds AND standardFilters) UNION (bounds AND listFilter)
            // Which is: bounds AND (standardFilters OR listFilter)
            const allFilters = (baseFilters === null || baseFilters === void 0 ? void 0 : baseFilters.$and) || [];
            // Separate bounds (lat/lng conditions) from standard filters
            const boundsFilters = [];
            const standardFilters = [];
            allFilters.forEach((filter) => {
                // Check if this filter is a bounds condition (has lat or lng key)
                const keys = Object.keys(filter);
                if (keys.length === 1 && (keys[0] === 'lat' || keys[0] === 'lng')) {
                    boundsFilters.push(filter);
                }
                else {
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
            }
            else {
                // Only list filters, no standard filters
                whereClause = {
                    $and: [
                        ...boundsFilters,
                        listFilter,
                    ]
                };
            }
        }
        else if (listIds.length > 0 && listSiteIds.length === 0) {
            // Lists selected but no sites match (e.g., all filtered out by completion mode)
            // Return empty result
            whereClause = { id: -1 };
        }
        else {
            // No list filters, just use base filters
            whereClause = baseFilters;
        }
        // Determine limit: no limit if filtering by lists, otherwise use provided limit
        const requestedLimit = listIds.length > 0
            ? undefined // No limit when filtering by lists
            : ctx.query.limit || ((_c = ctx.query.pagination) === null || _c === void 0 ? void 0 : _c.limit);
        // Check if type filters are applied (user selected specific types)
        const hasTypeFilters = (_d = baseFilters === null || baseFilters === void 0 ? void 0 : baseFilters.$and) === null || _d === void 0 ? void 0 : _d.some((filter) => filter.type || filter.siteType);
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
        let sites;
        // If no type filters and we have a limit, fetch N per type for fair distribution
        if (!hasTypeFilters && requestedLimit && listIds.length === 0) {
            // Get all site types
            const siteTypes = await strapi.db.query("api::site-type.site-type").findMany({
                select: ["id", "name"],
            });
            // Fetch up to the full limit per type - ensures we hit the limit even if some types
            // have few/no sites in the area. Queries run in parallel so latency is similar.
            const perTypeLimit = requestedLimit;
            const sitesByType = await Promise.all(siteTypes.map(async (siteType) => {
                const typeWhereClause = {
                    ...whereClause,
                    type: { id: siteType.id },
                };
                return strapi.db.query("api::site.site").findMany({
                    ...baseQueryOptions,
                    where: typeWhereClause,
                    limit: perTypeLimit,
                });
            }));
            // Round-robin interleave results from each type
            const interleaved = [];
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
        }
        else {
            // Type filters applied or no limit - use standard query
            sites = await strapi.db.query("api::site.site").findMany({
                ...baseQueryOptions,
                where: whereClause,
                limit: requestedLimit,
            });
        }
        return {
            data: sites.map((site) => {
                var _a;
                return {
                    id: site.id,
                    documentId: site.documentId,
                    attributes: { ...site, isOwned: !!((_a = site.owners) === null || _a === void 0 ? void 0 : _a.length) },
                };
            }),
        };
    },
    async findRecent(ctx) {
        var _a;
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
            limit: ctx.query.limit || ((_a = ctx.query.pagination) === null || _a === void 0 ? void 0 : _a.limit),
        });
        return {
            data: sites.map((site) => {
                var _a;
                return {
                    id: site.id,
                    attributes: { ...site, isOwned: !!((_a = site.owners) === null || _a === void 0 ? void 0 : _a.length) },
                };
            }),
        };
    },
    async findByUser(ctx) {
        const userId = ctx.params.userId;
        const page = parseInt(ctx.request.query.page) || 1;
        const pageSize = parseInt(ctx.request.query.pageSize) || 20;
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
            data: sites.map((site) => ({
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
    async findOne(ctx) {
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
    async findOneByUID(ctx) {
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
    async search(ctx) {
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
        return this.transformResponse([
            ...sites,
            ...unlistedSites.map(
            // @ts-expect-error - Service method
            strapi.service("api::search.search").transformOSMToUnlistedSite),
        ], ctx);
    },
    async delete(ctx) {
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
    async parseSingleSite(ctx, site, siteWithUsers, shouldSanitizeChildren = true) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const siteOwners = siteWithUsers === null || siteWithUsers === void 0 ? void 0 : siteWithUsers.owners;
        const siteLikes = siteWithUsers === null || siteWithUsers === void 0 ? void 0 : siteWithUsers.likes;
        const siteAddedBy = siteWithUsers === null || siteWithUsers === void 0 ? void 0 : siteWithUsers.added_by;
        const parsedSiteContributors = siteWithUsers.contributors.map((contributor) => {
            var _a;
            return ({
                id: contributor.id,
                name: contributor.name,
                businessName: contributor.businessName,
                score: contributor.score,
                level: contributor.level,
                avatar: ((_a = contributor.profile_pic) === null || _a === void 0 ? void 0 : _a.url) || contributor.avatar,
            });
        });
        const parsedSiteLikes = siteLikes === null || siteLikes === void 0 ? void 0 : siteLikes.map((likeUser) => {
            var _a;
            return ({
                id: likeUser.id,
                name: likeUser.name,
                businessName: likeUser.businessName,
                score: likeUser.score,
                level: likeUser.level,
                avatar: ((_a = likeUser.profile_pic) === null || _a === void 0 ? void 0 : _a.url) || likeUser.avatar,
            });
        });
        const parsedSiteAddedBy = siteAddedBy
            ? {
                id: siteAddedBy.id,
                name: siteAddedBy.name,
                businessName: siteAddedBy.businessName,
                score: siteAddedBy.score,
                level: siteAddedBy.level,
                avatar: ((_a = siteAddedBy.profile_pic) === null || _a === void 0 ? void 0 : _a.url) || siteAddedBy.avatar,
            }
            : null;
        const parsedSiteOwner = siteOwners && siteOwners.length > 0
            ? {
                id: siteOwners[0].id,
                name: siteOwners[0].name,
                businessName: siteOwners[0].businessName,
                score: siteOwners[0].score,
                level: siteOwners[0].level,
                avatar: ((_b = siteOwners[0].profile_pic) === null || _b === void 0 ? void 0 : _b.url) || siteOwners[0].avatar,
            }
            : null;
        const siteHasOwners = siteOwners ? siteOwners.length > 0 : false;
        const comments = (_d = (_c = site === null || site === void 0 ? void 0 : site.data) === null || _c === void 0 ? void 0 : _c.attributes) === null || _d === void 0 ? void 0 : _d.comments;
        const sanitizedComments = shouldSanitizeChildren
            ? (0, sanitizeApiResponse_1.default)(comments)
            : comments;
        const enrichedComments = await (await Promise.all((sanitizedComments || []).map(async (comment) => {
            var _a, _b;
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
                        name: commentEntity.owner.businessName || commentEntity.owner.name,
                        avatar: ((_b = (_a = commentEntity.owner) === null || _a === void 0 ? void 0 : _a.profile_pic) === null || _b === void 0 ? void 0 : _b.url) ||
                            commentEntity.owner.avatar,
                    },
                };
            }
        }))).filter(Boolean);
        // Fetch guides related to this site's type, sub_types, and facilities
        const siteAttributes = (_e = site === null || site === void 0 ? void 0 : site.data) === null || _e === void 0 ? void 0 : _e.attributes;
        const typeId = (_f = siteAttributes === null || siteAttributes === void 0 ? void 0 : siteAttributes.type) === null || _f === void 0 ? void 0 : _f.id;
        const subTypeIds = ((_g = siteAttributes === null || siteAttributes === void 0 ? void 0 : siteAttributes.sub_types) === null || _g === void 0 ? void 0 : _g.map((st) => st.id)) || [];
        const facilityIds = ((_h = siteAttributes === null || siteAttributes === void 0 ? void 0 : siteAttributes.facilities) === null || _h === void 0 ? void 0 : _h.map((f) => f.id)) || [];
        const allTypeIds = [typeId, ...subTypeIds].filter(Boolean);
        let guides = [];
        if (allTypeIds.length > 0 || facilityIds.length > 0) {
            const guideConditions = [];
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
                if (seenIds.has(guide.id))
                    return false;
                seenIds.add(guide.id);
                return true;
            });
        }
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
                    guides,
                },
            },
        };
    },
}));
