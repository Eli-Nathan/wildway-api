"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        // Static paths MUST come before parameterized paths
        // Get all list progress counts for the user (for browse lists screen)
        {
            method: "GET",
            path: "/site-list-progress/all",
            handler: "site-list-progress.getAllProgress",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "api::auth-user.is-user"],
            },
        },
        // Get which lists a site is completed in (lite endpoint for site page badges)
        {
            method: "GET",
            path: "/site-list-progress/site/:siteId",
            handler: "site-list-progress.getSiteProgress",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "api::auth-user.is-user"],
            },
        },
        // Toggle completion of a site in a list
        {
            method: "PUT",
            path: "/site-list-progress/:listId/toggle/:siteId",
            handler: "site-list-progress.toggleSiteCompletion",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "api::auth-user.is-user"],
            },
        },
        // Get user's progress for a specific list (parameterized - must be last)
        {
            method: "GET",
            path: "/site-list-progress/:listId",
            handler: "site-list-progress.getProgress",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "api::auth-user.is-user"],
            },
        },
    ],
};
exports.default = config;
