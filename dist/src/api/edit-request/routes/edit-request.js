"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/edit-requests",
            handler: "edit-request.find",
            config: {
                middlewares: ["api::edit-request.populate-edits"],
                policies: ["plugin::users-permissions.isAuthed", "global::is-owner"],
            },
        },
        {
            method: "GET",
            path: "/edit-requests/:id",
            handler: "edit-request.findOne",
            config: {
                middlewares: ["api::edit-request.populate-edits"],
                policies: ["plugin::users-permissions.isAuthed", "global::is-owner"],
            },
        },
        {
            method: "POST",
            path: "/edit-requests",
            handler: "edit-request.create",
            config: {
                middlewares: ["api::edit-request.populate-edits"],
                policies: ["plugin::users-permissions.isAuthed", "global::set-owner"],
            },
        },
    ],
};
exports.default = config;
