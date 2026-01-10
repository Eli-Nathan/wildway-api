"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../../../nomad/logger"));
exports.default = async (ctx, config, { strapi }) => {
    if (ctx.state.user) {
        if (!ctx.request.body) {
            ctx.request.body = {};
        }
        if (!ctx.request.body.data) {
            ctx.request.body.data = {};
        }
        const userDetails = ctx.state.user;
        ctx.request.body.data.user_id = userDetails.sub;
        ctx.request.body.data.email = userDetails.email;
        ctx.request.body.data.avatar = userDetails.picture;
        let name;
        if (userDetails.name) {
            name = userDetails.name;
        }
        else if (ctx.request.body.data.firstName &&
            ctx.request.body.data.lastName) {
            name = `${ctx.request.body.data.firstName} ${ctx.request.body.data.lastName}`;
        }
        else if (userDetails.givenName && userDetails.familyName) {
            name = `${userDetails.givenName} ${userDetails.familyName}`;
        }
        ctx.request.body.data.name = name;
        logger_1.default.info("New user added to DB", {
            user: userDetails,
        });
        return true;
    }
    logger_1.default.warn("Failed to add new user to DB");
    return false;
};
