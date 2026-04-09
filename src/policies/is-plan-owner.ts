import type { PolicyContext, StrapiInstance } from "../types/strapi";

/**
 * Policy to check if the user is the OWNER of the trip plan related to the resource.
 * Used for plan-share (only owner can share) and plan-checkin management.
 */
const isPlanOwner = async (
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

  // 1. If we are looking for a specific entity by ID (findOne, update, delete)
  if (id) {
    let tripPlanId: number | string | null = null;

    if (apiName === 'trip-plan') {
      tripPlanId = id;
    } else if (apiName === 'plan-share') {
      const share = await strapi.db.query('api::plan-share.plan-share').findOne({
        where: { id },
        populate: ['tripPlan']
      });
      tripPlanId = share?.tripPlan?.id;
    } else if (apiName === 'plan-checkin') {
      const checkin = await strapi.db.query('api::plan-checkin.plan-checkin').findOne({
        where: { id },
        populate: ['tripPlan']
      });
      tripPlanId = checkin?.tripPlan?.id;
    }

    if (!tripPlanId) return false;

    // Check if user is owner of the trip plan
    const plan = await strapi.db.query('api::trip-plan.trip-plan').findOne({
      where: {
        id: tripPlanId,
        owner: { id: user.id }
      }
    });

    return !!plan;
  }

  // 2. If we are creating (POST)
  if (policyContext.request.method === 'POST') {
    const data = policyContext.request.body?.data;
    const tripPlanId = data?.tripPlan;

    if (!tripPlanId) return false;

    const plan = await strapi.db.query('api::trip-plan.trip-plan').findOne({
      where: {
        id: tripPlanId,
        owner: { id: user.id }
      }
    });

    return !!plan;
  }

  // 3. If we are listing (find), inject filters
  if (!policyContext.query) {
    policyContext.query = {};
  }
  if (!policyContext.query.filters) {
    policyContext.query.filters = {};
  }

  policyContext.query.filters.tripPlan = {
    owner: { id: { $eq: user.id } }
  };

  return true;
};

export default isPlanOwner;
