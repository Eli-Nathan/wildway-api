// @ts-nocheck
import { factories } from "@strapi/strapi";
import { sendEntryToSlack } from "../../../nomad/slack";

interface StrapiContext {
  request: {
    body: {
      data?: {
        category?: string;
        description?: string;
        contentType?: string;
        contentId?: number;
        contentTitle?: string;
        reporter?: number;
      };
    };
  };
  params: {
    id?: string;
  };
  state: {
    user?: {
      id: number;
      name?: string;
      email?: string;
    };
  };
  badRequest: (message: string) => void;
}

export default factories.createCoreController(
  "api::content-report.content-report",
  ({ strapi }) => ({
    async create(ctx: StrapiContext) {
      const requestData = ctx.request.body?.data || {};

      // Validate required fields
      if (!requestData.category) {
        return ctx.badRequest("Category is required");
      }
      if (!requestData.description) {
        return ctx.badRequest("Description is required");
      }
      if (!requestData.contentType) {
        return ctx.badRequest("Content type is required");
      }
      if (!requestData.contentId) {
        return ctx.badRequest("Content ID is required");
      }

      // Validate word count (max 200 words)
      const description = requestData.description || "";
      const wordCount = description.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
      if (wordCount > 200) {
        return ctx.badRequest("Description exceeds 200 word limit");
      }

      // Create the content report
      const report = await strapi.db.query("api::content-report.content-report").create({
        data: {
          category: requestData.category,
          description: requestData.description,
          contentType: requestData.contentType,
          contentId: requestData.contentId,
          contentTitle: requestData.contentTitle,
          reporter: ctx.state.user?.id,
          moderation_status: "submitted",
        },
      });

      // Send Slack notification
      await sendEntryToSlack({ data: report }, "contentReport", ctx);

      // Return in Strapi 4 format for backwards compatibility
      return {
        data: {
          id: report.id,
          attributes: report,
        },
        meta: {},
      };
    },
  })
);
