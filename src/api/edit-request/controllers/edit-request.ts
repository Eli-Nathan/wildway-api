// @ts-nocheck
import { factories } from "@strapi/strapi";
import { sendEntryToSlack } from "../../../nomad/slack";

interface StrapiContext {
  request: {
    body: {
      data: {
        site?: number;
        data?: SiteData;
        images?: number[];
      };
    };
  };
  state: {
    user?: {
      id: number;
    };
  };
}

interface SiteData {
  title?: string;
  description?: string;
  tel?: string;
  email?: string;
  facilities?: unknown[];
  pricerange?: string;
  url?: string;
  sub_types?: unknown[];
  type?: unknown;
}

interface Site {
  owners?: Array<{ id: number }>;
}

const getEditableFieldsFromSite = (siteData: SiteData): SiteData => {
  const {
    title,
    description,
    tel,
    email,
    facilities,
    pricerange,
    url,
    sub_types,
    type,
  } = siteData;
  return {
    title,
    description,
    tel,
    email,
    facilities,
    pricerange,
    sub_types,
    url,
    type,
  };
};

export default factories.createCoreController(
  "api::edit-request.edit-request",
  ({ strapi }) => ({
    async create(ctx: StrapiContext) {
      const siteId = ctx.request.body.data.site;
      if (ctx.state.user) {
        const site = (await strapi.db.query(`api::site.site`).findOne({
          where: {
            id: siteId,
          },
          populate: {
            owners: true,
          },
        })) as Site;
        const ownersIds = site?.owners?.map((s) => s.id).filter(Boolean);
        const isOwnerEditing = ownersIds?.includes(ctx.state.user.id);
        if (isOwnerEditing) {
          const safeData = getEditableFieldsFromSite(
            ctx.request.body.data.data as SiteData
          );
          const images = Array.isArray(ctx.request.body.data.images)
            ? { images: ctx.request.body.data.images }
            : {};
          const newSite = await strapi.db.query(`api::site.site`).update({
            where: { id: siteId },
            data: {
              ...safeData,
              ...images,
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
        }
      }
      // @ts-expect-error - Strapi core controller method
      const edit = await super.create(ctx);
      await sendEntryToSlack(edit, "editRequest", ctx);
      // @ts-expect-error - Strapi core controller method
      return this.sanitizeOutput(edit, ctx);
    },
  })
);
