"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "PUT",
            path: "/notifications/:id/read",
            handler: "notification.markAsRead",
            config: {
                auth: false,
                policies: ["global::firebase-authed"],
            },
        },
    ],
};
exports.default = config;
