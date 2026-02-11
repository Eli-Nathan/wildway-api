"use strict";
/**
 * Backwards compatibility controller for deprecated comments API.
 * Returns empty data for GET requests and deprecation errors for mutations.
 * TODO: Remove after all users have updated to the new app version with reviews.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController("api::comment.comment", ({ strapi }) => ({
    /**
     * GET /comments - Return empty array for backwards compatibility
     */
    async find(ctx) {
        return {
            data: [],
            meta: {
                pagination: {
                    page: 1,
                    pageSize: 25,
                    pageCount: 0,
                    total: 0,
                },
            },
        };
    },
    /**
     * POST /comments - Return deprecation error
     * Old app versions will see this as a failure and should update
     */
    async create(ctx) {
        ctx.status = 410; // Gone
        return {
            error: {
                status: 410,
                name: "GoneError",
                message: "Comments have been replaced by Reviews. Please update your app to leave a review.",
            },
        };
    },
    /**
     * DELETE /comments/:id - Return success (no-op)
     * Old app versions trying to delete comments will think it succeeded
     */
    async delete(ctx) {
        return {
            data: {
                id: ctx.params.id,
                attributes: {},
            },
            meta: {},
        };
    },
}));
