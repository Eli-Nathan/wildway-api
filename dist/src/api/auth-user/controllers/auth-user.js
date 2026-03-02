"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
const emails_1 = require("../../../nomad/emails");
const notificationService_1 = require("../../../nomad/notifications/notificationService");
const handleService_1 = __importDefault(require("../../../nomad/handles/handleService"));
/**
 * Add status alias by copying from moderation_status field
 * This allows old app versions to use status while DB uses moderation_status
 */
function addStatusAlias(items) {
    if (!items)
        return items;
    return items.map((item) => ({
        ...item,
        status: item.moderation_status, // Alias for old app versions
    }));
}
/**
 * Lightweight populate for auth/session - essential data + IDs only for lists
 */
const lightPopulateConfig = {
    role: true,
    profile_pic: true,
    favourites: {
        select: ["id", "title", "lat", "lng", "image", "imageCaption"],
        populate: {
            type: true,
            images: true,
        },
    },
    saved_public_routes: {
        select: ["id"],
    },
    addition_requests: {
        select: ["id", "title", "moderation_status", "createdAt"],
    },
    edit_requests: {
        select: ["id", "moderation_status", "createdAt"],
        populate: {
            site: {
                select: ["id", "title"],
            },
        },
    },
    reviews: {
        select: ["id", "title", "rating", "moderation_status", "createdAt"],
        populate: {
            site: {
                select: ["id", "title"],
            },
        },
    },
    sites: {
        select: ["id", "title", "lat", "lng", "image", "imageCaption"],
        populate: {
            type: true,
            images: true,
            reviews: true,
            likes: true,
        },
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
            reviews: true,
            likes: true,
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
                    // Add moderation_status alias for new app versions
                    addition_requests: addStatusAlias(user.addition_requests),
                    edit_requests: addStatusAlias(user.edit_requests),
                    reviews: addStatusAlias(user.reviews),
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
        // Handle update with validation
        if (requestData.handle !== undefined) {
            const handle = String(requestData.handle).toLowerCase().trim();
            // Validate format
            const validation = handleService_1.default.validateHandle(handle);
            if (!validation.valid) {
                ctx.status = 400;
                return {
                    error: {
                        message: validation.error,
                    },
                };
            }
            // Check availability (exclude current user)
            const isAvailable = await handleService_1.default.checkHandleAvailable(handle, strapi, parseInt(ctx.params.id, 10));
            if (!isAvailable) {
                ctx.status = 400;
                return {
                    error: {
                        message: "This handle is already taken",
                    },
                };
            }
            dataToUpdate.handle = handle;
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
    /**
     * Check if a handle is available for use
     * Returns { available: boolean, error?: string }
     */
    async checkHandleAvailability(ctx) {
        var _a, _b;
        const handle = (_a = ctx.params.handle) === null || _a === void 0 ? void 0 : _a.toLowerCase().trim();
        if (!handle) {
            ctx.status = 400;
            return { available: false, error: "Handle is required" };
        }
        // Validate format first
        const validation = handleService_1.default.validateHandle(handle);
        if (!validation.valid) {
            return {
                available: false,
                error: validation.error,
            };
        }
        // Check if available (exclude current user if authenticated)
        const userId = (_b = ctx.state.user) === null || _b === void 0 ? void 0 : _b.id;
        const isAvailable = await handleService_1.default.checkHandleAvailable(handle, strapi, userId ? parseInt(userId, 10) : undefined);
        return {
            available: isAvailable,
            error: isAvailable ? undefined : "This handle is already taken",
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
        // Send notifications for newly liked sites (async, don't block response)
        if (addedSites.length > 0) {
            const likerName = user.name || "Someone";
            Promise.all(addedSites.map(async (siteId) => {
                var _a;
                try {
                    // Get site with added_by info
                    const site = await strapi.db.query("api::site.site").findOne({
                        where: { id: siteId },
                        select: ["id", "title"],
                        populate: { added_by: { select: ["id", "name", "email"] } },
                    });
                    // Notify added_by user if they exist and it's not the liker
                    if (((_a = site === null || site === void 0 ? void 0 : site.added_by) === null || _a === void 0 ? void 0 : _a.id) && site.added_by.id !== parseInt(ctx.params.id)) {
                        await (0, notificationService_1.createNotification)(strapi, {
                            recipientId: site.added_by.id,
                            type: "site_like",
                            title: "Someone liked your place",
                            message: `${likerName} liked "${site.title}"`,
                            relatedEntityType: "site",
                            relatedEntityId: siteId,
                            metadata: { likerUserId: parseInt(ctx.params.id) },
                        });
                    }
                }
                catch (err) {
                    strapi.log.error(`Failed to send like notification for site ${siteId}:`, err);
                }
            }));
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
            const isAdding = !savedRoutes.includes(routeId);
            if (isAdding) {
                newSavedRoutes = [...savedRoutes, routeId];
            }
            else {
                newSavedRoutes = savedRoutes.filter((r) => r !== routeId);
            }
            // Strapi 5: Use db.query directly
            const user = await strapi.db.query("api::auth-user.auth-user").update({
                where: { id: ctx.params.id },
                data: { saved_public_routes: newSavedRoutes },
                populate: populateConfig,
            });
            // Send notification to route owner if someone else is saving it (async, don't block response)
            if (isAdding) {
                const saverName = user.name || "Someone";
                Promise.resolve().then(async () => {
                    var _a;
                    try {
                        // Get route with owner info
                        const route = await strapi.db.query("api::user-route.user-route").findOne({
                            where: { id: routeId },
                            select: ["id", "name"],
                            populate: { owner: { select: ["id", "name", "email"] } },
                        });
                        // Notify route owner if they exist and it's not the saver
                        if (((_a = route === null || route === void 0 ? void 0 : route.owner) === null || _a === void 0 ? void 0 : _a.id) && route.owner.id !== parseInt(ctx.params.id)) {
                            await (0, notificationService_1.createNotification)(strapi, {
                                recipientId: route.owner.id,
                                type: "route_favourite",
                                title: "Someone saved your route",
                                message: `${saverName} saved your route "${route.name}"`,
                                relatedEntityType: "user_route",
                                relatedEntityId: routeId,
                                metadata: { saverUserId: parseInt(ctx.params.id) },
                            });
                        }
                    }
                    catch (err) {
                        strapi.log.error(`Failed to send route favourite notification for route ${routeId}:`, err);
                    }
                });
            }
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
        var _a;
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
        // Generate unique handle from name
        const nameForHandle = requestData.name || ((_a = requestData.email) === null || _a === void 0 ? void 0 : _a.split("@")[0]) || "user";
        const baseHandle = handleService_1.default.generateHandle(nameForHandle);
        const uniqueHandle = await handleService_1.default.ensureUniqueHandle(baseHandle, strapi);
        strapi.log.info("auth-user create: Generated handle:", uniqueHandle);
        // Use db.query directly for Strapi 5 compatibility
        let user;
        try {
            user = await strapi.db.query("api::auth-user.auth-user").create({
                data: {
                    user_id: requestData.user_id,
                    email: requestData.email,
                    name: requestData.name,
                    avatar: requestData.avatar,
                    handle: uniqueHandle,
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
            const { text, html, subject } = (0, emails_1.newUserAdded)(user.name || "Name unknown", user.documentId);
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
                select: ["id", "moderation_status", "createdAt"],
                populate: {
                    site: {
                        select: ["id", "title"],
                    },
                },
            }),
            strapi.db.query("api::addition-request.addition-request").findMany({
                where: { owner: userId },
                select: ["id", "title", "moderation_status", "createdAt"],
            }),
            strapi.db.query("api::review.review").findMany({
                where: { owner: userId },
                select: ["id", "title", "rating", "moderation_status", "createdAt"],
                populate: {
                    site: {
                        select: ["id", "title"],
                    },
                },
            }),
        ]);
        // Transform and merge all activity (include both moderation_status and status alias)
        const allActivity = [
            ...editRequests.map((edit) => {
                var _a;
                return ({
                    id: edit.id,
                    createdAt: edit.createdAt,
                    type: "edit",
                    title: ((_a = edit.site) === null || _a === void 0 ? void 0 : _a.title) || "Unknown Site",
                    moderation_status: edit.moderation_status,
                    status: edit.moderation_status, // Alias for old app versions
                    site: edit.site,
                });
            }),
            ...additionRequests.map((addition) => ({
                id: addition.id,
                createdAt: addition.createdAt,
                type: "addition",
                title: addition.title,
                moderation_status: addition.moderation_status,
                status: addition.moderation_status, // Alias for old app versions
            })),
            ...reviews.map((review) => ({
                id: review.id,
                createdAt: review.createdAt,
                type: "review",
                title: review.title,
                moderation_status: review.moderation_status,
                status: review.moderation_status, // Alias for old app versions
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
    /**
     * Get paginated notifications for the current user
     */
    async getNotifications(ctx) {
        const userId = ctx.params.id;
        const page = parseInt(ctx.query.page || "1", 10);
        const pageSize = parseInt(ctx.query.pageSize || "20", 10);
        const where = { recipient: userId };
        const [notifications, total] = await Promise.all([
            strapi.db.query("api::notification.notification").findMany({
                where,
                orderBy: { createdAt: "desc" },
                offset: (page - 1) * pageSize,
                limit: pageSize,
            }),
            strapi.db.query("api::notification.notification").count({ where }),
        ]);
        // Map to ensure consistent field names for frontend
        const mappedNotifications = notifications.map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            is_read: n.is_read,
            related_entity_type: n.related_entity_type,
            related_entity_id: n.related_entity_id,
            metadata: n.metadata,
            createdAt: n.createdAt || n.created_at,
        }));
        return {
            data: mappedNotifications,
            meta: {
                pagination: {
                    page,
                    pageSize,
                    pageCount: Math.ceil(total / pageSize),
                    total,
                },
            },
        };
    },
    /**
     * Get unread notification count for badge
     */
    async getNotificationBadgeCount(ctx) {
        const userId = ctx.params.id;
        const count = await strapi.db
            .query("api::notification.notification")
            .count({
            where: { recipient: userId, is_read: false },
        });
        return { count };
    },
    /**
     * Mark all notifications as read
     */
    async markAllNotificationsRead(ctx) {
        const userId = ctx.params.id;
        // Get all unread notification IDs for this user
        const unreadNotifications = await strapi.db
            .query("api::notification.notification")
            .findMany({
            where: { recipient: userId, is_read: false },
            select: ["id"],
        });
        // Update each notification
        if (unreadNotifications.length > 0) {
            await Promise.all(unreadNotifications.map((notification) => strapi.db.query("api::notification.notification").update({
                where: { id: notification.id },
                data: { is_read: true },
            })));
        }
        return { success: true, markedCount: unreadNotifications.length };
    },
    /**
     * Mark a single notification as read
     */
    async markNotificationRead(ctx) {
        var _a, _b, _c;
        const userId = ctx.params.id;
        const notificationId = ctx.query.notificationId || ctx.params.notificationId;
        // Parse the notification ID from the route path
        const pathParts = ((_b = (_a = ctx.request) === null || _a === void 0 ? void 0 : _a.url) === null || _b === void 0 ? void 0 : _b.split("/")) || [];
        const readIndex = pathParts.indexOf("read");
        const parsedNotificationId = readIndex > 0 ? pathParts[readIndex - 1] : null;
        const finalNotificationId = notificationId || parsedNotificationId;
        if (!finalNotificationId) {
            ctx.status = 400;
            return { error: "Notification ID is required" };
        }
        // Verify the notification belongs to this user
        const notification = await strapi.db
            .query("api::notification.notification")
            .findOne({
            where: { id: finalNotificationId },
            populate: { recipient: true },
        });
        if (!notification) {
            ctx.status = 404;
            return { error: "Notification not found" };
        }
        if (((_c = notification.recipient) === null || _c === void 0 ? void 0 : _c.id) !== parseInt(userId)) {
            ctx.status = 403;
            return { error: "Not authorized to update this notification" };
        }
        await strapi.db.query("api::notification.notification").update({
            where: { id: finalNotificationId },
            data: { is_read: true },
        });
        return { success: true };
    },
    /**
     * Get notification preferences for the current user
     */
    async getNotificationPreferences(ctx) {
        const userId = ctx.params.id;
        let prefs = await strapi.db
            .query("api::notification-preference.notification-preference")
            .findOne({
            where: { user: userId },
        });
        // Create with defaults if doesn't exist
        if (!prefs) {
            prefs = await strapi.db
                .query("api::notification-preference.notification-preference")
                .create({
                data: { user: userId },
            });
        }
        return {
            data: {
                id: prefs.id,
                attributes: prefs,
            },
        };
    },
    /**
     * Update notification preferences for the current user
     */
    async updateNotificationPreferences(ctx) {
        var _a;
        const userId = ctx.params.id;
        const updates = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || {};
        // Remove any fields that shouldn't be updated directly
        delete updates.user;
        delete updates.id;
        let prefs = await strapi.db
            .query("api::notification-preference.notification-preference")
            .findOne({
            where: { user: userId },
        });
        if (!prefs) {
            prefs = await strapi.db
                .query("api::notification-preference.notification-preference")
                .create({
                data: { user: userId, ...updates },
            });
        }
        else {
            prefs = await strapi.db
                .query("api::notification-preference.notification-preference")
                .update({
                where: { id: prefs.id },
                data: updates,
            });
        }
        return {
            data: {
                id: prefs.id,
                attributes: prefs,
            },
        };
    },
    /**
     * Update FCM token for push notifications
     */
    async updateFcmToken(ctx) {
        var _a, _b;
        const userId = ctx.params.id;
        const fcmToken = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.fcmToken;
        if (!fcmToken) {
            ctx.status = 400;
            return { error: "FCM token is required" };
        }
        await strapi.db.query("api::auth-user.auth-user").update({
            where: { id: userId },
            data: { fcm_token: fcmToken },
        });
        return { success: true };
    },
    /**
     * Test push notification - sends a test notification to yourself
     */
    async testPushNotification(ctx) {
        const userId = ctx.params.id;
        try {
            await (0, notificationService_1.createNotification)(strapi, {
                recipientId: parseInt(userId),
                type: "status_change",
                title: "Test notification",
                message: "This is a test push notification from Wildway!",
                relatedEntityType: undefined,
                relatedEntityId: undefined,
                metadata: { test: true },
            });
            return { success: true, message: "Test notification sent" };
        }
        catch (err) {
            strapi.log.error("Test push failed:", err);
            ctx.status = 500;
            return { error: err.message };
        }
    },
    /**
     * Get marketing preferences for the current user
     */
    async getMarketingPreferences(ctx) {
        var _a;
        const userId = ctx.params.id;
        const user = await strapi.db.query("api::auth-user.auth-user").findOne({
            where: { id: userId },
            select: ["allowMarketing"],
        });
        return {
            allowMarketing: (_a = user === null || user === void 0 ? void 0 : user.allowMarketing) !== null && _a !== void 0 ? _a : false,
        };
    },
    /**
     * Update marketing preferences for the current user
     */
    async updateMarketingPreferences(ctx) {
        var _a;
        const userId = ctx.params.id;
        const { allowMarketing } = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || {};
        if (typeof allowMarketing !== "boolean") {
            ctx.status = 400;
            return { error: "allowMarketing must be a boolean" };
        }
        await strapi.db.query("api::auth-user.auth-user").update({
            where: { id: userId },
            data: { allowMarketing },
        });
        return { allowMarketing };
    },
    /**
     * Get SOS Contacts (favorite contacts for sharing)
     */
    async getSOSContacts(ctx) {
        const userId = ctx.params.id;
        const user = await strapi.db.query("api::auth-user.auth-user").findOne({
            where: { id: userId },
            populate: {
                sos_contacts: {
                    select: ["id", "name", "handle", "avatar", "businessName", "score"],
                    populate: {
                        profile_pic: true,
                    },
                },
            },
        });
        if (!user) {
            ctx.status = 404;
            return { error: "User not found" };
        }
        // Return SOS contacts with safe public fields
        const sosContacts = (user.sos_contacts || []).map((member) => ({
            id: member.id,
            name: member.name,
            handle: member.handle,
            avatar: member.avatar,
            businessName: member.businessName,
            score: member.score,
            profile_pic: member.profile_pic,
        }));
        return {
            data: sosContacts,
            meta: { count: sosContacts.length },
        };
    },
    /**
     * Update SOS Contacts (add/remove contacts)
     */
    async updateSOSContacts(ctx) {
        var _a, _b;
        const userId = ctx.params.id;
        const sosContactIds = ((_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.sos_contacts) || [];
        // Validate that all IDs are valid users (and not the current user)
        if (sosContactIds.includes(parseInt(userId))) {
            ctx.status = 400;
            return { error: "Cannot add yourself to your SOS contacts" };
        }
        // Verify all users exist
        const users = await strapi.db.query("api::auth-user.auth-user").findMany({
            where: { id: { $in: sosContactIds } },
            select: ["id"],
        });
        if (users.length !== sosContactIds.length) {
            ctx.status = 400;
            return { error: "One or more users not found" };
        }
        // Update SOS Contacts
        await strapi.db.query("api::auth-user.auth-user").update({
            where: { id: userId },
            data: { sos_contacts: sosContactIds },
        });
        // Return updated SOS Contacts
        // @ts-expect-error - Custom method on this
        return this.getSOSContacts(ctx);
    },
    /**
     * Add a single user to SOS Contacts
     */
    async addToSOSContacts(ctx) {
        const userId = ctx.params.id;
        const userToAddId = parseInt(ctx.params.userToAddId);
        if (userToAddId === parseInt(userId)) {
            ctx.status = 400;
            return { error: "Cannot add yourself to your SOS contacts" };
        }
        // Get current SOS Contacts
        const currentUser = await strapi.db.query("api::auth-user.auth-user").findOne({
            where: { id: userId },
            populate: {
                sos_contacts: { select: ["id"] },
            },
        });
        const currentSOSContacts = ((currentUser === null || currentUser === void 0 ? void 0 : currentUser.sos_contacts) || []).map((u) => u.id);
        // Check if already in SOS Contacts
        if (currentSOSContacts.includes(userToAddId)) {
            ctx.status = 400;
            return { error: "User is already in your SOS contacts" };
        }
        // Verify user to add exists
        const userToAdd = await strapi.db.query("api::auth-user.auth-user").findOne({
            where: { id: userToAddId },
            select: ["id", "name", "handle"],
        });
        if (!userToAdd) {
            ctx.status = 404;
            return { error: "User not found" };
        }
        // Add to SOS Contacts
        const newSOSContacts = [...currentSOSContacts, userToAddId];
        await strapi.db.query("api::auth-user.auth-user").update({
            where: { id: userId },
            data: { sos_contacts: newSOSContacts },
        });
        return { success: true, added: userToAdd };
    },
    /**
     * Remove a user from SOS Contacts
     */
    async removeFromSOSContacts(ctx) {
        const userId = ctx.params.id;
        const userToRemoveId = parseInt(ctx.params.userToRemoveId);
        // Get current SOS Contacts
        const currentUser = await strapi.db.query("api::auth-user.auth-user").findOne({
            where: { id: userId },
            populate: {
                sos_contacts: { select: ["id"] },
            },
        });
        const currentSOSContacts = ((currentUser === null || currentUser === void 0 ? void 0 : currentUser.sos_contacts) || []).map((u) => u.id);
        // Check if user is in SOS Contacts
        if (!currentSOSContacts.includes(userToRemoveId)) {
            ctx.status = 400;
            return { error: "User is not in your SOS contacts" };
        }
        // Remove from SOS Contacts
        const newSOSContacts = currentSOSContacts.filter((id) => id !== userToRemoveId);
        await strapi.db.query("api::auth-user.auth-user").update({
            where: { id: userId },
            data: { sos_contacts: newSOSContacts },
        });
        return { success: true, removed: userToRemoveId };
    },
}));
