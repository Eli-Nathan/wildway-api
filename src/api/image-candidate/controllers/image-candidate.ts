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

    strapi.log.info(`Approve called for ID: ${id}, imageUrl: ${imageUrl}`);

    // Get the candidate with its site relation using db.query
    const candidate = await strapi.db.query('api::image-candidate.image-candidate').findOne({
      where: { id: Number(id) },
      populate: ['site'],
    });

    strapi.log.info(`Found candidate: ${JSON.stringify(candidate)}`);

    if (!candidate) {
      return ctx.notFound('Candidate not found');
    }

    if (!candidate.site) {
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

    // Delete the candidate
    await strapi.db.query('api::image-candidate.image-candidate').delete({
      where: { id: Number(id) },
    });

    strapi.log.info(`Approved and deleted candidate ${id}`);

    return { success: true, message: 'Image approved and applied to site' };
  },

  /**
   * Reject all candidates for a site - just deletes the candidate
   */
  async reject(ctx) {
    const { id } = ctx.params;

    strapi.log.info(`Reject called for ID: ${id}`);

    // First verify the candidate exists
    const candidate = await strapi.db.query('api::image-candidate.image-candidate').findOne({
      where: { id: Number(id) },
    });

    strapi.log.info(`Found candidate for reject: ${JSON.stringify(candidate)}`);

    if (!candidate) {
      return ctx.notFound('Candidate not found');
    }

    // Delete the candidate
    await strapi.db.query('api::image-candidate.image-candidate').delete({
      where: { id: Number(id) },
    });

    strapi.log.info(`Rejected and deleted candidate ${id}`);

    return { success: true, message: 'Candidate rejected', deletedId: id };
  },
}));
