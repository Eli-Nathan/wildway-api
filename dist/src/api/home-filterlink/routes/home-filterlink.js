"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/home-filterlinks",
            handler: "home-filterlink.find",
            config: {
                middlewares: ["api::home-filterlink.populate-filterlinks"],
            },
        },
        {
            method: "GET",
            path: "/home-filterlinks/:id",
            handler: "home-filterlink.findOne",
            config: {
                middlewares: ["api::home-filterlink.populate-filterlinks"],
            },
        },
    ],
};
exports.default = config;
