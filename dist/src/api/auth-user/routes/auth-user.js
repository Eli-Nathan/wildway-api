"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/auth-users/me",
            handler: "auth-user.findMe",
            config: {
                policies: ["plugin::users-permissions.isAuthed", "is-user"],
            },
        },
        {
            method: "GET",
            path: "/auth-users/profile/:id",
            handler: "auth-user.getProfile",
            config: {
                policies: ["plugin::users-permissions.isAuthed"],
            },
        },
        {
            method: "GET",
            path: "/auth-users/explore",
            handler: "auth-user.getHighProfileUsers",
            config: {
                policies: ["plugin::users-permissions.isAuthed"],
            },
        },
        {
            method: "GET",
            path: "/auth-users/subscription",
            handler: "auth-user.getSubscription",
            config: {
                policies: ["plugin::users-permissions.isAuthed", "is-user"],
            },
        },
        {
            method: "DELETE",
            path: "/auth-users/me",
            handler: "auth-user.delete",
            config: {
                policies: ["plugin::users-permissions.isAuthed", "is-user"],
            },
        },
        {
            method: "POST",
            path: "/auth-users",
            handler: "auth-user.create",
            config: {
                policies: ["plugin::users-permissions.isAuthed", "set-user"],
            },
        },
        {
            method: "PUT",
            path: "/auth-users/favourites/:id",
            handler: "auth-user.updateFavourites",
            config: {
                policies: ["plugin::users-permissions.isAuthed", "is-user"],
            },
        },
        {
            method: "PUT",
            path: "/auth-users/updateSavedRoutes",
            handler: "auth-user.updateSavedRoutes",
            config: {
                policies: ["plugin::users-permissions.isAuthed", "is-user"],
            },
        },
        {
            method: "PUT",
            path: "/auth-users/edit-profile",
            handler: "auth-user.editProfile",
            config: {
                policies: ["plugin::users-permissions.isAuthed", "is-user"],
            },
        },
        {
            method: "PUT",
            path: "/auth-users/me/verifyEmail",
            handler: "auth-user.verifyEmail",
            config: {
                policies: ["plugin::users-permissions.isAuthed", "is-user"],
            },
        },
    ],
};
exports.default = config;
