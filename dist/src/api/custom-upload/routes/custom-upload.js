"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: "POST",
            path: "/custom-upload",
            handler: "custom-upload.upload",
            config: {
                policies: ["global::firebase-authed"],
            },
        },
    ],
};
