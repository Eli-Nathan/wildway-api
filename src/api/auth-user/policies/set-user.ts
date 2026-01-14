import type { Core } from "@strapi/strapi";
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
  _config: Record<string, unknown>,
  { strapi: _strapi }: { strapi: Core.Strapi }
): Promise<boolean> => {
  if (ctx.state.user) {
    if (!ctx.request.body) {
      ctx.request.body = {};
    }
    if (!ctx.request.body.data) {
      ctx.request.body.data = {};
    }
    const userDetails = ctx.state.user;
    const requestData = ctx.request.body.data;

    // Build name from various sources
    let name: string | undefined;
    if (userDetails.name) {
      name = userDetails.name;
    } else if (requestData.firstName && requestData.lastName) {
      name = `${requestData.firstName} ${requestData.lastName}`;
    } else if (userDetails.givenName && userDetails.familyName) {
      name = `${userDetails.givenName} ${userDetails.familyName}`;
    }

    // Strapi 5 is strict about keys - only set valid auth-user fields
    ctx.request.body.data = {
      user_id: userDetails.sub,
      email: userDetails.email,
      avatar: userDetails.picture,
      name,
    };

    logger.info("set-user policy: Prepared user data", {
      user_id: userDetails.sub,
      email: userDetails.email,
    });
    return true;
  }

  logger.warn("set-user policy: No user in state");
  return false;
};
