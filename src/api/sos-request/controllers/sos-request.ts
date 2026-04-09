import { factories } from "@strapi/strapi";
import { createNotification } from "../../../wildway/notifications/notificationService";

export default factories.createCoreController(
  "api::sos-request.sos-request",
  ({ strapi }) => ({
    // POST /sos-requests — send an SOS contact request
    async create(ctx) {
      const currentUser = ctx.state.user;
      const { to } = ctx.request.body?.data || {};

      const toId = typeof to === "object" ? to?.id : to;

      if (!toId) {
        ctx.status = 400;
        return { error: "Missing 'to' user" };
      }

      if (Number(toId) === currentUser.id) {
        ctx.status = 400;
        return { error: "Cannot send SOS request to yourself" };
      }

      // Check for existing pending request in either direction
      const existing = await strapi.db
        .query("api::sos-request.sos-request")
        .findOne({
          where: {
            $or: [
              {
                from: { id: currentUser.id },
                to: { id: toId },
                status: "pending",
              },
              {
                from: { id: toId },
                to: { id: currentUser.id },
                status: "pending",
              },
            ],
          },
        });

      if (existing) {
        ctx.status = 409;
        return { error: "A pending request already exists" };
      }

      // Check if already SOS contacts
      const owner = await strapi.db
        .query("api::auth-user.auth-user")
        .findOne({
          where: { id: currentUser.id },
          populate: ["sos_contacts"],
        });

      const alreadyContact = (owner?.sos_contacts || []).some(
        (c: any) => c.id === Number(toId)
      );

      if (alreadyContact) {
        ctx.status = 409;
        return { error: "Already an SOS contact" };
      }

      const request = await strapi
        .documents("api::sos-request.sos-request")
        .create({
          data: {
            from: currentUser.id,
            to: toId,
            status: "pending",
          },
          populate: {
            from: { fields: ["id", "name", "handle", "avatar"] },
            to: { fields: ["id", "name", "handle", "avatar"] },
          },
        });

      // Get sender's full name for notifications
      const senderName =
        owner?.name || owner?.handle || currentUser.name || "Someone";

      await createNotification(strapi, {
        recipientId: Number(toId),
        type: "sos_request",
        title: "SOS Contact Request",
        message: `${senderName} wants to add you as an SOS contact.`,
        relatedEntityType: "sos_request",
        relatedEntityId: request.id,
        metadata: { fromUserId: currentUser.id, fromName: senderName },
        emailContent: {
          subject: `${senderName} wants to add you as an SOS contact on Wildway`,
          text: `${senderName} has sent you an SOS contact request on Wildway. Open the app to accept or decline.`,
          html: `
            <h2>SOS Contact Request</h2>
            <p><strong>${senderName}</strong> wants to add you as an SOS contact on Wildway.</p>
            <p>SOS contacts can share trip plans with you and you'll be notified of their check-ins and if they become overdue.</p>
            <p>Open the Wildway app to accept or decline this request.</p>
          `,
        },
      });

      return {
        data: {
          id: request.id,
          documentId: request.documentId,
          attributes: request,
        },
      };
    },

    // GET /sos-requests/pending — incoming requests for current user
    async pending(ctx) {
      const currentUser = ctx.state.user;

      const requests = await strapi.db
        .query("api::sos-request.sos-request")
        .findMany({
          where: { to: { id: currentUser.id }, status: "pending" },
          populate: {
            from: {
              select: ["id", "name", "handle", "avatar", "profile_pic"],
            },
          },
          orderBy: { createdAt: "desc" },
        });

      return { data: requests };
    },

    // GET /sos-requests/sent — outgoing requests from current user
    async sent(ctx) {
      const currentUser = ctx.state.user;

      const requests = await strapi.db
        .query("api::sos-request.sos-request")
        .findMany({
          where: { from: { id: currentUser.id }, status: "pending" },
          populate: {
            to: {
              select: ["id", "name", "handle", "avatar", "profile_pic"],
            },
          },
          orderBy: { createdAt: "desc" },
        });

      return { data: requests };
    },

    // PUT /sos-requests/:id/accept — accept and add to sos_contacts
    async accept(ctx) {
      const currentUser = ctx.state.user;
      const { id } = ctx.params;

      const request = await strapi.db
        .query("api::sos-request.sos-request")
        .findOne({
          where: { id },
          populate: ["from", "to"],
        });

      if (!request) {
        ctx.status = 404;
        return { error: "Request not found" };
      }

      if (request.to?.id !== currentUser.id) {
        ctx.status = 403;
        return { error: "Not your request to accept" };
      }

      if (request.status !== "pending") {
        ctx.status = 400;
        return { error: "Request is no longer pending" };
      }

      // Update request status
      await strapi.db.query("api::sos-request.sos-request").update({
        where: { id },
        data: { status: "accepted" },
      });

      // Add each user to the other's sos_contacts
      const fromUser = await strapi.db
        .query("api::auth-user.auth-user")
        .findOne({
          where: { id: request.from.id },
          populate: ["sos_contacts"],
        });

      const toUser = await strapi.db
        .query("api::auth-user.auth-user")
        .findOne({
          where: { id: currentUser.id },
          populate: ["sos_contacts"],
        });

      const fromContacts = (fromUser?.sos_contacts || []).map(
        (c: any) => c.id
      );
      const toContacts = (toUser?.sos_contacts || []).map((c: any) => c.id);

      // Add recipient to sender's contacts
      if (!fromContacts.includes(currentUser.id)) {
        await strapi.db.query("api::auth-user.auth-user").update({
          where: { id: request.from.id },
          data: { sos_contacts: [...fromContacts, currentUser.id] },
        });
      }

      // Add sender to recipient's contacts
      if (!toContacts.includes(request.from.id)) {
        await strapi.db.query("api::auth-user.auth-user").update({
          where: { id: currentUser.id },
          data: { sos_contacts: [...toContacts, request.from.id] },
        });
      }

      // Notify the original sender that their request was accepted
      const accepterName =
        toUser?.name || toUser?.handle || currentUser.name || "Someone";
      await createNotification(strapi, {
        recipientId: request.from.id,
        type: "sos_accepted",
        title: "SOS Request Accepted",
        message: `${accepterName} accepted your SOS contact request.`,
        relatedEntityType: "auth_user",
        relatedEntityId: currentUser.id,
        metadata: {
          acceptedByUserId: currentUser.id,
          acceptedByName: accepterName,
        },
        emailContent: {
          subject: `${accepterName} accepted your SOS contact request on Wildway`,
          text: `${accepterName} has accepted your SOS contact request on Wildway. You can now share trip plans with them and they'll be automatically accepted.`,
          html: `
            <h2>SOS Request Accepted</h2>
            <p><strong>${accepterName}</strong> accepted your SOS contact request on Wildway.</p>
            <p>You can now share trip plans with them and they'll be automatically accepted.</p>
          `,
        },
      });

      return { data: { success: true } };
    },

    // PUT /sos-requests/:id/decline
    async decline(ctx) {
      const currentUser = ctx.state.user;
      const { id } = ctx.params;

      const request = await strapi.db
        .query("api::sos-request.sos-request")
        .findOne({
          where: { id },
          populate: ["to"],
        });

      if (!request) {
        ctx.status = 404;
        return { error: "Request not found" };
      }

      if (request.to?.id !== currentUser.id) {
        ctx.status = 403;
        return { error: "Not your request to decline" };
      }

      if (request.status !== "pending") {
        ctx.status = 400;
        return { error: "Request is no longer pending" };
      }

      await strapi.db.query("api::sos-request.sos-request").update({
        where: { id },
        data: { status: "declined" },
      });

      return { data: { success: true } };
    },
  })
);
