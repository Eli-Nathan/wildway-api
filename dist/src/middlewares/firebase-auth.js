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
        if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))) {
            return await next();
        }
        try {
            const token = authHeader.replace("Bearer ", "");
            const userData = (await (0, auth_1.getAuth)().verifyIdToken(token));
            // Firebase uses 'uid', normalize to 'sub' for consistency
            const userSub = userData.uid || userData.sub;
            // Find user in database - lightweight query (no sites populate)
            const nomadUser = (await strapi.db
                .query("api::auth-user.auth-user")
                .findOne({
                where: { user_id: userSub },
                populate: { role: true },
            }));
            if (nomadUser && userData) {
                const mergedData = { ...userData, ...nomadUser, sub: userSub };
                ctx.state.user = mergedData;
            }
            else if (nomadUser) {
                ctx.state.user = { ...nomadUser, sub: userSub };
            }
            else if (userData) {
                // New user - not in DB yet, set Firebase data with normalized sub
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
