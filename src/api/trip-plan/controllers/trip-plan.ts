import { factories } from "@strapi/strapi";

const populateConfig = {
  stops: {
    populate: {
      site: {
        populate: {
          type: true,
          images: true,
        },
      },
    },
  },
  owner: true,
  shares: true,
  checkins: true,
};

export default factories.createCoreController(
  "api::trip-plan.trip-plan",
  ({ strapi }) => ({
    async create(ctx) {
      const requestData = ctx.request.body?.data || {};

      const plan = await strapi.db.query("api::trip-plan.trip-plan").create({
        data: {
          name: requestData.name,
          description: requestData.description || null,
          timingMode: requestData.timingMode || "flexible",
          status: requestData.status || "draft",
          startDate: requestData.startDate || null,
          endDate: requestData.endDate || null,
          shareCode: requestData.shareCode || null,
          overdueAlertsEnabled: requestData.overdueAlertsEnabled ?? false,
          autoCheckinEnabled: requestData.autoCheckinEnabled ?? false,
          owner: ctx.state.user?.id,
          stops: (requestData.stops || []).map((stop: any) => ({
            site: stop.site?.id ?? stop.site ?? null,
            customLocation: stop.customLocation || null,
            dayNumber: stop.dayNumber || null,
            plannedArrival: stop.plannedArrival || null,
            plannedDeparture: stop.plannedDeparture || null,
            notes: stop.notes || null,
          })),
        },
        populate: populateConfig,
      });

      return {
        data: {
          id: plan.id,
          attributes: plan,
        },
        meta: {},
      };
    },

    async update(ctx) {
      const requestData = ctx.request.body?.data || {};

      const existing = await strapi.db
        .query("api::trip-plan.trip-plan")
        .findOne({
          where: { id: ctx.params.id },
        });

      if (!existing) {
        ctx.status = 404;
        return { status: 404, message: "Plan not found" };
      }

      const updated = await strapi.db
        .query("api::trip-plan.trip-plan")
        .update({
          where: { id: ctx.params.id },
          data: {
            ...requestData,
            ...(requestData.stops && {
              stops: requestData.stops.map((stop: any) => ({
                site: stop.site?.id ?? stop.site ?? null,
                customLocation: stop.customLocation || null,
                dayNumber: stop.dayNumber || null,
                plannedArrival: stop.plannedArrival || null,
                plannedDeparture: stop.plannedDeparture || null,
                notes: stop.notes || null,
              })),
            }),
          },
          populate: populateConfig,
        });

      return {
        data: {
          id: updated.id,
          attributes: updated,
        },
        meta: {},
      };
    },
  })
);
