/**
 * Global policy that checks if user is authenticated via Firebase
 * The firebase-auth middleware sets ctx.state.user
 */

import type { Core } from "@strapi/strapi";

interface PolicyContext {
  state: {
    user?: {
      id?: number;
      sub?: string;
      email?: string;
    };
  };
}

export default (
  ctx: PolicyContext,
  _config: Record<string, unknown>,
  { strapi }: { strapi: Core.Strapi }
): boolean => {
  return !!ctx.state.user;
};
