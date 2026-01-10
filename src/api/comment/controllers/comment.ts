// @ts-nocheck
import { factories } from "@strapi/strapi";
import { sendEntryToSlack } from "../../../nomad/slack";

interface StrapiContext {
  request: {
    body: Record<string, unknown>;
  };
  params: {
    id?: string;
  };
}

export default factories.createCoreController(
  "api::comment.comment",
  ({ strapi }) => ({
    async create(ctx: StrapiContext) {
      // @ts-expect-error - Strapi core controller method
      const comment = await super.create(ctx);
      await sendEntryToSlack(comment, "comment", ctx);
      // @ts-expect-error - Strapi core controller method
      return this.sanitizeOutput(comment, ctx);
    },
  })
);
