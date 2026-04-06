"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resend_1 = require("resend");
const resend = new resend_1.Resend(process.env.RENSEND_API_KEY);
const sendEmail = async ({ strapi, subject, address, text, html, }) => {
    try {
        strapi.log.info(`Sending email via Resend to ${address} with subject: ${subject}`);
        const { data, error } = await resend.emails.send({
            from: "Wildway <support@wildway.app>",
            to: address,
            replyTo: "support@wildway.app",
            subject,
            text,
            html,
        });
        if (error) {
            throw error;
        }
        strapi.log.info(`Email sent successfully to ${address}${data ? `. ID: ${data.id}` : ""}`);
    }
    catch (error) {
        strapi.log.error(`Failed to send email to ${address}:`, error);
        throw error;
    }
};
exports.default = sendEmail;
