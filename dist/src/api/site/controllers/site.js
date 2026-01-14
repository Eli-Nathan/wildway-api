"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const qs_1 = __importDefault(require("qs"));
const strapi_1 = require("@strapi/strapi");
const sanitizeApiResponse_1 = __importDefault(require("../../../nomad/sanitizeApiResponse"));
exports.default = strapi_1.factories.createCoreController("api::site.site", ({ strapi }) => ({
    async _find(ctx) {
        // @ts-expect-error - Strapi core controller method
        const sites = await super.find(ctx);
        // @ts-expect-error - Strapi core controller method
        return this.sanitizeOutput(sites, ctx);
    },
    async find(ctx) {
        var _a;
        const sites = await strapi.db.query("api::site.site").findMany({
            select: [
                "id",
                "title",
                "description",
                "category",
                "image",
                "lat",
                "lng",
                "slug",
            ],
            where: qs_1.default.parse(ctx.query.filters),
            orderBy: ctx.query.sort || { priority: "DESC" },
            populate: {
                type: {
                    populate: {
                        remote_icon: true,
                        remote_marker: true,
                    },
                },
                images: true,
                facilities: true,
                sub_types: true,
                owners: true,
            },
            limit: ctx.query.limit || ((_a = ctx.query.pagination) === null || _a === void 0 ? void 0 : _a.limit),
        });
        return {
            data: sites.map((site) => {
                var _a;
                return {
                    id: site.id,
                    attributes: { ...site, isOwned: !!((_a = site.owners) === null || _a === void 0 ? void 0 : _a.length) },
                };
            }),
        };
    },
    async findRecent(ctx) {
        var _a;
        const sites = await strapi.db.query("api::site.site").findMany({
            select: ["id", "title", "image", "lat", "lng", "slug"],
            where: {
                $or: [
                    {
                        owners: {
                            $not: null,
                        },
                    },
                    {
                        added_by: {
                            $not: null,
                        },
                    },
                ],
            },
            orderBy: ctx.query.sort || { priority: "DESC" },
            populate: {
                type: true,
                images: true,
            },
            limit: ctx.query.limit || ((_a = ctx.query.pagination) === null || _a === void 0 ? void 0 : _a.limit),
        });
        return {
            data: sites.map((site) => {
                var _a;
                return {
                    id: site.id,
                    attributes: { ...site, isOwned: !!((_a = site.owners) === null || _a === void 0 ? void 0 : _a.length) },
                };
            }),
        };
    },
    async findOne(ctx) {
        // @ts-expect-error - Strapi core controller method
        const site = await super.findOne(ctx);
        if (site) {
            const siteWithUsers = await strapi.db.query("api::site.site").findOne({
                where: { id: ctx.params.id },
                populate: {
                    images: true,
                    likes: true,
                    owners: {
                        populate: { profile_pic: true },
                    },
                    added_by: {
                        populate: { profile_pic: true },
                    },
                    contributors: {
                        populate: { profile_pic: true },
                    },
                },
            });
            // @ts-expect-error - Custom method
            return this.parseSingleSite(ctx, site, siteWithUsers);
        }
    },
    async findOneByUID(ctx) {
        const site = await strapi.db.query("api::site.site").findOne({
            where: { slug: ctx.params.uid },
            populate: {
                type: true,
                comments: true,
                owners: {
                    populate: { profile_pic: true },
                },
                facilities: true,
                sub_types: true,
                images: true,
            },
        });
        if (site) {
            const siteWithUsers = await strapi.db.query("api::site.site").findOne({
                where: { slug: ctx.params.uid },
                populate: {
                    owners: {
                        populate: { profile_pic: true },
                    },
                    added_by: {
                        populate: { profile_pic: true },
                    },
                    contributors: {
                        populate: { profile_pic: true },
                    },
                    images: true,
                },
            });
            const siteToParse = {
                data: {
                    attributes: {
                        ...site,
                    },
                },
            };
            // @ts-expect-error - Custom method
            return this.parseSingleSite(ctx, siteToParse, siteWithUsers, false);
        }
    },
    async search(ctx) {
        const { query, start = 0, limit = 25 } = ctx.request.query;
        const sites = await strapi
            .service("api::search.search")
            // @ts-expect-error - Service method
            .searchSites(query, start, limit);
        const unlistedSites = await strapi
            .service("api::search.search")
            // @ts-expect-error - Service method
            .searchUnlistedSites(query);
        // @ts-expect-error - Strapi core controller method
        return this.transformResponse([
            ...sites,
            ...unlistedSites.map(
            // @ts-expect-error - Service method
            strapi.service("api::search.search").transformOSMToUnlistedSite),
        ], ctx);
    },
    async parseSingleSite(ctx, site, siteWithUsers, shouldSanitizeChildren = true) {
        var _a, _b, _c, _d;
        const siteOwners = siteWithUsers === null || siteWithUsers === void 0 ? void 0 : siteWithUsers.owners;
        const siteLikes = siteWithUsers === null || siteWithUsers === void 0 ? void 0 : siteWithUsers.likes;
        const siteAddedBy = siteWithUsers === null || siteWithUsers === void 0 ? void 0 : siteWithUsers.added_by;
        const parsedSiteContributors = siteWithUsers.contributors.map((contributor) => {
            var _a;
            return ({
                id: contributor.id,
                name: contributor.name,
                businessName: contributor.businessName,
                score: contributor.score,
                level: contributor.level,
                avatar: ((_a = contributor.profile_pic) === null || _a === void 0 ? void 0 : _a.url) || contributor.avatar,
            });
        });
        const parsedSiteLikes = siteLikes === null || siteLikes === void 0 ? void 0 : siteLikes.map((likeUser) => {
            var _a;
            return ({
                id: likeUser.id,
                name: likeUser.name,
                businessName: likeUser.businessName,
                score: likeUser.score,
                level: likeUser.level,
                avatar: ((_a = likeUser.profile_pic) === null || _a === void 0 ? void 0 : _a.url) || likeUser.avatar,
            });
        });
        const parsedSiteAddedBy = siteAddedBy
            ? {
                id: siteAddedBy.id,
                name: siteAddedBy.name,
                businessName: siteAddedBy.businessName,
                score: siteAddedBy.score,
                level: siteAddedBy.level,
                avatar: ((_a = siteAddedBy.profile_pic) === null || _a === void 0 ? void 0 : _a.url) || siteAddedBy.avatar,
            }
            : null;
        const parsedSiteOwner = siteOwners && siteOwners.length > 0
            ? {
                id: siteOwners[0].id,
                name: siteOwners[0].name,
                businessName: siteOwners[0].businessName,
                score: siteOwners[0].score,
                level: siteOwners[0].level,
                avatar: ((_b = siteOwners[0].profile_pic) === null || _b === void 0 ? void 0 : _b.url) || siteOwners[0].avatar,
            }
            : null;
        const siteHasOwners = siteOwners ? siteOwners.length > 0 : false;
        const comments = (_d = (_c = site === null || site === void 0 ? void 0 : site.data) === null || _c === void 0 ? void 0 : _c.attributes) === null || _d === void 0 ? void 0 : _d.comments;
        const sanitizedComments = shouldSanitizeChildren
            ? (0, sanitizeApiResponse_1.default)(comments)
            : comments;
        const enrichedComments = await (await Promise.all((sanitizedComments || []).map(async (comment) => {
            var _a, _b;
            const commentEntity = await strapi.db
                .query("api::comment.comment")
                .findOne({
                where: { id: comment.id, status: "complete" },
                populate: {
                    owner: {
                        populate: true,
                    },
                },
            });
            if (commentEntity) {
                return {
                    ...comment,
                    owner: {
                        id: commentEntity.owner.id,
                        name: commentEntity.owner.businessName || commentEntity.owner.name,
                        avatar: ((_b = (_a = commentEntity.owner) === null || _a === void 0 ? void 0 : _a.profile_pic) === null || _b === void 0 ? void 0 : _b.url) ||
                            commentEntity.owner.avatar,
                    },
                };
            }
        }))).filter(Boolean);
        // @ts-expect-error - Strapi core controller method
        const output = await this.sanitizeOutput(site, ctx);
        return {
            ...output,
            data: {
                id: output.data.id,
                attributes: {
                    ...output.data.attributes,
                    comments: enrichedComments,
                    isOwned: siteHasOwners,
                    owner: parsedSiteOwner,
                    addedBy: parsedSiteAddedBy,
                    contributors: parsedSiteContributors,
                    likes: parsedSiteLikes,
                },
            },
        };
    },
}));
