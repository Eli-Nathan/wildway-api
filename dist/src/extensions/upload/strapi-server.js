"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Extend upload plugin to use Firebase authentication
exports.default = (plugin) => {
    // Get the original upload controller
    const originalUpload = plugin.controllers["content-api"].upload;
    // Override the upload controller to work with Firebase auth
    plugin.controllers["content-api"].upload = async (ctx) => {
        // The Firebase auth middleware has already verified the user
        // and set ctx.state.user with our auth-user
        // We just need to ensure the user exists
        if (!ctx.state.user) {
            return ctx.unauthorized("You must be logged in to upload files");
        }
        // Call the original upload handler
        return originalUpload(ctx);
    };
    // Update routes to use our firebase-authed policy instead of users-permissions
    const uploadRoute = plugin.routes["content-api"].routes.find((route) => route.handler === "content-api.upload" && route.method === "POST");
    if (uploadRoute) {
        // Replace the default auth with our Firebase auth policy
        uploadRoute.config = {
            ...uploadRoute.config,
            policies: ["global::firebase-authed"],
        };
    }
    return plugin;
};
