import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::plan-share.plan-share",
  ({ strapi }) => ({
    async create(ctx) {
      const requestData = ctx.request.body?.data || {};
      const currentUser = ctx.state.user;

      const tripPlanId =
        typeof requestData.tripPlan === "object"
          ? requestData.tripPlan?.id
          : requestData.tripPlan;

      const sharedWithId =
        typeof requestData.sharedWith === "object"
          ? requestData.sharedWith?.id
          : requestData.sharedWith;

      // Check if the recipient is already an SOS contact — auto-accept if so
      let status = requestData.status || "pending";
      if (sharedWithId && currentUser?.id) {
        const owner = await strapi.db
          .query("api::auth-user.auth-user")
          .findOne({
            where: { id: currentUser.id },
            populate: ["sos_contacts"],
          });

        const isSOSContact = (owner?.sos_contacts || []).some(
          (contact: any) => contact.id === Number(sharedWithId)
        );

        if (isSOSContact) {
          status = "accepted";
        }
      }

      const share = await strapi
        .documents("api::plan-share.plan-share")
        .create({
          data: {
            tripPlan: tripPlanId,
            sharedWith: sharedWithId || null,
            invitedEmail: requestData.invitedEmail || null,
            invitedVia: requestData.invitedVia || "username",
            status,
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
