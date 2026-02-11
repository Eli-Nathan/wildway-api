"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/reviews",
            handler: "review.find",
            config: {
                middlewares: ["api::review.populate-reviews"],
            },
        },
        {
            method: "POST",
            path: "/reviews",
            handler: "review.create",
            config: {
                auth: false,
                middlewares: ["api::review.populate-reviews"],
                policies: ["global::firebase-authed", "global::set-owner"],
            },
        },
        {
            method: "DELETE",
            path: "/reviews/:id",
            handler: "review.delete",
            config: {
                auth: false,
                middlewares: ["api::review.populate-reviews"],
                policies: ["global::firebase-authed", "global::is-owner"],
            },
        },
    ],
};
exports.default = config;
