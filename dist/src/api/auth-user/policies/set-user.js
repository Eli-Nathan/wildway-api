"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../../../wildway/logger"));
exports.default = async (ctx, _config, { strapi: _strapi }) => {
    if (ctx.state.user) {
        if (!ctx.request.body) {
            ctx.request.body = {};
        }
        if (!ctx.request.body.data) {
            ctx.request.body.data = {};
        }
        const userDetails = ctx.state.user;
        const requestData = ctx.request.body.data;
        // Build name from various sources (priority order)
        let name;
        if (userDetails.name) {
            // From Firebase token (Google auth usually has this)
            name = userDetails.name;
        }
        else if (requestData.name) {
            // From client request (Apple auth with our fallback)
            name = requestData.name;
        }
        else if (requestData.firstName || requestData.lastName) {
            // From client request (separate fields)
            name = [requestData.firstName, requestData.lastName].filter(Boolean).join(' ');
        }
        else if (userDetails.givenName || userDetails.familyName) {
            // From Firebase token (fallback)
            name = [userDetails.givenName, userDetails.familyName].filter(Boolean).join(' ');
        }
        // Strapi 5 is strict about keys - only set valid auth-user fields
        ctx.request.body.data = {
            user_id: userDetails.sub,
            email: userDetails.email,
            avatar: userDetails.picture,
            name,
        };
        logger_1.default.info("set-user policy: Prepared user data", {
            user_id: userDetails.sub,
            email: userDetails.email,
        });
        return true;
    }
    logger_1.default.warn("set-user policy: No user in state");
    return false;
};
