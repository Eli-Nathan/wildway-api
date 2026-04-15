"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
const notificationService_1 = require("../../../wildway/notifications/notificationService");
const getEmailTemplate_1 = __importDefault(require("../../../wildway/emails/getEmailTemplate"));
const getPlanSharedEmailBody = (sharerName, planName, isAutoAccepted) => `
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
  ${isAutoAccepted
    ? "As their SOS contact, you'll receive check-in notifications and overdue alerts for this trip."
    : "Open the app to view and accept this shared plan."}
</p>
`;
exports.default = strapi_1.factories.createCoreController("api::plan-share.plan-share", ({ strapi }) => ({
    async create(ctx) {
        var _a, _b, _c, _d, _e;
        const requestData = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || {};
        const currentUser = ctx.state.user;
        const tripPlanId = typeof requestData.tripPlan === "object"
            ? (_b = requestData.tripPlan) === null || _b === void 0 ? void 0 : _b.id
            : requestData.tripPlan;
        const sharedWithId = typeof requestData.sharedWith === "object"
            ? (_c = requestData.sharedWith) === null || _c === void 0 ? void 0 : _c.id
            : requestData.sharedWith;
        // Check if the recipient is already an SOS contact — auto-accept if so
        let status = requestData.status || "pending";
        const owner = await strapi.db
            .query("api::auth-user.auth-user")
            .findOne({
            where: { id: currentUser.id },
            populate: ["sos_contacts"],
        });
        if (sharedWithId && (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id)) {
            const isSOSContact = ((owner === null || owner === void 0 ? void 0 : owner.sos_contacts) || []).some((contact) => contact.id === Number(sharedWithId));
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
                notifyCheckins: (_d = requestData.notifyCheckins) !== null && _d !== void 0 ? _d : true,
                notifyOverdue: (_e = requestData.notifyOverdue) !== null && _e !== void 0 ? _e : true,
            },
            populate: {
                tripPlan: true,
                sharedWith: true,
            },
        });
        // Notify the recipient
        if (sharedWithId) {
            const sharerName = (owner === null || owner === void 0 ? void 0 : owner.name) || (owner === null || owner === void 0 ? void 0 : owner.handle) || currentUser.name || "Someone";
            const planName = (tripPlan === null || tripPlan === void 0 ? void 0 : tripPlan.name) || "a trip plan";
            const isAutoAccepted = status === "accepted";
            const emailBody = getPlanSharedEmailBody(sharerName, planName, isAutoAccepted);
            await (0, notificationService_1.createNotification)(strapi, {
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
                    html: (0, getEmailTemplate_1.default)(emailBody),
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
}));
