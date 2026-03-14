import { Resend } from "resend";
import type { StrapiInstance } from "../../types/strapi";

const resend = new Resend(process.env.RENSEND_API_KEY);

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
    strapi.log.info(`Sending email via Resend to ${address} with subject: ${subject}`);
    const { data, error } = await resend.emails.send({
      from: "Wildway <support@wildway.app>",
      to: address,
      reply_to: "support@wildway.app",
      subject,
      text,
      html,
    });

    if (error) {
      throw error;
    }

    strapi.log.info(`Email sent successfully to ${address}${data ? `. ID: ${data.id}` : ""}`);
  } catch (error) {
    strapi.log.error(`Failed to send email to ${address}:`, error);
    throw error;
  }
};

export default sendEmail;
