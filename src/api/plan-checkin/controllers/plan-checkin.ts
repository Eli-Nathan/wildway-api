import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::plan-checkin.plan-checkin",
  ({ strapi }) => ({
    async create(ctx) {
      const requestData = ctx.request.body?.data || {};

      const tripPlanId =
        typeof requestData.tripPlan === "object"
          ? requestData.tripPlan?.id
          : requestData.tripPlan;

      const checkin = await strapi
        .documents("api::plan-checkin.plan-checkin")
        .create({
          data: {
            tripPlan: tripPlanId,
            stopIndex: requestData.stopIndex,
            checkinTime: requestData.checkinTime,
            checkoutTime: requestData.checkoutTime || null,
            type: requestData.type || "manual",
            location: requestData.location || null,
            note: requestData.note || null,
          },
          populate: {
            tripPlan: true,
          },
        });

      return {
        data: {
          id: checkin.id,
          documentId: checkin.documentId,
          attributes: checkin,
        },
        meta: {},
      };
    },
  })
);
