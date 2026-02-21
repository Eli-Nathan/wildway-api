"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
const slack_1 = require("../../../nomad/slack");
const getEditableFieldsFromSite = (siteData) => {
    const { title, description, tel, email, facilities, pricerange, url, sub_types, type, route_metadata, cta_label, cta_url, social_links, } = siteData;
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
        route_metadata,
        cta_label,
        cta_url,
        social_links,
    };
};
// Helper to format relation in Strapi 4 format
const formatRelation = (relation) => {
    if (!relation)
        return null;
    const { id, documentId, ...attrs } = relation;
    return { data: { id, attributes: attrs } };
};
exports.default = strapi_1.factories.createCoreController("api::edit-request.edit-request", ({ strapi }) => ({
    async find(ctx) {
        var _a;
        const edits = await strapi.db.query("api::edit-request.edit-request").findMany({
            where: {
                owner: (_a = ctx.state.user) === null || _a === void 0 ? void 0 : _a.id,
            },
            populate: {
                site: true,
                owner: true,
            },
        });
        return edits.map((edit) => {
            const { id, documentId, ...attributes } = edit;
            // Format site relation in Strapi 4 format
            if (attributes.site) {
                attributes.site = formatRelation(attributes.site);
            }
            return {
                id,
                ...attributes,
            };
        });
    },
    async findOne(ctx) {
        var _a;
        const edit = await strapi.db.query("api::edit-request.edit-request").findOne({
            where: {
                id: ctx.params.id,
                owner: (_a = ctx.state.user) === null || _a === void 0 ? void 0 : _a.id,
            },
            populate: {
                site: true,
                owner: true,
            },
        });
        if (!edit) {
            return { data: null };
        }
        const { id, documentId, ...attributes } = edit;
        if (attributes.site) {
            attributes.site = formatRelation(attributes.site);
        }
        return {
            data: {
                id,
                attributes,
            },
            meta: {},
        };
    },
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
        const createdEdit = await strapi.db.query("api::edit-request.edit-request").create({
            data: {
                site: requestData.site,
                data: requestData.data,
                images: requestData.images,
                facilities: requestData.facilities,
                owner: (_b = ctx.state.user) === null || _b === void 0 ? void 0 : _b.id,
            },
        });
        await (0, slack_1.sendEntryToSlack)({ data: createdEdit }, "editRequest", ctx);
        // Fetch with site populated for the response
        const edit = await strapi.db.query("api::edit-request.edit-request").findOne({
            where: { id: createdEdit.id },
            populate: {
                site: true,
                owner: true,
            },
        });
        // Return in Strapi 4 format with site relation formatted
        const { id, documentId, ...attributes } = edit;
        if (attributes.site) {
            attributes.site = formatRelation(attributes.site);
        }
        return {
            data: {
                id,
                attributes,
            },
            meta: {},
        };
    },
}));
