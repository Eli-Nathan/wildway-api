"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const populateList = ["relevance"];
const enrichCtx = (ctx) => {
    var _a;
    if (!ctx.query) {
        ctx.query = {};
    }
    const currentPopulateList = ctx.query.populate || [];
    ctx.query.populate = [...currentPopulateList, ...populateList];
    if (!ctx.query.pagination) {
        ctx.query.pagination = {};
    }
    ctx.query.pagination = {
        ...ctx.query.pagination,
        pageSize: ((_a = ctx.query.pagination) === null || _a === void 0 ? void 0 : _a.pageSize) || 100,
    };
    return ctx;
};
const populateFacilities = (_config, { strapi: _strapi }) => {
    return async (context, next) => {
        enrichCtx(context);
        await next();
    };
};
exports.default = populateFacilities;
