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

      // Debug: log what we're receiving
      const ownerId = typeof requestData.owner === "object" ? requestData.owner?.id : requestData.owner ?? ctx.state.user?.id;
      const mappedStops = (requestData.stops || []).map((stop: any) => {
        const siteVal = typeof stop.site === "object" && stop.site !== null ? stop.site.id : stop.site;
        return {
          site: siteVal ?? null,
          customLocation: stop.customLocation || null,
          dayNumber: stop.dayNumber || null,
          plannedArrival: stop.plannedArrival || null,
          plannedDeparture: stop.plannedDeparture || null,
          notes: stop.notes || null,
        };
      });

      console.log("trip-plan create - owner:", ownerId, "typeof:", typeof ownerId);
      console.log("trip-plan create - stops:", JSON.stringify(mappedStops));
      console.log("trip-plan create - raw requestData.owner:", JSON.stringify(requestData.owner));

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
          owner: ownerId,
          stops: mappedStops.map((stop: any) => ({
            site: stop.site,
            customLocation: stop.customLocation || null,
            dayNumber: stop.dayNumber || null,
            plannedArrival: stop.plannedArrival || null,
            plannedDeparture: stop.plannedDeparture || null,
            notes: stop.notes || null,
          })),
        },
      });

      // Re-fetch with full population
      const populated = await strapi.db.query("api::trip-plan.trip-plan").findOne({
        where: { id: plan.id },
        populate: populateConfig,
      });

      return {
        data: {
          id: populated.id,
          attributes: populated,
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
