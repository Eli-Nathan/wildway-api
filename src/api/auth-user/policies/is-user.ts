import type { Core } from "@strapi/strapi";

interface PolicyContext {
  state: {
    user?: {
      id: number;
    };
    route?: unknown;
  };
  params: {
    id?: number;
  };
}

export default async (
  policyContext: PolicyContext,
  config: Record<string, unknown>,
  { strapi }: { strapi: Core.Strapi }
): Promise<boolean> => {
  // User already verified in firebase-auth middleware - just check it exists
  if (policyContext.state.user && policyContext.state.user.id) {
    // Set the user id in params for controllers to use
    if (!policyContext.params) {
      policyContext.params = {} as typeof policyContext.params;
    }
    policyContext.params.id = policyContext.state.user.id;
    return true;
  }

  return false;
};
