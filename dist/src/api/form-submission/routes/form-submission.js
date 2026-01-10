"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/form-submissions",
            handler: "form-submission.find",
        },
        {
            method: "GET",
            path: "/form-submissions/:id",
            handler: "form-submission.findOne",
        },
        {
            method: "POST",
            path: "/form-submissions/:id",
            handler: "form-submission.create",
        },
    ],
};
exports.default = config;
