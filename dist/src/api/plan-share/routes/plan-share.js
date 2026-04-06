"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/plan-shares",
            handler: "plan-share.find",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "global::is-plan-owner"],
            },
        },
        {
            method: "GET",
            path: "/plan-shares/:id",
            handler: "plan-share.findOne",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "global::is-plan-owner"],
            },
        },
        {
            method: "POST",
            path: "/plan-shares",
            handler: "plan-share.create",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "global::is-plan-owner"],
            },
        },
        {
            method: "PUT",
            path: "/plan-shares/:id",
            handler: "plan-share.update",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "global::is-plan-owner"],
            },
        },
        {
            method: "DELETE",
            path: "/plan-shares/:id",
            handler: "plan-share.delete",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "global::is-plan-owner"],
            },
        },
    ],
};
exports.default = config;
