"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("firebase-admin/auth");
exports.default = (_config, { strapi }) => {
    return async (ctx, next) => {
        var _a, _b, _c;
        // Skip admin paths - they use Strapi's own JWT auth
        const path = (_a = ctx.request) === null || _a === void 0 ? void 0 : _a.path;
        if ((path === null || path === void 0 ? void 0 : path.startsWith("/admin")) || (path === null || path === void 0 ? void 0 : path.startsWith("/content-manager")) || (path === null || path === void 0 ? void 0 : path.startsWith("/users-permissions"))) {
            return await next();
        }
        // Skip if already authenticated
        if (ctx.state.user) {
            return await next();
        }
        const authHeader = (_c = (_b = ctx.request) === null || _b === void 0 ? void 0 : _b.header) === null || _c === void 0 ? void 0 : _c.authorization;
        strapi.log.info("Firebase auth middleware: path =", path, "authHeader exists =", !!authHeader);
        if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))) {
            strapi.log.info("Firebase auth middleware: No Bearer token, skipping");
            return await next();
        }
        try {
            const token = authHeader.replace("Bearer ", "");
            strapi.log.info("Firebase auth: Verifying token for path:", path, "token length:", token.length);
            const userData = (await (0, auth_1.getAuth)().verifyIdToken(token));
            // Firebase uses 'uid', normalize to 'sub' for consistency
            const userSub = userData.uid || userData.sub;
            strapi.log.info("Firebase auth: Token verified for user:", userData.email, "uid:", userSub);
            // Find user in database
            const nomadUser = (await strapi.db
                .query("api::auth-user.auth-user")
                .findOne({
                where: { user_id: userSub },
                populate: { role: true, sites: true },
            }));
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
            }
            else if (nomadUser) {
                strapi.log.warn("User from DB potentially unverified", {
                    email: nomadUser.email,
                });
                ctx.state.user = { ...nomadUser, sub: userSub };
            }
            else if (userData) {
                // New user - not in DB yet, set Firebase data with normalized sub
                strapi.log.info("New Firebase user (not in DB yet)", { email: userData.email, sub: userSub });
                ctx.state.user = { ...userData, sub: userSub };
            }
        }
        catch (error) {
            strapi.log.error("Firebase auth error:", error);
            // Don't block request - let it continue without user
        }
        await next();
    };
};
