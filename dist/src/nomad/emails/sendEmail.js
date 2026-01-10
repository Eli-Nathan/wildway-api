"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sendEmail = async ({ strapi, subject, address, text, html, }) => {
    await strapi.plugins["email"].services.email.send({
        to: address,
        from: "wildway <wildway.app@gmail.com>",
        replyTo: "wildway.app@gmail.com",
        subject,
        text,
        html,
    });
};
exports.default = sendEmail;
