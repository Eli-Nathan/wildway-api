"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/facilities",
            handler: "facility.find",
            config: {
                middlewares: ["api::facility.populate-facilities"],
            },
        },
    ],
};
exports.default = config;
