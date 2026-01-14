import { getAuth } from "firebase-admin/auth";
import type { Core } from "@strapi/strapi";

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
  uid: string;  // Firebase uses 'uid' not 'sub'
  sub?: string; // JWT standard claim (same as uid)
  email?: string;
  picture?: string;
  name?: string;
}

interface StrapiContext {
  state: {
    user?: AuthUser & FirebaseUserData;
  };
  request: {
    header: {
      authorization?: string;
    };
  };
}

export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: StrapiContext, next: () => Promise<void>) => {
    // Skip admin paths - they use Strapi's own JWT auth
    const path = (ctx as unknown as { request: { path: string } }).request?.path;
    if (path?.startsWith("/admin") || path?.startsWith("/content-manager") || path?.startsWith("/users-permissions")) {
      return await next();
    }

    // Skip if already authenticated
    if (ctx.state.user) {
      return await next();
    }

    const authHeader = ctx.request?.header?.authorization;
    strapi.log.info("Firebase auth middleware: path =", path, "authHeader exists =", !!authHeader);

    if (!authHeader?.startsWith("Bearer ")) {
      strapi.log.info("Firebase auth middleware: No Bearer token, skipping");
      return await next();
    }

    try {
      const token = authHeader.replace("Bearer ", "");
      strapi.log.info("Firebase auth: Verifying token for path:", path, "token length:", token.length);
      const userData = (await getAuth().verifyIdToken(
        token
      )) as unknown as FirebaseUserData;
      // Firebase uses 'uid', normalize to 'sub' for consistency
      const userSub = userData.uid || userData.sub;
      strapi.log.info("Firebase auth: Token verified for user:", userData.email, "uid:", userSub);

      // Find user in database
      const nomadUser = (await strapi.db
        .query("api::auth-user.auth-user")
        .findOne({
          where: { user_id: userSub },
          populate: { role: true, sites: true },
        })) as AuthUser | null;

      if (nomadUser && userData) {
        if (nomadUser.sites) {
          nomadUser.siteCount = nomadUser.sites.length || 0;
        }
        const mergedData = { ...userData, ...nomadUser, sub: userSub };
        strapi.log.info("User from DB verified with Firebase", {
          email: mergedData.email,
          id: mergedData.id,
        });
        ctx.state.user = mergedData;
      } else if (nomadUser) {
        strapi.log.warn("User from DB potentially unverified", {
          email: nomadUser.email,
        });
        ctx.state.user = { ...nomadUser, sub: userSub } as AuthUser &
          FirebaseUserData;
      } else if (userData) {
        // New user - not in DB yet, set Firebase data with normalized sub
        strapi.log.info("New Firebase user (not in DB yet)", { email: userData.email, sub: userSub });
        ctx.state.user = { ...userData, sub: userSub } as AuthUser & FirebaseUserData;
      }
    } catch (error) {
      strapi.log.error("Firebase auth error:", error);
      // Don't block request - let it continue without user
    }

    await next();
  };
};
