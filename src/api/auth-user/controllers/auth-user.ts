// @ts-nocheck
import { factories } from "@strapi/strapi";
import { newUserAdded, sendEmail } from "../../../nomad/emails";

interface StrapiContext {
  query: {
    populate?: string[];
  };
  params: {
    id?: string;
  };
  state: {
    user: {
      id: number;
      email: string;
      email_verified?: boolean;
    };
  };
  request: {
    body?: {
      data?: {
        name?: string;
        profilePic?: number;
        businessName?: string;
        favourites?: unknown[];
        route?: number;
        isVerified?: boolean;
      };
    };
  };
  status?: number;
}

interface UserRoute {
  id: number;
  public?: boolean;
}

interface UserWithRoutes {
  data: {
    attributes: {
      saved_public_routes: {
        data: Array<{ id: number }>;
      };
    };
  };
}

const dangerousList = [
  "addition_requests",
  "edit_requests",
  "saved_public_routes",
  "edit_requests.site",
  "edit_requests.site.type",
  "role",
];

const safePopulateList = [
  "favourites",
  "favourites.type",
  "profile_pic",
  "comments",
  "comments.site",
  "sites",
  "sites.type",
  "sites.images",
  "sites_added",
  "sites_added.type",
  "sites_added.images",
];

const populateList = [...dangerousList, ...safePopulateList];

const enrichCtx = (ctx: StrapiContext): StrapiContext => {
  if (!ctx.query) {
    ctx.query = {};
  }
  const currentPopulateList = ctx.query.populate || [];
  ctx.query.populate = [...currentPopulateList, ...populateList];
  return ctx;
};

export default factories.createCoreController(
  "api::auth-user.auth-user",
  ({ strapi }) => ({
    async findMe(ctx: StrapiContext) {
      const enrichedCtx = enrichCtx(ctx);
      // @ts-expect-error - Strapi core controller method
      const user = await super.findOne(enrichedCtx);
      // @ts-expect-error - Strapi core controller method
      return this.sanitizeOutput(user, ctx);
    },

    async getSubscription(ctx: StrapiContext) {
      // @ts-expect-error - Strapi core controller method
      const user = await super.findOne(ctx);
      const sub = await strapi
        .plugin("strapi-stripe")
        .service("stripeService")
        .searchSubscriptionStatus(ctx.state.user.email);
      if (!sub || !sub?.data || !sub?.data?.[0]) {
        // @ts-expect-error - Strapi core controller method
        return this.sanitizeOutput(undefined, ctx);
      }
      const subData = sub.data[0];
      // @ts-expect-error - Strapi core controller method
      return this.sanitizeOutput(subData, ctx);
    },

    async getProfile(ctx: StrapiContext) {
      const user = await strapi.entityService.findOne(
        `api::auth-user.auth-user`,
        ctx.params.id as string,
        {
          populate: {
            profile_pic: true,
            sites: {
              fields: "id",
            },
            sites_added: {
              fields: "id",
            },
            user_routes: {
              fields: ["id", "public"],
            },
          },
        }
      );
      const {
        maxSites,
        createdAt,
        updatedAt,
        allowMarketing,
        isVerified,
        user_id,
        ...safeUser
      } = user as Record<string, unknown>;
      const typedSafeUser = safeUser as {
        id: number;
        sites: Array<{ id: number }>;
        sites_added: Array<{ id: number }>;
        user_routes: UserRoute[];
      };
      const safeUserRelations = {
        sites: typedSafeUser.sites.map((site) => site.id),
        sites_added: typedSafeUser.sites_added.map((site) => site.id),
        user_routes: typedSafeUser.user_routes
          .map((route) => {
            const isOwner = Number(ctx.state.user.id) === Number(ctx.params.id);
            if (!isOwner && !route.public) {
              return;
            }
            return route.id;
          })
          .filter(Boolean),
      };
      const response = {
        data: {
          id: typedSafeUser.id,
          attributes: {
            ...safeUser,
            ...safeUserRelations,
          },
        },
        meta: {},
      };
      // @ts-expect-error - Strapi core controller method
      return this.sanitizeOutput(response, ctx);
    },

    async getHighProfileUsers(ctx: StrapiContext) {
      const users = await strapi.entityService.findMany(
        "api::auth-user.auth-user",
        {
          start: 0,
          limit: 10,
          filters: {
            isVerified: true,
            id: {
              $not: ctx.state.user.id,
            },
            score: {
              $gt: 0,
            },
            isTest: false,
          },
          sort: "score:desc",
          populate: {
            profile_pic: true,
          },
          fields: ["name", "avatar", "businessName", "score"],
        }
      );
      // @ts-expect-error - Strapi core controller method
      return await this.transformResponse(users);
    },

    async editProfile(ctx: StrapiContext) {
      let dataToUpdate: Record<string, unknown> = {};
      const enrichedCtx = enrichCtx(ctx);
      if (!enrichedCtx.request.body) {
        enrichedCtx.request.body = {};
      }
      if (!enrichedCtx.request.body.data) {
        enrichedCtx.request.body.data = {};
      }
      if (enrichedCtx.request.body.data.name) {
        dataToUpdate.name = enrichedCtx.request.body.data.name;
      }
      if (enrichedCtx.request.body.data.profilePic) {
        dataToUpdate.profile_pic = enrichedCtx.request.body.data.profilePic;
      }
      if (enrichedCtx.request.body.data.businessName) {
        dataToUpdate.businessName = enrichedCtx.request.body.data.businessName;
      }
      enrichedCtx.request.body.data = dataToUpdate as typeof enrichedCtx.request.body.data;
      // @ts-expect-error - Strapi core controller method
      const user = await super.update(enrichedCtx);
      // @ts-expect-error - Strapi core controller method
      return this.sanitizeOutput(user, ctx);
    },

    async verifyEmail(ctx: StrapiContext) {
      const enrichedCtx = enrichCtx(ctx);
      const userDetails = ctx.state.user;
      ctx.request.body = { data: { isVerified: userDetails.email_verified } };
      // @ts-expect-error - Strapi core controller method
      const user = await super.update(enrichedCtx);
      // @ts-expect-error - Strapi core controller method
      return this.sanitizeOutput(user, ctx);
    },

    async updateFavourites(ctx: StrapiContext) {
      const enrichedCtx = enrichCtx(ctx);
      if (!enrichedCtx.request.body) {
        enrichedCtx.request.body = {};
      }
      if (!enrichedCtx.request.body.data) {
        enrichedCtx.request.body.data = {};
      }
      if (!enrichedCtx.request.body.data.favourites) {
        enrichedCtx.request.body.data.favourites = [];
      }
      const { favourites } = enrichedCtx.request.body.data;
      enrichedCtx.request.body.data = {
        favourites,
      } as typeof enrichedCtx.request.body.data;
      // @ts-expect-error - Strapi core controller method
      const user = await super.update(enrichedCtx);
      // @ts-expect-error - Strapi core controller method
      return this.sanitizeOutput(user, ctx);
    },

    async updateSavedRoutes(ctx: StrapiContext) {
      const enrichedCtx = enrichCtx(ctx);
      const routeId = enrichedCtx.request.body?.data?.route;
      if (!routeId) {
        return {
          status: 400,
          message: "Bad request",
        };
      }
      const serverRoute = await strapi.db
        .query("api::user-route.user-route")
        .findOne({
          where: {
            id: routeId,
          },
        });

      if (serverRoute.public) {
        // @ts-expect-error - Custom method on this
        const currentUser = (await this.findMe({
          ...enrichedCtx,
          params: { id: enrichedCtx.params.id },
        })) as UserWithRoutes;

        const savedRoutes =
          currentUser.data.attributes.saved_public_routes.data.map(
            (r) => r.id
          ) || [];
        if (savedRoutes.includes(routeId)) {
          enrichedCtx.request.body!.data = {
            saved_public_routes: savedRoutes.filter((r) => r !== routeId),
          } as unknown as typeof enrichedCtx.request.body.data;
        } else {
          enrichedCtx.request.body!.data = {
            saved_public_routes: [...savedRoutes, routeId],
          } as unknown as typeof enrichedCtx.request.body.data;
        }
        // @ts-expect-error - Strapi core controller method
        const user = await super.update(enrichedCtx);
        // @ts-expect-error - Strapi core controller method
        return this.sanitizeOutput(user, ctx);
      } else {
        ctx.status = 400;
        return {
          status: 400,
          message: "Cannot save a route that isn't public",
        };
      }
    },

    async create(ctx: StrapiContext) {
      const enrichedCtx = enrichCtx(ctx);
      if (!ctx.request.body) {
        ctx.request.body = {};
      }
      if (!ctx.request.body.data) {
        ctx.request.body.data = {};
      }

      const baseRole = await strapi.db
        .query(`api::user-role.user-role`)
        .findOne({
          where: {
            level: 0,
          },
        });

      (ctx.request.body.data as Record<string, unknown>).role = baseRole.id;
      // @ts-expect-error - Strapi core controller method
      const user = await super.create(enrichedCtx);
      if (user) {
        const { text, html, subject } = newUserAdded(
          (user as { data: { attributes: { name?: string }; id: number } }).data.attributes.name || "Name unknown",
          (user as { data: { id: number } }).data.id
        );
        await sendEmail({
          strapi,
          subject,
          address: "wildway.app@gmail.com",
          text,
          html,
        });
      }
      // @ts-expect-error - Strapi core controller method
      return this.sanitizeOutput(user, ctx);
    },
  })
);
