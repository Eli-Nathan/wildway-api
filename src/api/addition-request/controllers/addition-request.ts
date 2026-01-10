// @ts-nocheck
import { factories } from "@strapi/strapi";
import { sendEntryToSlack } from "../../../nomad/slack";

interface StrapiContext {
  request: {
    body: {
      data: {
        addingBusiness?: boolean;
        [key: string]: unknown;
      };
    };
  };
  state: {
    user?: {
      id: number;
      role?: {
        level: number;
      };
      siteCount?: number;
      maxSites?: number;
    };
  };
}

export default factories.createCoreController(
  "api::addition-request.addition-request",
  ({ strapi }) => ({
    async create(ctx: StrapiContext) {
      if (ctx.state.user) {
        if (
          ctx.request.body.data.addingBusiness &&
          ctx.state.user.role &&
          ctx.state.user.role.level > 0 &&
          (ctx.state.user.siteCount || 0) < (ctx.state.user.maxSites || 0)
        ) {
          const newSite = await strapi.db.query(`api::site.site`).create({
            data: {
              ...ctx.request.body.data,
              owners: [ctx.state.user.id],
            },
          });
          return {
            data: {
              attributes: {
                // @ts-expect-error - Strapi core controller method
                site: await this.sanitizeOutput(newSite, ctx),
                ownerUpdated: true,
              },
            },
          };
        } else {
          // @ts-expect-error - Strapi core controller method
          const addition = await super.create(ctx);
          await sendEntryToSlack(addition, "additionRequest", ctx);
          // @ts-expect-error - Strapi core controller method
          return this.sanitizeOutput(addition, ctx);
        }
      }
    },
  })
);
