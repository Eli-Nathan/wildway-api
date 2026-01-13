"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ env }) => {
    return {
        upload: {
            config: {
                provider: "cloudinary",
                providerOptions: {
                    cloud_name: env("CLOUDINARY_NAME"),
                    api_key: env("CLOUDINARY_KEY"),
                    api_secret: env("CLOUDINARY_SECRET"),
                },
                actionOptions: {
                    upload: "hnafqp5p",
                },
            },
        },
        email: {
            config: {
                provider: "strapi-provider-email-smtp",
                providerOptions: {
                    host: "smtp.gmail.com",
                    port: 465,
                    secure: true,
                    username: "wildway.app@gmail.com",
                    password: env("WILDWAY_GMAIL_PASSWORD"),
                    rejectUnauthorized: true,
                    requireTLS: true,
                    connectionTimeout: 1,
                },
            },
            settings: {
                defaultFrom: "wildway.app@gmail.com",
                defaultReplyTo: "wildway.app@gmail.com",
            },
        },
        moderator: {
            enabled: true,
            resolve: "./src/plugins/moderator",
        },
        "verify-user-email": {
            enabled: true,
            resolve: "./src/plugins/verify-user-email",
        },
        "content-export-import": {
            enabled: true,
            resolve: "./src/plugins/content-export-import",
        },
    };
};
