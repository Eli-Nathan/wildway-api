import type { PolicyContext, StrapiInstance } from "../types/strapi";

const setOwner = async (
  ctx: PolicyContext,
  _config: Record<string, unknown>,
  _context: { strapi: StrapiInstance }
): Promise<boolean> => {
  if (ctx.state.user && ctx.state.user.id) {
    if (!ctx.request.body) {
      ctx.request.body = {};
    }
    if (!ctx.request.body.data) {
      ctx.request.body.data = {};
    }
    ctx.request.body.data.owner = ctx.state.user.id;

    return true;
  }

  return false;
};

export default setOwner;
