import { factories } from "@strapi/strapi";
import { createNotification } from "../../../wildway/notifications/notificationService";
import getEmailTemplate from "../../../wildway/emails/getEmailTemplate";

const getCheckinEmailBody = (
  userName: string,
  planName: string,
  stopName: string
): string => `
<h3 style="Margin:0;line-height:34px;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#f45b69">
  Check-in Update
</h3>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <strong><b>${userName}</b></strong> checked in at <strong><b>${stopName}</b></strong> on their trip plan "<strong><b>${planName}</b></strong>".
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  Open the <span style="color:#F45B69">wildway</span> app to see their progress.
</p>
`;

export default factories.createCoreController(
  "api::plan-checkin.plan-checkin",
  ({ strapi }) => ({
    async create(ctx) {
      const requestData = ctx.request.body?.data || {};
      const currentUser = ctx.state.user;

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

      // Notify shared users who have notifyCheckins enabled
      try {
        const plan = await strapi.db
          .query("api::trip-plan.trip-plan")
          .findOne({
            where: { id: tripPlanId },
            populate: {
              stops: { populate: { site: true } },
              shares: { populate: { sharedWith: true } },
              owner: true,
            },
          });

        if (plan?.shares?.length) {
          const ownerName =
            plan.owner?.name || plan.owner?.handle || currentUser.name || "Someone";
          const stopName =
            plan.stops?.[requestData.stopIndex]?.site?.title ||
            `Stop ${(requestData.stopIndex ?? 0) + 1}`;

          const emailBody = getCheckinEmailBody(ownerName, plan.name, stopName);

          for (const share of plan.shares) {
            if (
              share.status === "accepted" &&
              share.notifyCheckins !== false &&
              share.sharedWith?.id
            ) {
              await createNotification(strapi, {
                recipientId: share.sharedWith.id,
                type: "plan_shared",
                title: "Check-in Update",
                message: `${ownerName} checked in at ${stopName} on "${plan.name}".`,
                relatedEntityType: "plan_share",
                relatedEntityId: share.id,
                metadata: {
                  tripPlanId,
                  planName: plan.name,
                  stopName,
                  checkinId: checkin.id,
                },
                emailContent: {
                  subject: `${ownerName} checked in at ${stopName} on Wildway`,
                  text: `${ownerName} checked in at ${stopName} on their trip plan "${plan.name}". Open the Wildway app to see their progress.`,
                  html: getEmailTemplate(emailBody),
                },
              });
            }
          }
        }
      } catch (err) {
        strapi.log.error("Failed to send check-in notifications:", err);
      }

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
