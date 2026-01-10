"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const logger_1 = __importDefault(require("./nomad/logger"));
(0, app_1.initializeApp)({
    credential: (0, app_1.applicationDefault)(),
});
exports.default = {
    /**
     * An asynchronous register function that runs before
     * your application is initialized.
     *
     * This gives you an opportunity to extend code.
     */
    register({ strapi }) {
        strapi.container.get("auth").register("content-api", {
            name: "firebase-jwt-verifier",
            async authenticate(ctx) {
                if (ctx.state.user) {
                    logger_1.default.info("User already authed", {
                        user: ctx.state.user,
                    });
                    return { authenticated: true, credentials: ctx.state.user };
                }
                if (ctx.request &&
                    ctx.request.header &&
                    ctx.request.header.authorization) {
                    try {
                        const token = ctx.request.header.authorization.replace("Bearer ", "");
                        const userData = (await (0, auth_1.getAuth)().verifyIdToken(token));
                        const nomadUser = (await strapi.db
                            .query(`api::auth-user.auth-user`)
                            .findOne({
                            where: {
                                user_id: userData.sub,
                            },
                            populate: {
                                role: true,
                                sites: true,
                            },
                        }));
                        if (nomadUser && userData) {
                            if (nomadUser.sites) {
                                nomadUser.siteCount = nomadUser.sites.length || 0;
                            }
                            const mergedData = { ...userData, ...nomadUser };
                            logger_1.default.info("User from DB verified with Firebase", {
                                email: mergedData.email,
                            });
                            ctx.state.user = mergedData;
                            return { authenticated: true, credentials: mergedData };
                        }
                        if (nomadUser) {
                            logger_1.default.warn("User from DB potentially unverified", {
                                email: nomadUser.email,
                            });
                            ctx.state.user = { ...nomadUser, sub: userData.sub };
                            return { authenticated: true, credentials: nomadUser };
                        }
                        if (userData) {
                            ctx.state.user = userData;
                            return { authenticated: true, credentials: userData };
                        }
                        return { authenticated: false };
                    }
                    catch (error) {
                        logger_1.default.error("User login error ", error);
                        return ctx.unauthorized(error);
                    }
                }
                logger_1.default.warn("User login unsuccessful");
                return { authenticated: false };
            },
        });
    },
    /**
     * An asynchronous bootstrap function that runs before
     * your application gets started.
     *
     * This gives you an opportunity to set up your data model,
     * run jobs, or perform some special logic.
     */
    bootstrap( /* { strapi } */) { },
};
