"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/reviews/site/:siteId",
            handler: "review.findBySite",
            config: {
                auth: false,
                policies: ["global::firebase-authed"],
            },
        },
        {
            method: "GET",
            path: "/reviews/site/:siteId/public",
            handler: "review.findBySitePublic",
            config: {
                auth: false,
            },
        },
        {
            method: "GET",
            path: "/reviews/user/:userId",
            handler: "review.findByUser",
            config: {
                auth: false,
                policies: ["global::firebase-authed"],
            },
        },
        {
            method: "GET",
            path: "/reviews",
            handler: "review.find",
            config: {
                auth: false,
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
        {
            method: "PUT",
            path: "/reviews/:id/reply",
            handler: "review.addReply",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "api::review.is-site-owner"],
            },
        },
        {
            method: "DELETE",
            path: "/reviews/:id/reply",
            handler: "review.deleteReply",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "api::review.is-site-owner"],
            },
        },
    ],
};
exports.default = config;
