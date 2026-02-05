import { getAuth } from "firebase-admin/auth";
import type { Core } from "@strapi/strapi";

interface AuthUser {
  id: number;
  email?: string;
  user_id?: string;
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

    if (!authHeader?.startsWith("Bearer ")) {
      return await next();
    }

    try {
      const token = authHeader.replace("Bearer ", "");
      const userData = (await getAuth().verifyIdToken(
        token
      )) as unknown as FirebaseUserData;
      // Firebase uses 'uid', normalize to 'sub' for consistency
      const userSub = userData.uid || userData.sub;

      // Find user in database - lightweight query (no sites populate)
      const nomadUser = (await strapi.db
        .query("api::auth-user.auth-user")
        .findOne({
          where: { user_id: userSub },
          populate: { role: true },
        })) as AuthUser | null;

      if (nomadUser && userData) {
        const mergedData = { ...userData, ...nomadUser, sub: userSub };
        ctx.state.user = mergedData;
      } else if (nomadUser) {
        ctx.state.user = { ...nomadUser, sub: userSub } as AuthUser &
          FirebaseUserData;
      } else if (userData) {
        // New user - not in DB yet, set Firebase data with normalized sub
        ctx.state.user = { ...userData, sub: userSub } as AuthUser & FirebaseUserData;
      }
    } catch (error) {
      strapi.log.error("Firebase auth error:", error);
      // Don't block request - let it continue without user
    }

    await next();
  };
};
