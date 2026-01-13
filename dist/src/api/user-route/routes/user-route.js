"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/user-routes",
            handler: "user-route.find",
            config: {
                middlewares: ["api::user-route.populate-user-routes"],
                policies: ["plugin::users-permissions.isAuthed", "global::is-owner"],
            },
        },
        {
            method: "GET",
            path: "/user-routes/public",
            handler: "user-route.findPublic",
            config: {
                middlewares: ["api::user-route.populate-user-routes"],
                policies: ["plugin::users-permissions.isAuthed"],
            },
        },
        {
            method: "GET",
            path: "/user-routes/user/:id",
            handler: "user-route.findRoutesByUserId",
            config: {
                middlewares: ["api::user-route.populate-user-routes"],
                policies: ["plugin::users-permissions.isAuthed"],
            },
        },
        {
            method: "GET",
            path: "/user-routes/:id",
            handler: "user-route.findOne",
            config: {
                middlewares: ["api::user-route.populate-user-routes"],
                policies: ["plugin::users-permissions.isAuthed", "global::is-owner"],
            },
        },
        {
            method: "GET",
            path: "/user-routes/public/:id",
            handler: "user-route.findOnePublic",
            config: {
                middlewares: ["api::user-route.populate-user-routes"],
                policies: ["plugin::users-permissions.isAuthed"],
            },
        },
        {
            method: "POST",
            path: "/user-routes",
            handler: "user-route.create",
            config: {
                middlewares: ["api::user-route.populate-user-routes"],
                policies: ["plugin::users-permissions.isAuthed", "global::set-owner"],
            },
        },
        {
            method: "PUT",
            path: "/user-routes/:id",
            handler: "user-route.update",
            config: {
                middlewares: ["api::user-route.populate-user-routes"],
                policies: ["plugin::users-permissions.isAuthed", "global::is-owner"],
            },
        },
        {
            method: "DELETE",
            path: "/user-routes/:id",
            handler: "user-route.delete",
            config: {
                middlewares: ["api::user-route.populate-user-routes"],
                policies: ["plugin::users-permissions.isAuthed", "global::is-owner"],
            },
        },
    ],
};
exports.default = config;
