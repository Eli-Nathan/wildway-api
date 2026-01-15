"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/comments",
            handler: "comment.find",
            config: {
                middlewares: ["api::comment.populate-comments"],
            },
        },
        {
            method: "POST",
            path: "/comments",
            handler: "comment.create",
            config: {
                auth: false,
                middlewares: ["api::comment.populate-comments"],
                policies: ["global::firebase-authed", "global::set-owner"],
            },
        },
        {
            method: "DELETE",
            path: "/comments/:id",
            handler: "comment.delete",
            config: {
                auth: false,
                middlewares: ["api::comment.populate-comments"],
                policies: ["global::firebase-authed", "global::is-owner"],
            },
        },
    ],
};
exports.default = config;
