"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/nomad-routes",
            handler: "nomad-route.find",
            config: {
                middlewares: ["api::nomad-route.populate-nomad-routes"],
            },
        },
        {
            method: "GET",
            path: "/nomad-routes/:id",
            handler: "nomad-route.findOne",
            config: {
                middlewares: ["api::nomad-route.populate-nomad-routes"],
            },
        },
        {
            method: "GET",
            path: "/nomad-routes/uid/:slug",
            handler: "nomad-route.findOneByUID",
            config: {
                middlewares: ["api::nomad-route.populate-nomad-routes"],
            },
        },
    ],
};
exports.default = config;
