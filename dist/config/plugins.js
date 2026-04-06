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
            enabled: true,
            config: {
                provider: "nodemailer",
                providerOptions: {
                    host: "smtp.resend.com",
                    port: 465,
                    secure: true,
                    auth: {
                        user: "resend",
                        pass: env("RENSEND_API_KEY"),
                    },
                },
                settings: {
                    defaultFrom: "Wildway <support@wildway.app>",
                    defaultReplyTo: "support@wildway.app",
                },
            },
        },
        // Custom plugins - moderator re-enabled after Strapi 5 fixes
        moderator: {
            enabled: true,
            resolve: "./src/plugins/moderator",
        },
        // "verify-user-email": {
        //   enabled: true,
        //   resolve: "./src/plugins/verify-user-email",
        // },
        // "content-export-import": {
        //   enabled: true,
        //   resolve: "./src/plugins/content-export-import",
        // },
    };
};
