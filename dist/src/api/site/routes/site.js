"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/sites",
            handler: "site.find",
            config: {
                middlewares: ["api::site.populate-sites"],
            },
        },
        {
            method: "GET",
            path: "/sites/search",
            handler: "site.search",
            config: {
                middlewares: ["api::site.populate-sites"],
            },
        },
        {
            method: "GET",
            path: "/sites/recent",
            handler: "site.findRecent",
            config: {
                middlewares: ["api::site.populate-sites"],
            },
        },
        {
            method: "GET",
            path: "/sites/:id",
            handler: "site.findOne",
            config: {
                middlewares: ["api::site.populate-site"],
            },
        },
        {
            method: "GET",
            path: "/sites/uid/:uid",
            handler: "site.findOneByUID",
            config: {
                middlewares: ["api::site.populate-site"],
            },
        },
    ],
};
exports.default = config;
