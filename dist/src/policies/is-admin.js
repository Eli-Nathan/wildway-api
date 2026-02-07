"use strict";
/**
 * Global policy that checks if the request has admin privileges.
 * Checks for X-Admin-Secret header matching ADMIN_SECRET env var.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (ctx, _config, { strapi }) => {
    const adminSecret = process.env.ADMIN_SECRET;
    strapi.log.info(`is-admin policy: checking auth`);
    strapi.log.info(`is-admin policy: ADMIN_SECRET set = ${!!adminSecret}, length = ${(adminSecret === null || adminSecret === void 0 ? void 0 : adminSecret.length) || 0}`);
    if (!adminSecret) {
        strapi.log.error("is-admin policy: ADMIN_SECRET env var not set");
        return false;
    }
    const providedSecret = ctx.request.headers["x-admin-secret"];
    strapi.log.info(`is-admin policy: header present = ${!!providedSecret}, length = ${String(providedSecret || '').length}`);
    const isAdmin = providedSecret === adminSecret;
    if (!isAdmin) {
        strapi.log.warn(`is-admin policy: auth failed - secrets ${providedSecret === adminSecret ? 'match' : 'do not match'}`);
    }
    else {
        strapi.log.info("is-admin policy: auth succeeded");
    }
    return isAdmin;
};
