import type { StrapiInstance } from "../../types/strapi";

interface SendEmailParams {
  strapi: StrapiInstance;
  subject: string;
  address: string;
  text: string;
  html: string;
}

const sendEmail = async ({
  strapi,
  subject,
  address,
  text,
  html,
}: SendEmailParams): Promise<void> => {
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
  } catch (error) {
    strapi.log.error(`Failed to send email to ${address}:`, error);
    throw error;
  }
};

export default sendEmail;
