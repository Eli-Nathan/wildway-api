"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "POST",
            path: "/remote-config/enable-review-flag",
            handler: "remote-config.enableReviewFlag",
            config: {
                auth: false,
                policies: [], // Admin key validated in controller
            },
        },
        {
            method: "POST",
            path: "/remote-config/disable-review-flag",
            handler: "remote-config.disableReviewFlag",
            config: {
                auth: false,
                policies: [], // Admin key validated in controller
            },
        },
    ],
};
exports.default = config;
