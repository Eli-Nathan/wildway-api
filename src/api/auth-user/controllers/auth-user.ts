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
        website?: string;
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
 * Lightweight populate for auth/session - essential data + IDs only for lists
 */
const lightPopulateConfig = {
  role: true,
  profile_pic: true,
  favourites: {
    select: ["id"],
    populate: {
      type: true,
    },
  },
  saved_public_routes: {
    select: ["id"],
  },
  addition_requests: {
    select: ["id", "title", "status", "createdAt"],
  },
  edit_requests: {
    select: ["id", "status", "createdAt"],
    populate: {
      site: {
        select: ["id", "title"],
      },
    },
  },
  comments: {
    select: ["id", "createdAt"],
    populate: {
      site: {
        select: ["id", "title"],
      },
    },
  },
  sites: {
    select: ["id"],
  },
};

/**
 * Full populate config - for when complete user data is needed
 * Strapi 5 populate format - object notation required
 */
const fullPopulateConfig = {
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

// Keep backward compat alias
const populateConfig = fullPopulateConfig;

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
      // Use lightweight populate for fast auth - only essential data
      const user = await strapi.db.query("api::auth-user.auth-user").findOne({
        where: { id: ctx.params.id },
        populate: lightPopulateConfig,
      });

      if (!user) {
        return ctx.notFound("User not found");
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

    /**
     * Get full user data including all relations - use sparingly
     */
    async findMeFull(ctx: StrapiContext) {
      const user = await strapi.db.query("api::auth-user.auth-user").findOne({
        where: { id: ctx.params.id },
        populate: fullPopulateConfig,
      });

      if (!user) {
        return ctx.notFound("User not found");
      }

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
      });
      // Return only safe public fields
      const safeUsers = users.map((user: any) => ({
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        businessName: user.businessName,
        website: user.website,
        score: user.score,
        profile_pic: user.profile_pic,
      }));
      // @ts-expect-error - Strapi core controller method
      return await this.transformResponse(safeUsers);
    },

    async editProfile(ctx: StrapiContext) {
      const requestData = ctx.request.body?.data || {};
      const dataToUpdate: Record<string, unknown> = {};

      if (requestData.name) {
        dataToUpdate.name = requestData.name;
      }
      if (requestData.profilePic) {
        dataToUpdate.profile_pic = { set: [requestData.profilePic] };
      }
      if (requestData.businessName) {
        dataToUpdate.businessName = requestData.businessName;
      }
      if (requestData.website !== undefined) {
        dataToUpdate.website = requestData.website;
      }

      // Strapi 5: Use db.query directly
      const user = await strapi.db.query("api::auth-user.auth-user").update({
        where: { id: ctx.params.id },
        data: dataToUpdate,
        populate: populateConfig,
      });

      return {
        data: {
          id: user.id,
          attributes: user,
        },
        meta: {},
      };
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
      const newFavourites = ctx.request.body?.data?.favourites || [];

      // Get current favourites to detect changes
      const currentUser = await strapi.db.query("api::auth-user.auth-user").findOne({
        where: { id: ctx.params.id },
        populate: { favourites: { select: ["id"] } },
      });
      const oldFavourites = (currentUser?.favourites || []).map((f: any) => f.id);

      // Strapi 5: Use db.query directly (accepts array of IDs for relations)
      const user = await strapi.db.query("api::auth-user.auth-user").update({
        where: { id: ctx.params.id },
        data: { favourites: newFavourites },
        populate: populateConfig,
      });

      // Find sites that were added or removed from favourites
      const addedSites = newFavourites.filter((id: number) => !oldFavourites.includes(id));
      const removedSites = oldFavourites.filter((id: number) => !newFavourites.includes(id));
      const changedSites = [...addedSites, ...removedSites];

      // Update priority for affected sites (async, don't block response)
      if (changedSites.length > 0) {
        const moderatorService = strapi.plugin("moderator")?.service("moderator");
        if (moderatorService?.updateSitePriority) {
          // Run priority updates in background
          Promise.all(
            changedSites.map((siteId: number) =>
              moderatorService.updateSitePriority(siteId).catch((err: Error) =>
                strapi.log.error(`Failed to update priority for site ${siteId}:`, err)
              )
            )
          );
        }
      }

      return {
        data: {
          id: user.id,
          attributes: user,
        },
        meta: {},
      };
    },

    async updateSavedRoutes(ctx: StrapiContext) {
      const routeId = ctx.request.body?.data?.route;
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
          ...ctx,
          params: { id: ctx.params.id },
        })) as UserWithRoutes;

        const savedRoutes =
          currentUser.data.attributes.saved_public_routes.data.map(
            (r) => r.id
          ) || [];
        let newSavedRoutes: number[];
        if (savedRoutes.includes(routeId)) {
          newSavedRoutes = savedRoutes.filter((r) => r !== routeId);
        } else {
          newSavedRoutes = [...savedRoutes, routeId];
        }

        // Strapi 5: Use db.query directly
        const user = await strapi.db.query("api::auth-user.auth-user").update({
          where: { id: ctx.params.id },
          data: { saved_public_routes: newSavedRoutes },
          populate: populateConfig,
        });

        return {
          data: {
            id: user.id,
            attributes: user,
          },
          meta: {},
        };
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
