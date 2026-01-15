"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/edit-requests",
            handler: "edit-request.find",
            config: {
                auth: false,
                middlewares: ["api::edit-request.populate-edits"],
                policies: ["global::firebase-authed", "global::is-owner"],
            },
        },
        {
            method: "GET",
            path: "/edit-requests/:id",
            handler: "edit-request.findOne",
            config: {
                auth: false,
                middlewares: ["api::edit-request.populate-edits"],
                policies: ["global::firebase-authed", "global::is-owner"],
            },
        },
        {
            method: "POST",
            path: "/edit-requests",
            handler: "edit-request.create",
            config: {
                auth: false,
                middlewares: ["api::edit-request.populate-edits"],
                policies: ["global::firebase-authed", "global::set-owner"],
            },
        },
    ],
};
exports.default = config;
