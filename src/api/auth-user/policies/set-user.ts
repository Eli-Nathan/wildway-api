import type { Strapi } from "@strapi/strapi";
import logger from "../../../nomad/logger";

interface PolicyContext {
  state: {
    user?: {
      sub?: string;
      email?: string;
      picture?: string;
      name?: string;
      givenName?: string;
      familyName?: string;
    };
  };
  request: {
    body?: {
      data?: {
        user_id?: string;
        email?: string;
        avatar?: string;
        name?: string;
        firstName?: string;
        lastName?: string;
      };
    };
  };
}

export default async (
  ctx: PolicyContext,
  config: Record<string, unknown>,
  { strapi }: { strapi: Strapi }
): Promise<boolean> => {
  if (ctx.state.user) {
    if (!ctx.request.body) {
      ctx.request.body = {};
    }
    if (!ctx.request.body.data) {
      ctx.request.body.data = {};
    }
    const userDetails = ctx.state.user;
    ctx.request.body.data.user_id = userDetails.sub;
    ctx.request.body.data.email = userDetails.email;
    ctx.request.body.data.avatar = userDetails.picture;
    let name: string | undefined;
    if (userDetails.name) {
      name = userDetails.name;
    } else if (
      ctx.request.body.data.firstName &&
      ctx.request.body.data.lastName
    ) {
      name = `${ctx.request.body.data.firstName} ${ctx.request.body.data.lastName}`;
    } else if (userDetails.givenName && userDetails.familyName) {
      name = `${userDetails.givenName} ${userDetails.familyName}`;
    }
    ctx.request.body.data.name = name;
    logger.info("New user added to DB", {
      user: userDetails,
    });
    return true;
  }

  logger.warn("Failed to add new user to DB");
  return false;
};
