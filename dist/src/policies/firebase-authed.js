"use strict";
/**
 * Global policy that checks if user is authenticated via Firebase
 * The firebase-auth middleware sets ctx.state.user
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (ctx, _config, { strapi }) => {
    const isAuthed = !!ctx.state.user;
    strapi.log.info("firebase-authed policy: user exists =", isAuthed, "user =", JSON.stringify(ctx.state.user));
    return isAuthed;
};
