// @ts-nocheck
import { factories } from "@strapi/strapi";

interface StrapiContext {
  params: {
    listId?: string;
    siteId?: string;
  };
  state: {
    user?: {
      id: number;
    };
  };
}

export default factories.createCoreController(
  "api::site-list-progress.site-list-progress",
  ({ strapi }) => ({
    /**
     * Get user's progress for a specific list
     */
    async getProgress(ctx: StrapiContext) {
      const listId = parseInt(ctx.params.listId!, 10);
      const userId = ctx.state.user!.id;

      // Find or create progress record
      let progress = await strapi.db
        .query("api::site-list-progress.site-list-progress")
        .findOne({
          where: {
            user: userId,
            site_list: listId,
          },
          populate: {
            completed_sites: {
              select: ["id"],
            },
          },
        });

      if (!progress) {
        // Return empty progress if none exists
        return {
          data: {
            completedSiteIds: [],
          },
        };
      }

      return {
        data: {
          completedSiteIds: progress.completed_sites?.map((s: any) => s.id) || [],
        },
      };
    },

    /**
     * Toggle completion of a site in a list
     */
    async toggleSiteCompletion(ctx: StrapiContext) {
      const listId = parseInt(ctx.params.listId!, 10);
      const siteId = parseInt(ctx.params.siteId!, 10);
      const userId = ctx.state.user!.id;

      // Find existing progress record
      let progress = await strapi.db
        .query("api::site-list-progress.site-list-progress")
        .findOne({
          where: {
            user: userId,
            site_list: listId,
          },
          populate: {
            completed_sites: {
              select: ["id"],
            },
          },
        });

      let completedSiteIds: number[] = [];
      let isNowCompleted: boolean;

      if (!progress) {
        // Create new progress record with this site completed
        progress = await strapi.db
          .query("api::site-list-progress.site-list-progress")
          .create({
            data: {
              user: userId,
              site_list: listId,
              completed_sites: [siteId],
            },
          });
        completedSiteIds = [siteId];
        isNowCompleted = true;
      } else {
        // Toggle the site in completed_sites
        const currentCompletedIds =
          progress.completed_sites?.map((s: any) => s.id) || [];
        const isCurrentlyCompleted = currentCompletedIds.includes(siteId);

        if (isCurrentlyCompleted) {
          // Remove from completed
          completedSiteIds = currentCompletedIds.filter(
            (id: number) => id !== siteId
          );
          isNowCompleted = false;
        } else {
          // Add to completed
          completedSiteIds = [...currentCompletedIds, siteId];
          isNowCompleted = true;
        }

        await strapi.db
          .query("api::site-list-progress.site-list-progress")
          .update({
            where: { id: progress.id },
            data: {
              completed_sites: completedSiteIds,
            },
          });
      }

      return {
        data: {
          siteId,
          completed: isNowCompleted,
          completedSiteIds,
        },
      };
    },

    /**
     * Get which lists a site is completed in for the current user
     * Lite endpoint for site page badges
     */
    async getSiteProgress(ctx: StrapiContext) {
      const siteId = parseInt(ctx.params.siteId!, 10);
      const userId = ctx.state.user!.id;

      // Find all progress records for this user where the site is in completed_sites
      const allProgress = await strapi.db
        .query("api::site-list-progress.site-list-progress")
        .findMany({
          where: {
            user: userId,
          },
          populate: {
            completed_sites: {
              select: ["id"],
            },
            site_list: {
              select: ["id"],
            },
          },
        });

      // Filter to lists where this site is completed
      const completedListIds = allProgress
        .filter((p: any) => p.completed_sites?.some((s: any) => s.id === siteId))
        .map((p: any) => p.site_list?.id)
        .filter(Boolean);

      return {
        data: {
          completedListIds,
        },
      };
    },
  })
);
