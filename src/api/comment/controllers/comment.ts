// @ts-nocheck
import { factories } from "@strapi/strapi";
import { sendEntryToSlack } from "../../../nomad/slack";

interface StrapiContext {
  request: {
    body: {
      data?: {
        title?: string;
        comment?: string;
        site?: number;
        owner?: number;
      };
    };
  };
  params: {
    id?: string;
  };
  state: {
    user?: {
      id: number;
    };
  };
}

export default factories.createCoreController(
  "api::comment.comment",
  ({ strapi }) => ({
    async create(ctx: StrapiContext) {
      const requestData = ctx.request.body?.data || {};

      // Strapi 5: Use db.query directly (accepts simple IDs for relations)
      const comment = await strapi.db.query("api::comment.comment").create({
        data: {
          title: requestData.title,
          comment: requestData.comment,
          site: requestData.site,
          owner: ctx.state.user?.id || requestData.owner,
        },
      });

      await sendEntryToSlack({ data: comment }, "comment", ctx);

      // Return in Strapi 4 format
      return {
        data: {
          id: comment.id,
          attributes: comment,
        },
        meta: {},
      };
    },
  })
);
