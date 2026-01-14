"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController("api::nomad-route.nomad-route", ({ strapi }) => ({
    async find(ctx) {
        // @ts-expect-error - Strapi core controller method
        const routes = await super.find(ctx);
        // @ts-expect-error - Strapi core controller method
        return this.sanitizeOutput(routes, ctx);
    },
    async findOne(ctx) {
        const route = await strapi.db.query("api::nomad-route.nomad-route").findOne({
            where: { id: ctx.params.id },
            populate: {
                image: true,
                tags: true,
                pois: {
                    populate: {
                        type: {
                            populate: {
                                remote_icon: true,
                                remote_marker: true,
                            },
                        },
                        images: true,
                    },
                },
                stay: {
                    populate: {
                        type: {
                            populate: {
                                remote_icon: true,
                                remote_marker: true,
                            },
                        },
                        images: true,
                    },
                },
            },
        });
        if (!route) {
            ctx.status = 404;
            return { status: 404, message: "Route not found" };
        }
        // @ts-expect-error - Strapi core controller method
        return this.transformResponse(route, ctx);
    },
    async findOneByUID(ctx) {
        const route = await strapi.db
            .query("api::nomad-route.nomad-route")
            .findOne({
            where: { slug: ctx.params.slug },
            populate: {
                image: true,
                tags: true,
                pois: {
                    populate: {
                        type: {
                            populate: {
                                remote_icon: true,
                                remote_marker: true,
                            },
                        },
                        images: true,
                    },
                },
                stay: {
                    populate: {
                        type: {
                            populate: {
                                remote_icon: true,
                                remote_marker: true,
                            },
                        },
                        images: true,
                    },
                },
            },
        });
        if (!route) {
            ctx.status = 404;
            return { status: 404, message: "Route not found" };
        }
        // @ts-expect-error - Strapi core controller method
        return this.transformResponse(route, ctx);
    },
}));
