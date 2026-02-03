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

  if (!adminSecret) {
    strapi.log.error("is-admin policy: ADMIN_SECRET env var not set");
    return false;
  }

  const providedSecret = ctx.request.headers["x-admin-secret"];
  const isAdmin = providedSecret === adminSecret;

  if (!isAdmin) {
    strapi.log.warn("is-admin policy: invalid or missing admin secret");
  }

  return isAdmin;
};
