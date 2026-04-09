import { factories } from "@strapi/strapi";
import { createNotification } from "../../../wildway/notifications/notificationService";
import getEmailTemplate from "../../../wildway/emails/getEmailTemplate";

const getPlanSharedEmailBody = (
  sharerName: string,
  planName: string,
  isAutoAccepted: boolean
): string => `
<h3 style="Margin:0;line-height:34px;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#f45b69">
  Trip Plan Shared
</h3>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <strong><b>${sharerName}</b></strong> has shared a trip plan "<strong><b>${planName}</b></strong>" with you on <span style="color:#F45B69">wildway</span>.
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  ${
    isAutoAccepted
      ? "As their SOS contact, you'll receive check-in notifications and overdue alerts for this trip."
      : "Open the app to view and accept this shared plan."
  }
</p>
`;

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
      const owner = await strapi.db
        .query("api::auth-user.auth-user")
        .findOne({
          where: { id: currentUser.id },
          populate: ["sos_contacts"],
        });

      if (sharedWithId && currentUser?.id) {
        const isSOSContact = (owner?.sos_contacts || []).some(
          (contact: any) => contact.id === Number(sharedWithId)
        );

        if (isSOSContact) {
          status = "accepted";
        }
      }

      // Get the trip plan name for the notification
      const tripPlan = await strapi.db
        .query("api::trip-plan.trip-plan")
        .findOne({ where: { id: tripPlanId } });

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

      // Notify the recipient
      if (sharedWithId) {
        const sharerName =
          owner?.name || owner?.handle || currentUser.name || "Someone";
        const planName = tripPlan?.name || "a trip plan";
        const isAutoAccepted = status === "accepted";

        const emailBody = getPlanSharedEmailBody(
          sharerName,
          planName,
          isAutoAccepted
        );

        await createNotification(strapi, {
          recipientId: Number(sharedWithId),
          type: "plan_shared",
          title: "Trip Plan Shared",
          message: `${sharerName} shared "${planName}" with you.`,
          relatedEntityType: "plan_share",
          relatedEntityId: share.id,
          metadata: {
            tripPlanId,
            planName,
            sharerName,
            status,
          },
          emailContent: {
            subject: `${sharerName} shared a trip plan with you on Wildway`,
            text: `${sharerName} has shared a trip plan "${planName}" with you on Wildway. ${isAutoAccepted ? "As their SOS contact, you'll receive check-in notifications and overdue alerts." : "Open the app to view and accept this shared plan."}`,
            html: getEmailTemplate(emailBody),
          },
        });
      }

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
