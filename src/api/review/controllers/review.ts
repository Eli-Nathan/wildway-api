// @ts-nocheck
import { factories } from "@strapi/strapi";
import { sendEntryToSlack } from "../../../nomad/slack";

interface StrapiContext {
  request: {
    body: {
      data?: {
        title?: string;
        review?: string;
        rating?: number;
        site?: number;
        owner?: number;
        image?: number[];
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
  status?: number;
  body?: any;
}

export default factories.createCoreController(
  "api::review.review",
  ({ strapi }) => ({
    async findBySite(ctx) {
      const { siteId } = ctx.params;
      const { page = 1, pageSize = 5 } = ctx.query;

      const pageNum = parseInt(page as string, 10);
      const pageSizeNum = parseInt(pageSize as string, 10);

      const [reviews, total] = await Promise.all([
        strapi.db.query("api::review.review").findMany({
          where: {
            site: siteId,
            status: "complete",
          },
          populate: {
            owner: {
              populate: ['profile_pic'],
            },
            image: true,
          },
          orderBy: { createdAt: "desc" },
          limit: pageSizeNum,
          offset: (pageNum - 1) * pageSizeNum,
        }),
        strapi.db.query("api::review.review").count({
          where: {
            site: siteId,
            status: "complete",
          },
        }),
      ]);

      // Set body directly to avoid Strapi's response transformation
      ctx.body = {
        data: reviews,
        meta: {
          pagination: {
            page: pageNum,
            pageSize: pageSizeNum,
            pageCount: Math.ceil(total / pageSizeNum),
            total,
          },
        },
      };
    },

    async findByUser(ctx) {
      const { userId } = ctx.params;
      const { page = 1, pageSize = 5 } = ctx.query;

      const pageNum = parseInt(page as string, 10);
      const pageSizeNum = parseInt(pageSize as string, 10);

      const [reviews, total] = await Promise.all([
        strapi.db.query("api::review.review").findMany({
          where: {
            owner: userId,
            status: "complete",
          },
          populate: {
            site: {
              select: ["id", "title", "uid"],
            },
            image: true,
          },
          orderBy: { createdAt: "desc" },
          limit: pageSizeNum,
          offset: (pageNum - 1) * pageSizeNum,
        }),
        strapi.db.query("api::review.review").count({
          where: {
            owner: userId,
            status: "complete",
          },
        }),
      ]);

      ctx.body = {
        data: reviews,
        meta: {
          pagination: {
            page: pageNum,
            pageSize: pageSizeNum,
            pageCount: Math.ceil(total / pageSizeNum),
            total,
          },
        },
      };
    },

    async create(ctx: StrapiContext) {
      const requestData = ctx.request.body?.data || {};
      const userId = ctx.state.user?.id || requestData.owner;
      const siteId = requestData.site;

      // Validate rating is between 1 and 5
      if (!requestData.rating || requestData.rating < 1 || requestData.rating > 5) {
        ctx.status = 400;
        ctx.body = {
          error: "Rating must be between 1 and 5",
        };
        return;
      }

      // Check for existing review by this user for this site (unique constraint)
      const existingReview = await strapi.db.query("api::review.review").findOne({
        where: {
          owner: userId,
          site: siteId,
          status: { $ne: "rejected" },
        },
      });

      if (existingReview) {
        ctx.status = 409;
        ctx.body = {
          error: "You have already reviewed this site. You can delete your existing review and create a new one.",
        };
        return;
      }

      // Create the review
      const review = await strapi.db.query("api::review.review").create({
        data: {
          title: requestData.title,
          review: requestData.review,
          rating: requestData.rating,
          site: siteId,
          owner: userId,
          image: requestData.image?.[0] || null,
        },
      });

      await sendEntryToSlack({ data: review }, "review", ctx);

      // Return in Strapi 4 format
      return {
        data: {
          id: review.id,
          attributes: review,
        },
        meta: {},
      };
    },
  })
);
