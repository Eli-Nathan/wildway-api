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

/**
 * Strapi 5 populate format - object notation required
 * Converting from nested dot-notation arrays to object format
 */
const populateConfig = {
  addition_requests: true,
  edit_requests: {
    populate: {
      site: {
        populate: {
          type: true,
        },
      },
    },
  },
  saved_public_routes: true,
  role: true,
  favourites: {
    populate: {
      type: true,
    },
  },
  profile_pic: true,
  comments: {
    populate: {
      site: true,
    },
  },
  sites: {
    populate: {
      type: true,
      images: true,
    },
  },
  sites_added: {
    populate: {
      type: true,
      images: true,
    },
  },
};

const enrichCtx = (ctx: StrapiContext): StrapiContext => {
  if (!ctx.query) {
    ctx.query = {};
  }
  const existingPopulate = ctx.query.populate || {};
  if (typeof existingPopulate === "object" && !Array.isArray(existingPopulate)) {
    ctx.query.populate = { ...existingPopulate, ...populateConfig };
  } else {
    ctx.query.populate = populateConfig;
  }
  return ctx;
};

export default factories.createCoreController(
  "api::auth-user.auth-user",
  ({ strapi }) => ({
    async findMe(ctx: StrapiContext) {
      strapi.log.info("findMe: Looking up user with id:", ctx.params.id);

      // Use db.query directly for Strapi 5 compatibility with nested object populate
      const user = await strapi.db.query("api::auth-user.auth-user").findOne({
        where: { id: ctx.params.id },
        populate: populateConfig,
      });

      if (!user) {
        strapi.log.warn("findMe: User not found");
        return ctx.notFound("User not found");
      }

      strapi.log.info("findMe: Found user:", user.id);

      // Return in Strapi 4 format for frontend compatibility
      return {
        data: {
          id: user.id,
          attributes: user,
        },
        meta: {},
      };
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
      const user = await strapi.db.query("api::auth-user.auth-user").findOne({
        where: { id: ctx.params.id },
        populate: {
          profile_pic: true,
          sites: {
            select: ["id"],
          },
          sites_added: {
            select: ["id"],
          },
          user_routes: {
            select: ["id", "public"],
          },
        },
      });
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
      const users = await strapi.db.query("api::auth-user.auth-user").findMany({
        offset: 0,
        limit: 10,
        where: {
          isVerified: true,
          id: {
            $not: ctx.state.user.id,
          },
          score: {
            $gt: 0,
          },
          isTest: false,
        },
        orderBy: { score: "desc" },
        populate: {
          profile_pic: true,
        },
        select: ["id", "name", "avatar", "businessName", "score"],
      });
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
      strapi.log.info("verifyEmail: Updating user:", ctx.params.id);
      const userDetails = ctx.state.user;

      // Use db.query directly for Strapi 5 compatibility
      const user = await strapi.db.query("api::auth-user.auth-user").update({
        where: { id: ctx.params.id },
        data: { isVerified: userDetails.email_verified },
      });

      strapi.log.info("verifyEmail: Updated user:", user?.id);

      return {
        data: {
          id: user.id,
          attributes: user,
        },
        meta: {},
      };
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
      strapi.log.info("auth-user create: Starting user creation");
      if (!ctx.request.body) {
        ctx.request.body = {};
      }
      if (!ctx.request.body.data) {
        ctx.request.body.data = {};
      }
      const requestData = ctx.request.body.data as Record<string, unknown>;
      strapi.log.info("auth-user create: Request body data:", JSON.stringify(requestData));

      const baseRole = await strapi.db
        .query(`api::user-role.user-role`)
        .findOne({
          where: {
            level: 0,
          },
        });
      strapi.log.info("auth-user create: Base role found:", JSON.stringify(baseRole));

      if (!baseRole) {
        strapi.log.error("auth-user create: No base role found with level 0");
        ctx.throw(500, "Base user role not configured");
      }

      // Use db.query directly for Strapi 5 compatibility
      let user;
      try {
        user = await strapi.db.query("api::auth-user.auth-user").create({
          data: {
            user_id: requestData.user_id,
            email: requestData.email,
            name: requestData.name,
            avatar: requestData.avatar,
            role: baseRole.id, // Direct ID works with db.query
          },
        });
        strapi.log.info("auth-user create: User created:", JSON.stringify(user));
      } catch (error) {
        strapi.log.error("auth-user create: Error creating user:", error);
        throw error;
      }

      if (user) {
        strapi.log.info("auth-user create: Sending welcome email for user:", user.id);
        const { text, html, subject } = newUserAdded(user.name || "Name unknown", user.id);
        await sendEmail({
          strapi,
          subject,
          address: "wildway.app@gmail.com",
          text,
          html,
        });
      }

      // Return in Strapi 4 format for frontend compatibility
      return {
        data: {
          id: user.id,
          attributes: user,
        },
        meta: {},
      };
    },
  })
);
