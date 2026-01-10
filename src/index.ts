// @ts-nocheck
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Strapi } from "@strapi/strapi";
import type { Context } from "koa";
import logger from "./nomad/logger";

initializeApp({
  credential: applicationDefault(),
});

interface AuthUser {
  id: number;
  email?: string;
  user_id?: string;
  sites?: unknown[];
  siteCount?: number;
  role?: unknown;
  sub?: string;
}

interface FirebaseUserData {
  sub: string;
  email?: string;
  picture?: string;
  name?: string;
}

interface StrapiContext extends Context {
  state: {
    user?: AuthUser & FirebaseUserData;
  };
  request: Context["request"] & {
    header: {
      authorization?: string;
    };
  };
  unauthorized: (error: unknown) => void;
}

interface AuthResult {
  authenticated: boolean;
  credentials?: AuthUser | FirebaseUserData;
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Strapi }): void {
    strapi.container.get("auth").register("content-api", {
      name: "firebase-jwt-verifier",
      async authenticate(ctx: StrapiContext): Promise<AuthResult> {
        if (ctx.state.user) {
          logger.info("User already authed", {
            user: ctx.state.user,
          });
          return { authenticated: true, credentials: ctx.state.user };
        }

        if (
          ctx.request &&
          ctx.request.header &&
          ctx.request.header.authorization
        ) {
          try {
            const token = ctx.request.header.authorization.replace(
              "Bearer ",
              ""
            );
            const userData = (await getAuth().verifyIdToken(
              token
            )) as unknown as FirebaseUserData;

            const nomadUser = (await strapi.db
              .query(`api::auth-user.auth-user`)
              .findOne({
                where: {
                  user_id: userData.sub,
                },
                populate: {
                  role: true,
                  sites: true,
                },
              })) as AuthUser | null;

            if (nomadUser && userData) {
              if (nomadUser.sites) {
                nomadUser.siteCount = nomadUser.sites.length || 0;
              }
              const mergedData = { ...userData, ...nomadUser };
              logger.info("User from DB verified with Firebase", {
                email: mergedData.email,
              });
              ctx.state.user = mergedData;
              return { authenticated: true, credentials: mergedData };
            }

            if (nomadUser) {
              logger.warn("User from DB potentially unverified", {
                email: nomadUser.email,
              });
              ctx.state.user = { ...nomadUser, sub: userData.sub } as AuthUser &
                FirebaseUserData;
              return { authenticated: true, credentials: nomadUser };
            }

            if (userData) {
              ctx.state.user = userData as AuthUser & FirebaseUserData;
              return { authenticated: true, credentials: userData };
            }
            return { authenticated: false };
          } catch (error) {
            logger.error("User login error ", error);
            return ctx.unauthorized(error) as unknown as AuthResult;
          }
        }

        logger.warn("User login unsuccessful");
        return { authenticated: false };
      },
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/* { strapi } */): void {},
};
