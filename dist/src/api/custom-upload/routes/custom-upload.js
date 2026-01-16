"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: "POST",
            path: "/custom-upload",
            handler: "custom-upload.upload",
            config: {
                // No policies - auth handled directly in controller
                policies: [],
                auth: false, // Disable Strapi's default auth
            },
        },
    ],
};
