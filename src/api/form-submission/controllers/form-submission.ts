// @ts-nocheck
import { factories } from "@strapi/strapi";
import { sendEntryToSlack } from "../../../wildway/slack";

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
        // Strapi 5: Use db.query directly (accepts simple IDs for relations)
        const submission = await strapi.db.query("api::form-submission.form-submission").create({
          data: {
            data: requestBody.data,
            form: ctx.params.id,
          },
        });

        const result = {
          data: {
            id: submission.id,
            attributes: submission,
          },
          meta: {},
        };
        await sendEntryToSlack(result, "form", ctx);
        return result;
      }
      ctx.status = 400;
      return {
        status: 400,
        message: "No data received",
      };
    },
  })
);
