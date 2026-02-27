/**
 * image-candidate controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::image-candidate.image-candidate', ({ strapi }) => ({
  /**
   * Approve a candidate image - copies to site and deletes candidate
   */
  async approve(ctx) {
    const { id } = ctx.params;
    const { imageUrl, imageCaption } = ctx.request.body;

    // Get the candidate with its site relation
    const candidate = await strapi.documents('api::image-candidate.image-candidate').findOne({
      documentId: id,
      populate: ['site'],
    });

    if (!candidate) {
      return ctx.notFound('Candidate not found');
    }

    if (!candidate.site) {
      return ctx.badRequest('Candidate has no associated site');
    }

    // Update the site with the selected image
    await strapi.documents('api::site.site').update({
      documentId: candidate.site.documentId,
      data: {
        image: imageUrl,
        imageCaption: imageCaption || null,
      } as any,
    });

    // Delete the candidate
    await strapi.documents('api::image-candidate.image-candidate').delete({
      documentId: id,
    });

    return { success: true, message: 'Image approved and applied to site' };
  },

  /**
   * Reject all candidates for a site - just deletes the candidate
   */
  async reject(ctx) {
    const { id } = ctx.params;

    // Delete the candidate
    await strapi.documents('api::image-candidate.image-candidate').delete({
      documentId: id,
    });

    return { success: true, message: 'Candidate rejected' };
  },
}));
