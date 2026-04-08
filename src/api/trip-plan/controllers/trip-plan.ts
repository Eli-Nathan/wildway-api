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

      const ownerId =
        typeof requestData.owner === "object"
          ? requestData.owner?.id
          : (requestData.owner ?? ctx.state.user?.id);

      const stops = (requestData.stops || []).map((stop: any) => ({
        site:
          typeof stop.site === "object" && stop.site !== null
            ? stop.site.id
            : (stop.site ?? null),
        customLocation: stop.customLocation || null,
        dayNumber: stop.dayNumber || null,
        plannedArrival: stop.plannedArrival || null,
        plannedDeparture: stop.plannedDeparture || null,
        notes: stop.notes || null,
      }));

      const plan = await strapi.documents("api::trip-plan.trip-plan").create({
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
          stops,
        },
        populate: populateConfig,
      });

      return {
        data: {
          id: plan.id,
          documentId: plan.documentId,
          attributes: plan,
        },
        meta: {},
      };
    },

    async findOne(ctx) {
      const { id } = ctx.params;

      // Check if ID is numeric
      const isNumeric = /^\d+$/.test(id);

      let entity;
      if (isNumeric) {
        // If numeric, look up using db.query to get the record and its documentId
        entity = await strapi.db.query("api::trip-plan.trip-plan").findOne({
          where: { id },
          populate: populateConfig,
        });
      } else {
        // If not numeric, use standard document service (expects documentId)
        entity = await strapi.documents("api::trip-plan.trip-plan").findOne({
          documentId: id,
          populate: populateConfig,
        });
      }

      if (!entity) {
        return ctx.notFound();
      }

      return {
        data: {
          id: entity.id,
          documentId: entity.documentId,
          attributes: entity,
        },
        meta: {},
      };
    },

    async update(ctx) {
      const requestData = ctx.request.body?.data || {};

      // In Strapi 5, we can update by documentId OR id using the documents service
      // But we first need to find the entity to get its documentId if an ID was passed
      const existing = await strapi.db
        .query("api::trip-plan.trip-plan")
        .findOne({
          where: { id: ctx.params.id },
        });

      if (!existing) {
        ctx.status = 404;
        return { status: 404, message: "Plan not found" };
      }

      const updated = await strapi.documents("api::trip-plan.trip-plan").update({
        documentId: existing.documentId,
        data: {
          ...requestData,
          ...(requestData.stops && {
            stops: requestData.stops.map((stop: any) => ({
              site:
                typeof stop.site === "object" && stop.site !== null
                  ? stop.site.id
                  : (stop.site ?? null),
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
          documentId: updated.documentId,
          attributes: updated,
        },
        meta: {},
      };
    },
  })
);
