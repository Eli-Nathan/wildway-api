"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/featured",
            handler: "featured.find",
            config: {
                auth: false,
            },
        },
    ],
};
exports.default = config;
