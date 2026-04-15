import { factories } from "@strapi/strapi";
import qs from "qs";

export default factories.createCoreController(
  "api::affiliate.affiliate",
  ({ strapi }) => ({
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
        } else if (placeAffiliate && placeAffiliate.fallback_url) {
          targetUrl = placeAffiliate.fallback_url;
        } else if (affiliate.search_url_template) {
          // Automated backfilling logic (Phase 1 of Strategy)
          const site = await strapi.db.query("api::site.site").findOne({
            where: { id: siteId },
          });

          if (site) {
            let template = affiliate.search_url_template;
            template = template.replace(/{{name}}/g, encodeURIComponent(site.title || ""));
            template = template.replace(/{{region}}/g, encodeURIComponent(site.region || ""));
            targetUrl = template;
          }
        }
      }

      // If a manual deep link is passed, it takes precedence (e.g., from a webview interception)
      if (deepLink) {
        targetUrl = decodeURIComponent(deepLink as string);
      }

      // Attach default affiliate params if available
      if (affiliate.default_params && targetUrl) {
        const params = typeof affiliate.default_params === 'string'
          ? JSON.parse(affiliate.default_params)
          : affiliate.default_params;

        const urlObj = new URL(targetUrl);
        const queryParams = qs.parse(urlObj.search, { ignoreQueryPrefix: true });

        const mergedParams = { ...queryParams, ...params };
        urlObj.search = qs.stringify(mergedParams);
        targetUrl = urlObj.toString();
      }

      // Log click (future step: implement recordAffiliateClick)
      strapi.log.info(`Affiliate click recorded: ${affiliate.name} (siteId: ${siteId || 'none'})`);

      // Redirect user externally
      if (targetUrl) {
        ctx.redirect(targetUrl);
      } else {
        return ctx.badRequest("No target URL available for redirect");
      }
    },
  })
);
