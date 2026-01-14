"use strict";
/**
 * Users-permissions plugin extension
 *
 * The isAuthed policy now simply checks if the user is authenticated.
 * The actual Firebase authentication is handled by the global::firebase-auth middleware.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (plugin) => {
    // The isAuthed policy checks if the user was authenticated by the firebase-auth middleware
    plugin.policies["isAuthed"] = (ctx) => {
        const isAuthed = !!ctx.state.user;
        console.log("isAuthed policy: state.user exists =", isAuthed, "user =", JSON.stringify(ctx.state.user));
        return isAuthed;
    };
    return plugin;
};
