"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/plan-checkins",
            handler: "plan-checkin.find",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "global::is-plan-participant"],
            },
        },
        {
            method: "GET",
            path: "/plan-checkins/:id",
            handler: "plan-checkin.findOne",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "global::is-plan-participant"],
            },
        },
        {
            method: "POST",
            path: "/plan-checkins",
            handler: "plan-checkin.create",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "global::is-plan-participant"],
            },
        },
        {
            method: "PUT",
            path: "/plan-checkins/:id",
            handler: "plan-checkin.update",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "global::is-plan-owner"],
            },
        },
        {
            method: "DELETE",
            path: "/plan-checkins/:id",
            handler: "plan-checkin.delete",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "global::is-plan-owner"],
            },
        },
    ],
};
exports.default = config;
