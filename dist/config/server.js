"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ env }) => ({
    host: env("HOST", "0.0.0.0"),
    port: env.int("PORT", 1337),
    app: {
        keys: env.array("APP_KEYS", [
            "toBeModified1",
            "toBeModified2",
        ]),
    },
    admin: {
        auth: {
            secret: env("ADMIN_JWT_SECRET", "65f4b02a3af08d35a935d4dbbc18680a"),
        },
    },
});
