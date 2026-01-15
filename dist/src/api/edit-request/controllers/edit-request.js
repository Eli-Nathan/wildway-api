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
/**
 * Strapi 5: Transform request data for compatibility
 * - Transform relations to connect syntax
 */
const transformEditRequestData = (data) => {
    const transformed = { ...data };
    // Transform single relation: site
    if (typeof transformed.site === "number") {
        transformed.site = { connect: [{ id: transformed.site }] };
    }
    // Transform array relation: facilities
    if (Array.isArray(transformed.facilities)) {
        transformed.facilities = {
            connect: transformed.facilities.map((id) => ({ id })),
        };
    }
    return transformed;
};
exports.default = strapi_1.factories.createCoreController("api::edit-request.edit-request", ({ strapi }) => ({
    async create(ctx) {
        var _a;
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
        // Strapi 5: Transform request data before super.create()
        ctx.request.body.data = transformEditRequestData(ctx.request.body.data);
        // @ts-expect-error - Strapi core controller method
        const edit = await super.create(ctx);
        await (0, slack_1.sendEntryToSlack)(edit, "editRequest", ctx);
        // @ts-expect-error - Strapi core controller method
        return this.sanitizeOutput(edit, ctx);
    },
}));
