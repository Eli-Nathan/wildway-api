/**
 * Global policy that checks if the request has admin privileges.
 * Checks for X-Admin-Secret header matching ADMIN_SECRET env var.
 */

import type { Core } from "@strapi/strapi";

interface PolicyContext {
  request: {
    headers: Record<string, string>;
  };
}

export default (
  ctx: PolicyContext,
  _config: Record<string, unknown>,
  { strapi }: { strapi: Core.Strapi }
): boolean => {
  const adminSecret = process.env.ADMIN_SECRET;

  strapi.log.info(`is-admin policy: checking auth`);
  strapi.log.info(`is-admin policy: ADMIN_SECRET set = ${!!adminSecret}, length = ${adminSecret?.length || 0}`);

  if (!adminSecret) {
    strapi.log.error("is-admin policy: ADMIN_SECRET env var not set");
    return false;
  }

  const providedSecret = ctx.request.headers["x-admin-secret"];
  strapi.log.info(`is-admin policy: header present = ${!!providedSecret}, length = ${String(providedSecret || '').length}`);

  const isAdmin = providedSecret === adminSecret;

  if (!isAdmin) {
    strapi.log.warn(`is-admin policy: auth failed - secrets ${providedSecret === adminSecret ? 'match' : 'do not match'}`);
  } else {
    strapi.log.info("is-admin policy: auth succeeded");
  }

  return isAdmin;
};
