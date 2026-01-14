"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../../../nomad/logger"));
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
        // Build name from various sources
        let name;
        if (userDetails.name) {
            name = userDetails.name;
        }
        else if (requestData.firstName && requestData.lastName) {
            name = `${requestData.firstName} ${requestData.lastName}`;
        }
        else if (userDetails.givenName && userDetails.familyName) {
            name = `${userDetails.givenName} ${userDetails.familyName}`;
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
