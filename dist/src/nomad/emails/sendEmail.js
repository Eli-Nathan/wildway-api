"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sendEmail = async ({ strapi, subject, address, text, html, }) => {
    try {
        strapi.log.info(`Sending email to ${address} with subject: ${subject}`);
        await strapi.plugin("email").service("email").send({
            to: address,
            from: "wildway <wildway.app@gmail.com>",
            replyTo: "wildway.app@gmail.com",
            subject,
            text,
            html,
        });
        strapi.log.info(`Email sent successfully to ${address}`);
    }
    catch (error) {
        strapi.log.error(`Failed to send email to ${address}:`, error);
        throw error;
    }
};
exports.default = sendEmail;
