"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
const notificationService_1 = require("../../../wildway/notifications/notificationService");
const getEmailTemplate_1 = __importDefault(require("../../../wildway/emails/getEmailTemplate"));
const getCheckinEmailBody = (userName, planName, stopName) => `
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
const getCheckoutEmailBody = (userName, planName, stopName) => `
<h3 style="Margin:0;line-height:34px;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#f45b69">
  Check-out Update
</h3>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <strong><b>${userName}</b></strong> has checked out from <strong><b>${stopName}</b></strong> on their trip plan "<strong><b>${planName}</b></strong>".
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  They have left this stop safely.
</p>
`;
exports.default = strapi_1.factories.createCoreController("api::plan-checkin.plan-checkin", ({ strapi }) => ({
    async create(ctx) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const requestData = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || {};
        const currentUser = ctx.state.user;
        const tripPlanId = typeof requestData.tripPlan === "object"
            ? (_b = requestData.tripPlan) === null || _b === void 0 ? void 0 : _b.id
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
            if ((_c = plan === null || plan === void 0 ? void 0 : plan.shares) === null || _c === void 0 ? void 0 : _c.length) {
                const ownerName = ((_d = plan.owner) === null || _d === void 0 ? void 0 : _d.name) || ((_e = plan.owner) === null || _e === void 0 ? void 0 : _e.handle) || currentUser.name || "Someone";
                const stopName = ((_h = (_g = (_f = plan.stops) === null || _f === void 0 ? void 0 : _f[requestData.stopIndex]) === null || _g === void 0 ? void 0 : _g.site) === null || _h === void 0 ? void 0 : _h.title) ||
                    `Stop ${((_j = requestData.stopIndex) !== null && _j !== void 0 ? _j : 0) + 1}`;
                const emailBody = getCheckinEmailBody(ownerName, plan.name, stopName);
                for (const share of plan.shares) {
                    if (share.status === "accepted" &&
                        share.notifyCheckins !== false &&
                        ((_k = share.sharedWith) === null || _k === void 0 ? void 0 : _k.id)) {
                        await (0, notificationService_1.createNotification)(strapi, {
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
                                html: (0, getEmailTemplate_1.default)(emailBody),
                            },
                        });
                    }
                }
            }
        }
        catch (err) {
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
    // PUT /plan-checkins/:id — checkout (set checkoutTime)
    async update(ctx) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const { id } = ctx.params;
        const requestData = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || {};
        const currentUser = ctx.state.user;
        const existing = await strapi.db
            .query("api::plan-checkin.plan-checkin")
            .findOne({
            where: { id },
            populate: ["tripPlan"],
        });
        if (!existing) {
            ctx.status = 404;
            return { error: "Check-in not found" };
        }
        await strapi.db.query("api::plan-checkin.plan-checkin").update({
            where: { id },
            data: { checkoutTime: requestData.checkoutTime },
        });
        // Notify shared users of checkout
        try {
            const plan = await strapi.db
                .query("api::trip-plan.trip-plan")
                .findOne({
                where: { id: (_b = existing.tripPlan) === null || _b === void 0 ? void 0 : _b.id },
                populate: {
                    stops: { populate: { site: true } },
                    shares: { populate: { sharedWith: true } },
                    owner: true,
                },
            });
            if ((_c = plan === null || plan === void 0 ? void 0 : plan.shares) === null || _c === void 0 ? void 0 : _c.length) {
                const ownerName = ((_d = plan.owner) === null || _d === void 0 ? void 0 : _d.name) || ((_e = plan.owner) === null || _e === void 0 ? void 0 : _e.handle) || currentUser.name || "Someone";
                const stopName = ((_h = (_g = (_f = plan.stops) === null || _f === void 0 ? void 0 : _f[existing.stopIndex]) === null || _g === void 0 ? void 0 : _g.site) === null || _h === void 0 ? void 0 : _h.title) ||
                    `Stop ${((_j = existing.stopIndex) !== null && _j !== void 0 ? _j : 0) + 1}`;
                const emailBody = getCheckoutEmailBody(ownerName, plan.name, stopName);
                for (const share of plan.shares) {
                    if (share.status === "accepted" &&
                        share.notifyCheckins !== false &&
                        ((_k = share.sharedWith) === null || _k === void 0 ? void 0 : _k.id)) {
                        await (0, notificationService_1.createNotification)(strapi, {
                            recipientId: share.sharedWith.id,
                            type: "plan_shared",
                            title: "Check-out Update",
                            message: `${ownerName} checked out from ${stopName} on "${plan.name}".`,
                            relatedEntityType: "plan_share",
                            relatedEntityId: share.id,
                            metadata: {
                                tripPlanId: plan.id,
                                planName: plan.name,
                                stopName,
                                checkinId: id,
                                isCheckout: true,
                            },
                            emailContent: {
                                subject: `${ownerName} checked out from ${stopName} on Wildway`,
                                text: `${ownerName} checked out from ${stopName} on their trip plan "${plan.name}". They have left this stop safely.`,
                                html: (0, getEmailTemplate_1.default)(emailBody),
                            },
                        });
                    }
                }
            }
        }
        catch (err) {
            strapi.log.error("Failed to send check-out notifications:", err);
        }
        return { data: { success: true } };
    },
}));
