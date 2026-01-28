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
  route_metadata?: unknown;
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
    route_metadata,
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
    route_metadata,
  };
};

// Helper to format relation in Strapi 4 format
const formatRelation = (relation: Record<string, unknown> | null) => {
  if (!relation) return null;
  const { id, documentId, ...attrs } = relation;
  return { data: { id, attributes: attrs } };
};

export default factories.createCoreController(
  "api::edit-request.edit-request",
  ({ strapi }) => ({
    async find(ctx: StrapiContext) {
      const edits = await strapi.db.query("api::edit-request.edit-request").findMany({
        where: {
          owner: ctx.state.user?.id,
        },
        populate: {
          site: true,
          owner: true,
        },
      });

      return edits.map((edit) => {
        const { id, documentId, ...attributes } = edit;
        // Format site relation in Strapi 4 format
        if (attributes.site) {
          attributes.site = formatRelation(attributes.site as Record<string, unknown>);
        }
        return {
          id,
          ...attributes,
        };
      });
    },

    async findOne(ctx: StrapiContext & { params: { id: string } }) {
      const edit = await strapi.db.query("api::edit-request.edit-request").findOne({
        where: {
          id: ctx.params.id,
          owner: ctx.state.user?.id,
        },
        populate: {
          site: true,
          owner: true,
        },
      });

      if (!edit) {
        return { data: null };
      }

      const { id, documentId, ...attributes } = edit;
      if (attributes.site) {
        attributes.site = formatRelation(attributes.site as Record<string, unknown>);
      }
      return {
        data: {
          id,
          attributes,
        },
        meta: {},
      };
    },

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

      // Strapi 5: Use db.query directly (accepts simple IDs for relations)
      const requestData = ctx.request.body.data;
      const createdEdit = await strapi.db.query("api::edit-request.edit-request").create({
        data: {
          site: requestData.site,
          data: requestData.data,
          images: requestData.images,
          facilities: requestData.facilities,
          owner: ctx.state.user?.id,
        },
      });
      await sendEntryToSlack({ data: createdEdit }, "editRequest", ctx);

      // Fetch with site populated for the response
      const edit = await strapi.db.query("api::edit-request.edit-request").findOne({
        where: { id: createdEdit.id },
        populate: {
          site: true,
          owner: true,
        },
      });

      // Return in Strapi 4 format with site relation formatted
      const { id, documentId, ...attributes } = edit;
      if (attributes.site) {
        attributes.site = formatRelation(attributes.site as Record<string, unknown>);
      }
      return {
        data: {
          id,
          attributes,
        },
        meta: {},
      };
    },
  })
);
