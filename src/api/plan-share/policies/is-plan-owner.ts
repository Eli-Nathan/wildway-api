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

  // Ensure query and filters objects exist
  if (!policyContext.query) {
    policyContext.query = {};
  }
  if (!policyContext.query.filters) {
    policyContext.query.filters = {};
  }

  // Force owner filter on the related tripPlan
  policyContext.query.filters.tripPlan = {
    owner: { id: { $eq: user.id } }
  };

  return true;
};

export default isPlanOwner;
