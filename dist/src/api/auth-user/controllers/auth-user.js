"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
const emails_1 = require("../../../nomad/emails");
/**
 * Lightweight populate for auth/session - essential data + IDs only for lists
 */
const lightPopulateConfig = {
    role: true,
    profile_pic: true,
    favourites: {
        select: ["id"],
        populate: {
            type: true,
        },
    },
    saved_public_routes: {
        select: ["id"],
    },
    addition_requests: {
        select: ["id", "title", "status", "createdAt"],
    },
    edit_requests: {
        select: ["id", "status", "createdAt"],
        populate: {
            site: {
                select: ["id", "title"],
            },
        },
    },
    reviews: {
        select: ["id", "title", "rating", "status", "createdAt"],
        populate: {
            site: {
                select: ["id", "title"],
            },
        },
    },
    sites: {
        select: ["id"],
    },
};
/**
 * Full populate config - for when complete user data is needed
 * Strapi 5 populate format - object notation required
 */
const fullPopulateConfig = {
    addition_requests: true,
    edit_requests: {
        populate: {
            site: {
                populate: {
                    type: true,
                },
            },
        },
    },
    saved_public_routes: true,
    role: true,
    favourites: {
        populate: {
            type: true,
        },
    },
    profile_pic: true,
    reviews: {
        populate: {
            site: true,
            image: true,
        },
    },
    sites: {
        populate: {
            type: true,
            images: true,
        },
    },
    sites_added: {
        populate: {
            type: true,
            images: true,
        },
    },
};
// Keep backward compat alias
const populateConfig = fullPopulateConfig;
const enrichCtx = (ctx) => {
    if (!ctx.query) {
        ctx.query = {};
    }
    const existingPopulate = ctx.query.populate || {};
    if (typeof existingPopulate === "object" && !Array.isArray(existingPopulate)) {
        ctx.query.populate = { ...existingPopulate, ...populateConfig };
    }
    else {
        ctx.query.populate = populateConfig;
    }
    return ctx;
};
exports.default = strapi_1.factories.createCoreController("api::auth-user.auth-user", ({ strapi }) => ({
    async findMe(ctx) {
        // Use lightweight populate for fast auth - only essential data
        const user = await strapi.db.query("api::auth-user.auth-user").findOne({
            where: { id: ctx.params.id },
            populate: lightPopulateConfig,
        });
        if (!user) {
            return ctx.notFound("User not found");
        }
        // Return in Strapi 4 format for frontend compatibility
        return {
            data: {
                id: user.id,
                attributes: {
                    ...user,
                    // Backwards compatibility: old apps expect comments field
                    // TODO: Remove after all users have updated to new app version
                    comments: [],
                },
            },
            meta: {},
        };
    },
    /**
     * Get full user data including all relations - use sparingly
     */
    async findMeFull(ctx) {
        const user = await strapi.db.query("api::auth-user.auth-user").findOne({
            where: { id: ctx.params.id },
            populate: fullPopulateConfig,
        });
        if (!user) {
            return ctx.notFound("User not found");
        }
        return {
            data: {
                id: user.id,
                attributes: {
                    ...user,
                    // Backwards compatibility: old apps expect comments field
                    // TODO: Remove after all users have updated to new app version
                    comments: [],
                },
            },
            meta: {},
        };
    },
    async getSubscription(ctx) {
        var _a;
        // @ts-expect-error - Strapi core controller method
        const user = await super.findOne(ctx);
        const sub = await strapi
            .plugin("strapi-stripe")
            .service("stripeService")
            .searchSubscriptionStatus(ctx.state.user.email);
        if (!sub || !(sub === null || sub === void 0 ? void 0 : sub.data) || !((_a = sub === null || sub === void 0 ? void 0 : sub.data) === null || _a === void 0 ? void 0 : _a[0])) {
            // @ts-expect-error - Strapi core controller method
            return this.sanitizeOutput(undefined, ctx);
        }
        const subData = sub.data[0];
        // @ts-expect-error - Strapi core controller method
        return this.sanitizeOutput(subData, ctx);
    },
    async getProfile(ctx) {
        const user = await strapi.db.query("api::auth-user.auth-user").findOne({
            where: { id: ctx.params.id },
            populate: {
                profile_pic: true,
                sites: {
                    select: ["id"],
                },
                sites_added: {
                    select: ["id"],
                },
                user_routes: {
                    select: ["id", "public"],
                },
            },
        });
        const { maxSites, createdAt, updatedAt, allowMarketing, isVerified, user_id, ...safeUser } = user;
        const typedSafeUser = safeUser;
        const safeUserRelations = {
            sites: typedSafeUser.sites.map((site) => site.id),
            sites_added: typedSafeUser.sites_added.map((site) => site.id),
            user_routes: typedSafeUser.user_routes
                .map((route) => {
                const isOwner = Number(ctx.state.user.id) === Number(ctx.params.id);
                if (!isOwner && !route.public) {
                    return;
                }
                return route.id;
            })
                .filter(Boolean),
        };
        const response = {
            data: {
                id: typedSafeUser.id,
                attributes: {
                    ...safeUser,
                    ...safeUserRelations,
                },
            },
            meta: {},
        };
        // @ts-expect-error - Strapi core controller method
        return this.sanitizeOutput(response, ctx);
    },
    async getHighProfileUsers(ctx) {
        const users = await strapi.db.query("api::auth-user.auth-user").findMany({
            offset: 0,
            limit: 10,
            where: {
                isVerified: true,
                id: {
                    $not: ctx.state.user.id,
                },
                score: {
                    $gt: 0,
                },
                isTest: false,
            },
            orderBy: { score: "desc" },
            populate: {
                profile_pic: true,
            },
        });
        // Return only safe public fields
        const safeUsers = users.map((user) => ({
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            businessName: user.businessName,
            website: user.website,
            score: user.score,
            profile_pic: user.profile_pic,
        }));
        // @ts-expect-error - Strapi core controller method
        return await this.transformResponse(safeUsers);
    },
    async editProfile(ctx) {
        var _a;
        const requestData = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || {};
        const dataToUpdate = {};
        if (requestData.name) {
            dataToUpdate.name = requestData.name;
        }
        if (requestData.profilePic) {
            dataToUpdate.profile_pic = { set: [requestData.profilePic] };
        }
        if (requestData.businessName) {
            dataToUpdate.businessName = requestData.businessName;
        }
        if (requestData.website !== undefined) {
            dataToUpdate.website = requestData.website;
        }
        // Strapi 5: Use db.query directly
        const user = await strapi.db.query("api::auth-user.auth-user").update({
            where: { id: ctx.params.id },
            data: dataToUpdate,
            populate: populateConfig,
        });
        return {
            data: {
                id: user.id,
                attributes: user,
            },
            meta: {},
        };
    },
    async verifyEmail(ctx) {
        strapi.log.info("verifyEmail: Updating user:", ctx.params.id);
        const userDetails = ctx.state.user;
        // Use db.query directly for Strapi 5 compatibility
        const user = await strapi.db.query("api::auth-user.auth-user").update({
            where: { id: ctx.params.id },
            data: { isVerified: userDetails.email_verified },
        });
        strapi.log.info("verifyEmail: Updated user:", user === null || user === void 0 ? void 0 : user.id);
        return {
            data: {
                id: user.id,
                attributes: user,
            },
            meta: {},
        };
    },
    async updateFavourites(ctx) {
        var _a, _b, _c;
        const newFavourites = ((_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.favourites) || [];
        // Get current favourites to detect changes
        const currentUser = await strapi.db.query("api::auth-user.auth-user").findOne({
            where: { id: ctx.params.id },
            populate: { favourites: { select: ["id"] } },
        });
        const oldFavourites = ((currentUser === null || currentUser === void 0 ? void 0 : currentUser.favourites) || []).map((f) => f.id);
        // Strapi 5: Use db.query directly (accepts array of IDs for relations)
        const user = await strapi.db.query("api::auth-user.auth-user").update({
            where: { id: ctx.params.id },
            data: { favourites: newFavourites },
            populate: populateConfig,
        });
        // Find sites that were added or removed from favourites
        const addedSites = newFavourites.filter((id) => !oldFavourites.includes(id));
        const removedSites = oldFavourites.filter((id) => !newFavourites.includes(id));
        const changedSites = [...addedSites, ...removedSites];
        // Update priority for affected sites (async, don't block response)
        if (changedSites.length > 0) {
            const moderatorService = (_c = strapi.plugin("moderator")) === null || _c === void 0 ? void 0 : _c.service("moderator");
            if (moderatorService === null || moderatorService === void 0 ? void 0 : moderatorService.updateSitePriority) {
                // Run priority updates in background
                Promise.all(changedSites.map((siteId) => moderatorService.updateSitePriority(siteId).catch((err) => strapi.log.error(`Failed to update priority for site ${siteId}:`, err))));
            }
        }
        return {
            data: {
                id: user.id,
                attributes: user,
            },
            meta: {},
        };
    },
    async updateSavedRoutes(ctx) {
        var _a, _b;
        const routeId = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.route;
        if (!routeId) {
            return {
                status: 400,
                message: "Bad request",
            };
        }
        const serverRoute = await strapi.db
            .query("api::user-route.user-route")
            .findOne({
            where: {
                id: routeId,
            },
        });
        if (serverRoute.public) {
            // @ts-expect-error - Custom method on this
            const currentUser = (await this.findMe({
                ...ctx,
                params: { id: ctx.params.id },
            }));
            const savedRoutes = currentUser.data.attributes.saved_public_routes.data.map((r) => r.id) || [];
            let newSavedRoutes;
            if (savedRoutes.includes(routeId)) {
                newSavedRoutes = savedRoutes.filter((r) => r !== routeId);
            }
            else {
                newSavedRoutes = [...savedRoutes, routeId];
            }
            // Strapi 5: Use db.query directly
            const user = await strapi.db.query("api::auth-user.auth-user").update({
                where: { id: ctx.params.id },
                data: { saved_public_routes: newSavedRoutes },
                populate: populateConfig,
            });
            return {
                data: {
                    id: user.id,
                    attributes: user,
                },
                meta: {},
            };
        }
        else {
            ctx.status = 400;
            return {
                status: 400,
                message: "Cannot save a route that isn't public",
            };
        }
    },
    async create(ctx) {
        strapi.log.info("auth-user create: Starting user creation");
        if (!ctx.request.body) {
            ctx.request.body = {};
        }
        if (!ctx.request.body.data) {
            ctx.request.body.data = {};
        }
        const requestData = ctx.request.body.data;
        strapi.log.info("auth-user create: Request body data:", JSON.stringify(requestData));
        const baseRole = await strapi.db
            .query(`api::user-role.user-role`)
            .findOne({
            where: {
                level: 0,
            },
        });
        strapi.log.info("auth-user create: Base role found:", JSON.stringify(baseRole));
        if (!baseRole) {
            strapi.log.error("auth-user create: No base role found with level 0");
            ctx.throw(500, "Base user role not configured");
        }
        // Use db.query directly for Strapi 5 compatibility
        let user;
        try {
            user = await strapi.db.query("api::auth-user.auth-user").create({
                data: {
                    user_id: requestData.user_id,
                    email: requestData.email,
                    name: requestData.name,
                    avatar: requestData.avatar,
                    role: baseRole.id, // Direct ID works with db.query
                },
            });
            strapi.log.info("auth-user create: User created:", JSON.stringify(user));
        }
        catch (error) {
            strapi.log.error("auth-user create: Error creating user:", error);
            throw error;
        }
        if (user) {
            strapi.log.info("auth-user create: Sending welcome email for user:", user.id);
            const { text, html, subject } = (0, emails_1.newUserAdded)(user.name || "Name unknown", user.id);
            await (0, emails_1.sendEmail)({
                strapi,
                subject,
                address: "wildway.app@gmail.com",
                text,
                html,
            });
        }
        // Return in Strapi 4 format for frontend compatibility
        return {
            data: {
                id: user.id,
                attributes: user,
            },
            meta: {},
        };
    },
    /**
     * Get paginated activity (edits, additions, reviews) for the current user
     */
    async getActivity(ctx) {
        const userId = ctx.params.id;
        const page = parseInt(ctx.query.page || "1", 10);
        const pageSize = parseInt(ctx.query.pageSize || "20", 10);
        // Fetch all activity types in parallel
        const [editRequests, additionRequests, reviews] = await Promise.all([
            strapi.db.query("api::edit-request.edit-request").findMany({
                where: { owner: userId },
                select: ["id", "status", "createdAt"],
                populate: {
                    site: {
                        select: ["id", "title"],
                    },
                },
            }),
            strapi.db.query("api::addition-request.addition-request").findMany({
                where: { owner: userId },
                select: ["id", "title", "status", "createdAt"],
            }),
            strapi.db.query("api::review.review").findMany({
                where: { owner: userId },
                select: ["id", "title", "rating", "status", "createdAt"],
                populate: {
                    site: {
                        select: ["id", "title"],
                    },
                },
            }),
        ]);
        // Transform and merge all activity
        const allActivity = [
            ...editRequests.map((edit) => {
                var _a;
                return ({
                    id: edit.id,
                    createdAt: edit.createdAt,
                    type: "edit",
                    title: ((_a = edit.site) === null || _a === void 0 ? void 0 : _a.title) || "Unknown Site",
                    status: edit.status,
                    site: edit.site,
                });
            }),
            ...additionRequests.map((addition) => ({
                id: addition.id,
                createdAt: addition.createdAt,
                type: "addition",
                title: addition.title,
                status: addition.status,
            })),
            ...reviews.map((review) => ({
                id: review.id,
                createdAt: review.createdAt,
                type: "review",
                title: review.title,
                status: review.status,
                rating: review.rating,
                site: review.site,
            })),
        ];
        // Sort by createdAt descending (newest first)
        allActivity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Paginate
        const total = allActivity.length;
        const totalPages = Math.ceil(total / pageSize);
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedActivity = allActivity.slice(startIndex, endIndex);
        return {
            data: paginatedActivity,
            meta: {
                pagination: {
                    page,
                    pageSize,
                    pageCount: totalPages,
                    total,
                },
            },
        };
    },
}));
