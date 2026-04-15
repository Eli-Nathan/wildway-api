"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
const qs_1 = __importDefault(require("qs"));
exports.default = strapi_1.factories.createCoreController("api::affiliate.affiliate", ({ strapi }) => ({
    async redirect(ctx) {
        const { affiliateId, siteId, deepLink } = ctx.query;
        if (!affiliateId) {
            return ctx.badRequest("Missing affiliateId");
        }
        // Fetch affiliate
        const affiliate = await strapi.db.query("api::affiliate.affiliate").findOne({
            where: { id: affiliateId },
        });
        if (!affiliate) {
            return ctx.notFound("Affiliate not found");
        }
        let targetUrl = affiliate.base_url || "";
        // If siteId is provided, try to find a site-specific deep link
        if (siteId) {
            const placeAffiliate = await strapi.db.query("api::place-affiliate.place-affiliate").findOne({
                where: {
                    site: { id: siteId },
                    affiliate: { id: affiliateId },
                },
            });
            if (placeAffiliate && placeAffiliate.deep_link_url) {
                targetUrl = placeAffiliate.deep_link_url;
            }
            else if (placeAffiliate && placeAffiliate.fallback_url) {
                targetUrl = placeAffiliate.fallback_url;
            }
        }
        // If a manual deep link is passed, it takes precedence (e.g., from a webview interception)
        if (deepLink) {
            targetUrl = decodeURIComponent(deepLink);
        }
        // Attach default affiliate params if available
        if (affiliate.default_params && targetUrl) {
            const params = typeof affiliate.default_params === 'string'
                ? JSON.parse(affiliate.default_params)
                : affiliate.default_params;
            const urlObj = new URL(targetUrl);
            const queryParams = qs_1.default.parse(urlObj.search, { ignoreQueryPrefix: true });
            const mergedParams = { ...queryParams, ...params };
            urlObj.search = qs_1.default.stringify(mergedParams);
            targetUrl = urlObj.toString();
        }
        // Log click (future step: implement recordAffiliateClick)
        strapi.log.info(`Affiliate click recorded: ${affiliate.name} (siteId: ${siteId || 'none'})`);
        // Redirect user externally
        if (targetUrl) {
            ctx.redirect(targetUrl);
        }
        else {
            return ctx.badRequest("No target URL available for redirect");
        }
    },
}));
