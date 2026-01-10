// @ts-nocheck
import { factories } from "@strapi/strapi";
import { sendEntryToSlack } from "../../../nomad/slack";

interface StrapiContext {
  request: {
    body: string | { data?: Record<string, unknown> };
  };
  params: {
    id?: string;
  };
  status?: number;
}

export default factories.createCoreController(
  "api::form-submission.form-submission",
  ({ strapi }) => ({
    async create(ctx: StrapiContext) {
      const requestBody = JSON.parse(ctx.request.body as string);
      if (ctx.params.id && requestBody.data) {
        ctx.request.body = {
          data: {
            data: requestBody.data,
            form: ctx.params.id,
          },
        };
        // @ts-expect-error - Strapi core controller method
        const submission = await super.create(ctx);
        // @ts-expect-error - Strapi core controller method
        const sanitized = await this.sanitizeOutput(submission, ctx);
        await sendEntryToSlack(sanitized, "form", ctx);
        return sanitized;
      }
      ctx.status = 400;
      return {
        status: 400,
        message: "No data received",
      };
    },
  })
);
