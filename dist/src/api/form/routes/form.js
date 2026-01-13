"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/forms",
            handler: "form.find",
        },
        {
            method: "GET",
            path: "/forms/:id",
            handler: "form.findOne",
        },
    ],
};
exports.default = config;
