"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "POST",
            path: "/content-reports",
            handler: "content-report.create",
            config: {
                auth: false,
                policies: ["global::firebase-authed", "global::set-owner"],
            },
        },
        {
            method: "GET",
            path: "/content-reports",
            handler: "content-report.find",
            config: {
                auth: false,
                policies: ["global::firebase-authed"],
            },
        },
    ],
};
exports.default = config;
