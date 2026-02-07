"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
const populateConfig = {
    image: true,
    site: {
        populate: {
            type: true,
            images: true,
        },
    },
    site_list: {
        populate: {
            image: true,
        },
    },
    route: {
        populate: {
            image: true,
        },
    },
};
exports.default = strapi_1.factories.createCoreController("api::featured.featured", ({ strapi }) => ({
    /**
     * Find all active featured items, ordered by priority
     */
    async find() {
        const items = await strapi.db.query("api::featured.featured").findMany({
            where: {
                active: true,
            },
            populate: populateConfig,
            orderBy: [{ priority: "desc" }],
        });
        return {
            data: items.map((item) => ({
                id: item.id,
                attributes: item,
            })),
            meta: {},
        };
    },
}));
