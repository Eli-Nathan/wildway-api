// @ts-nocheck
import { getAuth } from "firebase-admin/auth";
import type { Strapi } from "@strapi/strapi";
import type { Context } from "koa";

interface PolicyContext extends Context {
  state: {
    user?: {
      id: number;
      sub?: string;
      role?: unknown;
      user_id?: string;
    };
  };
  request: Context["request"] & {
    header: {
      authorization?: string;
    };
  };
  unauthorized: (error: unknown) => void;
}

interface PolicyConfig {
  [key: string]: unknown;
}

interface PolicyDeps {
  strapi: Strapi;
}

interface Plugin {
  policies: {
    [key: string]: (
      ctx: PolicyContext,
      config: PolicyConfig,
      deps: PolicyDeps
    ) => Promise<boolean | void>;
  };
}

export default (plugin: Plugin): Plugin => {
  plugin.policies["isAuthed"] = async (
    ctx: PolicyContext,
    _config: PolicyConfig,
    { strapi }: PolicyDeps
  ): Promise<boolean | void> => {
    if (ctx.state.user) {
      // request is already authenticated in a different way
      return true;
    }

    if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
      try {
        const token = ctx.request.header.authorization.replace("Bearer ", "");
        const userData = await getAuth().verifyIdToken(token);

        const nomadUser = await strapi.db
          .query(`api::auth-user.auth-user`)
          .findOne({
            where: {
              user_id: userData.sub,
            },
            populate: {
              role: true,
            },
          });

        if (nomadUser) {
          ctx.state.user = nomadUser as PolicyContext["state"]["user"];
          if (ctx.state.user) {
            ctx.state.user.sub = userData.sub;
          }
          return true;
        }

        if (userData) {
          ctx.state.user = userData as unknown as PolicyContext["state"]["user"];
          return true;
        }
        return false;
      } catch (error) {
        return ctx.unauthorized(error);
      }
    }

    // Execute the action.
    return false;
  };
  return plugin;
};
