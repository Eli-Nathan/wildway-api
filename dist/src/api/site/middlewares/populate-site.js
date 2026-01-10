"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const populateList = [
    "type",
    "type.remote_icon",
    "type.remote_marker",
    "type",
    "comments",
    "comments.owner",
    "comments.site",
    "owners",
    "facilities",
    "sub_types",
    "images",
    "tags",
    "likes",
];
const enrichCtx = (ctx) => {
    if (!ctx.query) {
        ctx.query = {};
    }
    const currentPopulateList = ctx.query.populate || [];
    ctx.query.populate = [...currentPopulateList, ...populateList];
    return ctx;
};
const populateSite = (_config, { strapi: _strapi }) => {
    return async (context, next) => {
        enrichCtx(context);
        await next();
    };
};
exports.default = populateSite;
