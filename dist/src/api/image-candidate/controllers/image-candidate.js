"use strict";
/**
 * image-candidate controller
 */
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::image-candidate.image-candidate', ({ strapi }) => ({
    /**
     * Approve a candidate image - copies to site and marks candidate as approved
     */
    async approve(ctx) {
        var _a;
        const { id } = ctx.params;
        const { imageUrl, imageCaption } = ctx.request.body;
        console.log(`[approve] Called for ID: ${id}, imageUrl: ${imageUrl}`);
        // Get the candidate with its site relation
        const candidate = await strapi.db.query('api::image-candidate.image-candidate').findOne({
            where: { id: Number(id) },
            populate: ['site'],
        });
        console.log(`[approve] Found candidate:`, candidate ? `id=${candidate.id}, site=${(_a = candidate.site) === null || _a === void 0 ? void 0 : _a.id}` : 'null');
        if (!candidate) {
            console.log(`[approve] Candidate ${id} not found`);
            return ctx.notFound('Candidate not found');
        }
        if (!candidate.site) {
            console.log(`[approve] Candidate ${id} has no site`);
            return ctx.badRequest('Candidate has no associated site');
        }
        // Update the site with the selected image
        await strapi.db.query('api::site.site').update({
            where: { id: candidate.site.id },
            data: {
                image: imageUrl,
                imageCaption: imageCaption || null,
            },
        });
        console.log(`[approve] Updated site ${candidate.site.id} with image`);
        // Mark candidate as approved (not delete)
        await strapi.db.query('api::image-candidate.image-candidate').update({
            where: { id: Number(id) },
            data: { status: 'approved' },
        });
        console.log(`[approve] Marked candidate ${id} as approved`);
        return { success: true, message: 'Image approved and applied to site' };
    },
    /**
     * Reject candidate - marks as rejected
     */
    async reject(ctx) {
        const { id } = ctx.params;
        console.log(`[reject] Called for ID: ${id}`);
        // First verify the candidate exists
        const candidate = await strapi.db.query('api::image-candidate.image-candidate').findOne({
            where: { id: Number(id) },
        });
        console.log(`[reject] Found candidate:`, candidate ? `id=${candidate.id}, status=${candidate.status}` : 'null');
        if (!candidate) {
            console.log(`[reject] Candidate ${id} not found`);
            return ctx.notFound('Candidate not found');
        }
        // Mark as rejected (not delete)
        await strapi.db.query('api::image-candidate.image-candidate').update({
            where: { id: Number(id) },
            data: { status: 'rejected' },
        });
        console.log(`[reject] Marked candidate ${id} as rejected`);
        return { success: true, message: 'Candidate rejected', rejectedId: id };
    },
}));
