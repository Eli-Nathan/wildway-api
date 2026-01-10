import type { Strapi } from "@strapi/strapi";

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
  { strapi }: { strapi: Strapi }
): Promise<boolean> => {
  if (
    policyContext.state.user &&
    policyContext.state.user.id &&
    policyContext.state.route
  ) {
    const entity = await strapi.db.query(`api::auth-user.auth-user`).findOne({
      where: {
        id: policyContext.state.user.id,
      },
    });

    if (entity && entity.id) {
      if (!policyContext.params) {
        policyContext.params = {};
      }
      policyContext.params.id = entity.id;
      return true;
    }
  }

  return false;
};
