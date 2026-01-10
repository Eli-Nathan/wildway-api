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
  await strapi.plugins["email"].services.email.send({
    to: address,
    from: "wildway <wildway.app@gmail.com>",
    replyTo: "wildway.app@gmail.com",
    subject,
    text,
    html,
  });
};

export default sendEmail;
