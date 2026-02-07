"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        // Public endpoints - browse all lists
        {
            method: "GET",
            path: "/site-lists",
            handler: "site-list.find",
            config: {
                auth: false,
            },
        },
        // Static paths MUST come before parameterized paths
        {
            method: "GET",
            path: "/site-lists/my-lists",
            handler: "site-list.findMyLists",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "api::auth-user.is-user"],
            },
        },
        {
            method: "GET",
            path: "/site-lists/saved",
            handler: "site-list.findSavedLists",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "api::auth-user.is-user"],
            },
        },
        {
            method: "GET",
            path: "/site-lists/uid/:uid",
            handler: "site-list.findOneBySlug",
            config: {
                auth: false,
            },
        },
        // Parameterized paths come after static paths
        {
            method: "GET",
            path: "/site-lists/:id",
            handler: "site-list.findOne",
            config: {
                auth: false,
            },
        },
        // User list CRUD (requires auth)
        {
            method: "POST",
            path: "/site-lists",
            handler: "site-list.create",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "global::set-owner"],
            },
        },
        {
            method: "PUT",
            path: "/site-lists/:id/save",
            handler: "site-list.toggleSave",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "api::auth-user.is-user"],
            },
        },
        {
            method: "PUT",
            path: "/site-lists/:id",
            handler: "site-list.update",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "global::is-owner"],
            },
        },
        // Admin update for admin-owned lists (uses X-Admin-Secret header)
        {
            method: "PUT",
            path: "/site-lists/:id/admin",
            handler: "site-list.adminUpdate",
            config: {
                auth: false,
                policies: ["global::is-admin"],
            },
        },
        {
            method: "DELETE",
            path: "/site-lists/:id",
            handler: "site-list.delete",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "global::is-owner"],
            },
        },
    ],
};
exports.default = config;
