import type { Core } from "@strapi/strapi";
import logger from "../../../wildway/logger";

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

    // Build name from various sources (priority order)
    let name: string | undefined;
    if (userDetails.name) {
      // From Firebase token (Google auth usually has this)
      name = userDetails.name;
    } else if (requestData.name) {
      // From client request (Apple auth with our fallback)
      name = requestData.name;
    } else if (requestData.firstName || requestData.lastName) {
      // From client request (separate fields)
      name = [requestData.firstName, requestData.lastName].filter(Boolean).join(' ');
    } else if (userDetails.givenName || userDetails.familyName) {
      // From Firebase token (fallback)
      name = [userDetails.givenName, userDetails.familyName].filter(Boolean).join(' ');
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
