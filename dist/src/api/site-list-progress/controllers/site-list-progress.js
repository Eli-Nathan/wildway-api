"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController("api::site-list-progress.site-list-progress", ({ strapi }) => ({
    /**
     * Get user's progress for a specific list
     */
    async getProgress(ctx) {
        var _a;
        const listId = parseInt(ctx.params.listId, 10);
        const userId = ctx.state.user.id;
        // Find or create progress record
        let progress = await strapi.db
            .query("api::site-list-progress.site-list-progress")
            .findOne({
            where: {
                user: userId,
                site_list: listId,
            },
            populate: {
                completed_sites: {
                    select: ["id"],
                },
            },
        });
        if (!progress) {
            // Return empty progress if none exists
            return {
                data: {
                    completedSiteIds: [],
                },
            };
        }
        return {
            data: {
                completedSiteIds: ((_a = progress.completed_sites) === null || _a === void 0 ? void 0 : _a.map((s) => s.id)) || [],
            },
        };
    },
    /**
     * Toggle completion of a site in a list
     */
    async toggleSiteCompletion(ctx) {
        var _a;
        const listId = parseInt(ctx.params.listId, 10);
        const siteId = parseInt(ctx.params.siteId, 10);
        const userId = ctx.state.user.id;
        // Find existing progress record
        let progress = await strapi.db
            .query("api::site-list-progress.site-list-progress")
            .findOne({
            where: {
                user: userId,
                site_list: listId,
            },
            populate: {
                completed_sites: {
                    select: ["id"],
                },
            },
        });
        let completedSiteIds = [];
        let isNowCompleted;
        if (!progress) {
            // Create new progress record with this site completed
            progress = await strapi.db
                .query("api::site-list-progress.site-list-progress")
                .create({
                data: {
                    user: userId,
                    site_list: listId,
                    completed_sites: [siteId],
                },
            });
            completedSiteIds = [siteId];
            isNowCompleted = true;
        }
        else {
            // Toggle the site in completed_sites
            const currentCompletedIds = ((_a = progress.completed_sites) === null || _a === void 0 ? void 0 : _a.map((s) => s.id)) || [];
            const isCurrentlyCompleted = currentCompletedIds.includes(siteId);
            if (isCurrentlyCompleted) {
                // Remove from completed
                completedSiteIds = currentCompletedIds.filter((id) => id !== siteId);
                isNowCompleted = false;
            }
            else {
                // Add to completed
                completedSiteIds = [...currentCompletedIds, siteId];
                isNowCompleted = true;
            }
            await strapi.db
                .query("api::site-list-progress.site-list-progress")
                .update({
                where: { id: progress.id },
                data: {
                    completed_sites: completedSiteIds,
                },
            });
        }
        return {
            data: {
                siteId,
                completed: isNowCompleted,
                completedSiteIds,
            },
        };
    },
}));
