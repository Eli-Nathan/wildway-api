import { initializeApp, cert, applicationDefault, getApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import path from "path";
import fs from "fs";

// Initialize Firebase Admin SDK
// This is used by the firebase-auth middleware and verify-user-email plugin
const initializeFirebase = () => {
  // Try to load credentials from file first
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath) {
    // Resolve relative paths from project root
    const absolutePath = path.isAbsolute(credentialsPath)
      ? credentialsPath
      : path.join(process.cwd(), credentialsPath);

    if (fs.existsSync(absolutePath)) {
      console.log("[Firebase] Initializing from file:", absolutePath);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serviceAccount = require(absolutePath);
      return initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      console.log("[Firebase] File not found:", absolutePath);
    }
  }

  // Try to load from inline GOOGLE_CREDENTIALS env var
  const inlineCredentials = process.env.GOOGLE_CREDENTIALS;
  if (inlineCredentials) {
    try {
      const serviceAccount = JSON.parse(inlineCredentials);
      console.log("[Firebase] Initializing from GOOGLE_CREDENTIALS env var");
      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });

      return app;
    } catch (err) {
      console.error("[Firebase] Failed to parse GOOGLE_CREDENTIALS:", err);
    }
  }

  // Fall back to application default (works on GCP)
  console.log("[Firebase] Falling back to applicationDefault()");
  return initializeApp({
    credential: applicationDefault(),
  });
};

initializeFirebase();

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(): void {
    // Firebase authentication is now handled by the global::firebase-auth middleware
    // See: src/middlewares/firebase-auth.ts
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // Seed base user role if it doesn't exist
    const baseRole = await strapi.db.query("api::user-role.user-role").findOne({
      where: { level: 0 },
    });

    if (!baseRole) {
      strapi.log.info("Creating base user role (level 0)...");
      await strapi.db.query("api::user-role.user-role").create({
        data: {
          name: "Free",
          level: 0,
          maxImages: 1,
        },
      });
      strapi.log.info("Base user role created");
    }

    // Ensure map_impressions has a unique index on (site_id, date) for upserts.
    // This is required for the ON CONFLICT clause in recordMapImpressions().
    const knex = strapi.db.connection;
    const tableExists = await knex.schema.hasTable("map_impressions");

    if (tableExists) {
      try {
        await knex.raw(`
          CREATE UNIQUE INDEX IF NOT EXISTS map_impressions_site_date_unique
          ON map_impressions (site_id, date)
        `);
        strapi.log.info("map_impressions unique index ensured");
      } catch (err) {
        strapi.log.warn("Could not create map_impressions index:", err.message);
      }
    } else {
      strapi.log.info("map_impressions table not yet created — index will be added on next restart");
    }

    // Ensure upload permissions are enabled for authenticated users
    const authenticatedRole = await strapi.db
      .query("plugin::users-permissions.role")
      .findOne({ where: { type: "authenticated" } });

    if (authenticatedRole) {
      // Check if upload permission exists
      const uploadPermission = await strapi.db
        .query("plugin::users-permissions.permission")
        .findOne({
          where: {
            role: authenticatedRole.id,
            action: "plugin::upload.content-api.upload",
          },
        });

      if (!uploadPermission) {
        strapi.log.info("Enabling upload permission for authenticated users...");
        await strapi.db.query("plugin::users-permissions.permission").create({
          data: {
            action: "plugin::upload.content-api.upload",
            role: authenticatedRole.id,
          },
        });
        strapi.log.info("Upload permission enabled");
      }
    }
  },
};
