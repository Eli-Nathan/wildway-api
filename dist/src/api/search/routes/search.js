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
        {
            method: "GET",
            path: "/search/check-similar",
            handler: "search.checkSimilarSites",
            config: {
                auth: false,
                policies: [],
                middlewares: [],
            },
        },
        {
            method: "GET",
            path: "/search/fuzzy",
            handler: "search.fuzzySearch",
            config: {
                auth: false,
                policies: [],
                middlewares: [],
            },
        },
    ],
};
exports.default = config;
