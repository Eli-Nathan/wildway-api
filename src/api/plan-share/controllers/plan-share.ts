import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::plan-share.plan-share",
  ({ strapi }) => ({
    async create(ctx) {
      const requestData = ctx.request.body?.data || {};

      const tripPlanId =
        typeof requestData.tripPlan === "object"
          ? requestData.tripPlan?.id
          : requestData.tripPlan;

      const sharedWithId =
        typeof requestData.sharedWith === "object"
          ? requestData.sharedWith?.id
          : requestData.sharedWith;

      const share = await strapi.documents("api::plan-share.plan-share").create({
        data: {
          tripPlan: tripPlanId,
          sharedWith: sharedWithId || null,
          invitedEmail: requestData.invitedEmail || null,
          invitedVia: requestData.invitedVia || "username",
          status: requestData.status || "pending",
          permission: requestData.permission || "view",
          notifyCheckins: requestData.notifyCheckins ?? true,
          notifyOverdue: requestData.notifyOverdue ?? true,
        },
        populate: {
          tripPlan: true,
          sharedWith: true,
        },
      });

      return {
        data: {
          id: share.id,
          documentId: share.documentId,
          attributes: share,
        },
        meta: {},
      };
    },
  })
);
