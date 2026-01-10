"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/search",
            handler: "search.globalSearch",
        },
        {
            method: "GET",
            path: "/v2/search",
            handler: "search.globalSearchWithOSM",
        },
    ],
};
exports.default = config;
