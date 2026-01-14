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
  strapi.log.info("is-user policy: state.user =", JSON.stringify(policyContext.state.user));

  // Check if user exists in state (set by firebase-auth middleware)
  if (policyContext.state.user && policyContext.state.user.id) {
    strapi.log.info("is-user policy: User has DB id:", policyContext.state.user.id);

    // Verify user exists in DB
    const entity = await strapi.db.query(`api::auth-user.auth-user`).findOne({
      where: {
        id: policyContext.state.user.id,
      },
    });

    if (entity && entity.id) {
      strapi.log.info("is-user policy: User verified in DB");
      if (!policyContext.params) {
        policyContext.params = {} as typeof policyContext.params;
      }
      policyContext.params.id = entity.id;
      return true;
    }
    strapi.log.warn("is-user policy: User not found in DB");
  }

  strapi.log.info("is-user policy: Returning false - no valid user");
  return false;
};
