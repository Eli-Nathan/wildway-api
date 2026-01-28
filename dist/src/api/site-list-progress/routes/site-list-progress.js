"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        // Get user's progress for a specific list
        {
            method: "GET",
            path: "/site-list-progress/:listId",
            handler: "site-list-progress.getProgress",
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
    ],
};
exports.default = config;
