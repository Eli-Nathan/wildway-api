import type { PolicyContext, StrapiInstance } from "../types/strapi";

/**
 * Policy to check if the user is a participant of a trip plan.
 * A participant is either the owner OR a user with whom the plan has been shared and accepted.
 */
const isPlanParticipant = async (
  policyContext: PolicyContext,
  _config: Record<string, unknown>,
  { strapi }: { strapi: StrapiInstance }
): Promise<boolean> => {
  const user = policyContext.state.user;
  if (!user || !user.id) {
    return false;
  }

  const { id } = policyContext.params;
  const apiName = policyContext.state.route.info.apiName;
  const controllerName = policyContext.state.route.handler.split(".")[0];

  // 1. If we are looking for a specific entity by ID
  if (id) {
    let tripPlanId: number | string = id;

    // If we are checking access for a checkin, we need to find the related tripPlan first
    if (apiName === 'plan-checkin') {
      const checkin = await strapi.db.query('api::plan-checkin.plan-checkin').findOne({
        where: { id },
        populate: ['tripPlan']
      });
      if (!checkin || !checkin.tripPlan) return false;
      tripPlanId = checkin.tripPlan.id;
    }

    // Check if user is owner
    const isOwner = await strapi.db.query('api::trip-plan.trip-plan').findOne({
      where: {
        id: tripPlanId,
        owner: user.id
      }
    });

    if (isOwner) return true;

    // Check if user is a shared participant with accepted status
    const isShared = await strapi.db.query('api::plan-share.plan-share').findOne({
      where: {
        tripPlan: tripPlanId,
        sharedWith: user.id,
        status: 'accepted'
      }
    });

    if (isShared) return true;

    return false;
  }

  // 2. If we are listing entities (find), we inject filters
  // This ensures users only see plans they own or are shared with them
  if (!policyContext.query) {
    policyContext.query = {};
  }
  if (!policyContext.query.filters) {
    policyContext.query.filters = {};
  }

  // We use an $or filter to include both owned plans and shared plans
  // Strapi 5 filters for relations:
  const participantFilter = {
    $or: [
      { owner: { id: { $eq: user.id } } },
      { 
        shares: { 
          sharedWith: { id: { $eq: user.id } },
          status: { $eq: 'accepted' }
        } 
      }
    ]
  };

  // Merge with existing filters if any
  policyContext.query.filters = {
    ...policyContext.query.filters,
    ...participantFilter
  };

  return true;
};

export default isPlanParticipant;
