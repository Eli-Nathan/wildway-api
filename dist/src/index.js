"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Initialize Firebase Admin SDK
// This is used by the firebase-auth middleware and verify-user-email plugin
const initializeFirebase = () => {
    // Try to load credentials from file first
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credentialsPath) {
        // Resolve relative paths from project root
        const absolutePath = path_1.default.isAbsolute(credentialsPath)
            ? credentialsPath
            : path_1.default.join(process.cwd(), credentialsPath);
        if (fs_1.default.existsSync(absolutePath)) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const serviceAccount = require(absolutePath);
            return (0, app_1.initializeApp)({
                credential: (0, app_1.cert)(serviceAccount),
            });
        }
    }
    // Try to load from inline GOOGLE_CREDENTIALS env var
    const inlineCredentials = process.env.GOOGLE_CREDENTIALS;
    if (inlineCredentials) {
        try {
            const serviceAccount = JSON.parse(inlineCredentials);
            return (0, app_1.initializeApp)({
                credential: (0, app_1.cert)(serviceAccount),
            });
        }
        catch {
            console.error("Failed to parse GOOGLE_CREDENTIALS");
        }
    }
    // Fall back to application default (works on GCP)
    return (0, app_1.initializeApp)({
        credential: (0, app_1.applicationDefault)(),
    });
};
initializeFirebase();
exports.default = {
    /**
     * An asynchronous register function that runs before
     * your application is initialized.
     *
     * This gives you an opportunity to extend code.
     */
    register() {
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
                    maxDescriptionWords: 50,
                },
            });
            strapi.log.info("Base user role created");
        }
    },
};
