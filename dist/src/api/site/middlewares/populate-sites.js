"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const populateList = [
    "type",
    "type.remote_icon",
    "type.remote_marker",
    "facilities",
    "sub_types",
    "tags",
    "images",
];
const enrichCtx = (ctx) => {
    if (!ctx.query) {
        ctx.query = {};
    }
    const currentPopulateList = ctx.query.populate || [];
    ctx.query.populate = [...currentPopulateList, ...populateList];
    return ctx;
};
const populateSites = (_config, { strapi: _strapi }) => {
    return async (context, next) => {
        enrichCtx(context);
        await next();
    };
};
exports.default = populateSites;
