"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ env }) => ({
    transfer: {
        token: {
            salt: env("TRANSFER_TOKEN_SALT"),
        },
    },
    apiToken: {
        salt: env("API_TOKEN_SALT", "d9b0df66ff97a666027e665707b4e3e7"),
    },
    auth: {
        secret: env("ADMIN_JWT_SECRET", "fd45234fab05a783ed7030497c581826"),
    },
});
