"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEntryToSlack = void 0;
// @ts-nocheck
const axios_1 = __importDefault(require("axios"));
const lodash_1 = __importDefault(require("lodash"));
const sanitizeApiResponse_1 = __importDefault(require("./sanitizeApiResponse"));
const logger_1 = __importDefault(require("./logger"));
const getKeyValFields = (entry) => {
    const keyVal = Object.entries(entry).map(([key, value]) => ({
        type: "mrkdwn",
        text: `*${lodash_1.default.capitalize(key)}*\n ${value}`,
    }));
    return keyVal;
};
const formSubmission = async (ctx, entry) => {
    // @ts-expect-error - strapi is a global in Strapi apps
    const formSubmitted = await strapi.db.query("api::form.form").findOne({
        where: { id: ctx.params.id },
    });
    const fields = getKeyValFields(entry.data || {});
    const blocks = [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: ":mailbox: *Form submission received* :mailbox:\n",
            },
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*Form: ${lodash_1.default.startCase(((formSubmitted === null || formSubmitted === void 0 ? void 0 : formSubmitted.name) || "").replace("-", " "))}* \n <https://api.wildway.app/admin/content-manager/collectionType/api::form-submission.form-submission/${entry.id}|View submission>`,
            },
        },
        {
            type: "section",
            fields,
        },
    ];
    return { blocks };
};
const additionRequest = async (_ctx, entry) => {
    const blocks = [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: ":round_pushpin: *Addition request received* :round_pushpin: \n",
            },
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*Title: ${lodash_1.default.startCase(entry.title || "")}* \n <https://api.wildway.app/admin/content-manager/collectionType/api::addition-request.addition-request/${entry.id}|View addition request>`,
            },
        },
    ];
    return { blocks };
};
const editRequest = async (_ctx, entry) => {
    const blocks = [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: ":pencil: *Edit request received* :pencil: \n",
            },
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `<https://api.wildway.app/admin/content-manager/collectionType/api::edit-request.edit-request/${entry.id}|View edit request>`,
            },
        },
    ];
    return { blocks };
};
const review = async (_ctx, entry) => {
    const blocks = [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: ":star: *Review posted* :star: \n",
            },
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*Title: ${lodash_1.default.startCase(entry.title || "")}* \n*Rating: ${"⭐".repeat(entry.rating || 0)}* \n <https://api.wildway.app/admin/content-manager/collectionType/api::review.review/${entry.id}|View review>`,
            },
        },
    ];
    return { blocks };
};
const contentReport = async (_ctx, entry) => {
    const contentTypeLabels = {
        'site': 'Place',
        'user-route': 'Community Route',
        'nomad-route': 'Popular Route',
        'profile': 'Profile',
        'site-list': 'List'
    };
    const categoryLabels = {
        'inappropriate': 'Content is inappropriate',
        'misleading': 'Content is misleading',
        'harmful': 'Content is harmful',
        'other': 'Other'
    };
    const blocks = [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: ":warning: *Content Report Received* :warning:\n",
            },
        },
        {
            type: "section",
            fields: [
                {
                    type: "mrkdwn",
                    text: `*Content Type*\n${contentTypeLabels[entry.contentType] || entry.contentType}`,
                },
                {
                    type: "mrkdwn",
                    text: `*Category*\n${categoryLabels[entry.category] || entry.category}`,
                },
            ],
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*Content*\n${entry.contentTitle || 'Unknown'} (ID: ${entry.contentId})`,
            },
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*Description*\n${entry.description || 'No description provided'}`,
            },
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `<https://api.wildway.app/admin/content-manager/collectionType/api::content-report.content-report/${entry.id}|View Report>`,
            },
        },
    ];
    return { blocks };
};
const getSlackMessageForDataType = (type) => {
    switch (type) {
        case "form":
            return formSubmission;
        case "additionRequest":
            return additionRequest;
        case "editRequest":
            return editRequest;
        case "review":
            return review;
        case "contentReport":
            return contentReport;
        default:
            return undefined;
    }
};
const sendEntryToSlack = async (entry, type, ctx) => {
    const sanitizedEntry = (0, sanitizeApiResponse_1.default)(entry);
    if (sanitizedEntry) {
        const messageHandler = getSlackMessageForDataType(type);
        if (messageHandler) {
            const message = await messageHandler(ctx, sanitizedEntry);
            try {
                await axios_1.default.post(process.env.SLACK_FORM_WEBHOOK_URL || "", message, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
            }
            catch (e) {
                logger_1.default.warn("Error sending to Slack", {
                    error: e,
                });
            }
        }
    }
};
exports.sendEntryToSlack = sendEntryToSlack;
