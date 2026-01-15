"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
const slack_1 = require("../../../nomad/slack");
const getEditableFieldsFromSite = (siteData) => {
    const { title, description, tel, email, facilities, pricerange, url, sub_types, type, } = siteData;
    return {
        title,
        description,
        tel,
        email,
        facilities,
        pricerange,
        sub_types,
        url,
        type,
    };
};
exports.default = strapi_1.factories.createCoreController("api::edit-request.edit-request", ({ strapi }) => ({
    async create(ctx) {
        var _a, _b;
        const siteId = ctx.request.body.data.site;
        if (ctx.state.user) {
            const site = (await strapi.db.query(`api::site.site`).findOne({
                where: {
                    id: siteId,
                },
                populate: {
                    owners: true,
                },
            }));
            const ownersIds = (_a = site === null || site === void 0 ? void 0 : site.owners) === null || _a === void 0 ? void 0 : _a.map((s) => s.id).filter(Boolean);
            const isOwnerEditing = ownersIds === null || ownersIds === void 0 ? void 0 : ownersIds.includes(ctx.state.user.id);
            if (isOwnerEditing) {
                const safeData = getEditableFieldsFromSite(ctx.request.body.data.data);
                const images = Array.isArray(ctx.request.body.data.images)
                    ? { images: ctx.request.body.data.images }
                    : {};
                const newSite = await strapi.db.query(`api::site.site`).update({
                    where: { id: siteId },
                    data: {
                        ...safeData,
                        ...images,
                    },
                });
                return {
                    data: {
                        attributes: {
                            // @ts-expect-error - Strapi core controller method
                            site: await this.sanitizeOutput(newSite, ctx),
                            ownerUpdated: true,
                        },
                    },
                };
            }
        }
        // Strapi 5: Use db.query directly (accepts simple IDs for relations)
        const requestData = ctx.request.body.data;
        const edit = await strapi.db.query("api::edit-request.edit-request").create({
            data: {
                site: requestData.site,
                data: requestData.data,
                images: requestData.images,
                facilities: requestData.facilities,
                owner: (_b = ctx.state.user) === null || _b === void 0 ? void 0 : _b.id,
            },
        });
        await (0, slack_1.sendEntryToSlack)({ data: edit }, "editRequest", ctx);
        // Return in Strapi 4 format
        const { id, documentId, ...attributes } = edit;
        return {
            data: {
                id,
                attributes,
            },
            meta: {},
        };
    },
}));
