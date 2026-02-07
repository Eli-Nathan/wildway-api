"use strict";
/**
 * Global policy that checks if user is authenticated via Firebase
 * The firebase-auth middleware sets ctx.state.user
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (ctx, _config, { strapi }) => {
    return !!ctx.state.user;
};
