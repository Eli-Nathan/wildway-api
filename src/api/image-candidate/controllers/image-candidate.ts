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

    // Get the candidate with its site relation using entityService (works with numeric ID)
    const candidate = await strapi.entityService.findOne(
      'api::image-candidate.image-candidate',
      id,
      { populate: ['site'] }
    );

    if (!candidate) {
      return ctx.notFound('Candidate not found');
    }

    if (!candidate.site) {
      return ctx.badRequest('Candidate has no associated site');
    }

    // Update the site with the selected image
    await strapi.entityService.update(
      'api::site.site',
      candidate.site.id,
      {
        data: {
          image: imageUrl,
          imageCaption: imageCaption || null,
        },
      }
    );

    // Delete the candidate
    await strapi.entityService.delete('api::image-candidate.image-candidate', id);

    return { success: true, message: 'Image approved and applied to site' };
  },

  /**
   * Reject all candidates for a site - just deletes the candidate
   */
  async reject(ctx) {
    const { id } = ctx.params;

    // First verify the candidate exists
    const candidate = await strapi.entityService.findOne(
      'api::image-candidate.image-candidate',
      id
    );

    if (!candidate) {
      return ctx.notFound('Candidate not found');
    }

    // Delete the candidate
    await strapi.entityService.delete('api::image-candidate.image-candidate', id);

    strapi.log.info(`Rejected image candidate ${id}`);

    return { success: true, message: 'Candidate rejected', deletedId: id };
  },
}));
