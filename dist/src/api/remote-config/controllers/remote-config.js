"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const remote_config_1 = require("firebase-admin/remote-config");
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const DEFAULT_FLAG = "ENABLE_APPLE_AUTH";
/**
 * Validates the admin API key from the x-admin-key header
 */
function validateAdminKey(ctx) {
    const providedKey = ctx.request.header["x-admin-key"];
    if (!ADMIN_API_KEY) {
        console.error("[RemoteConfig] ADMIN_API_KEY environment variable not set");
        return false;
    }
    return providedKey === ADMIN_API_KEY;
}
/**
 * Creates a condition name from version string
 * e.g., "1.10.9" -> "review_v1_10_9"
 */
function createConditionName(version) {
    const sanitized = version.replace(/\./g, "_");
    return `review_v${sanitized}`;
}
/**
 * Creates the version match expression for Remote Config
 * Uses exact version match for both iOS and Android
 */
function createConditionExpression(version) {
    // Match exact version on both iOS and Android
    return `app.version.==(['${version}'])`;
}
exports.default = {
    /**
     * POST /api/remote-config/enable-review-flag
     *
     * Enables a feature flag for a specific app version (for App Store review).
     * Creates a version-specific condition and sets the flag to true for that version only.
     */
    enableReviewFlag: async (ctx) => {
        // Validate admin key
        if (!validateAdminKey(ctx)) {
            ctx.status = 401;
            ctx.body = { error: "Unauthorized: Invalid or missing admin key" };
            return;
        }
        const { version, flag = DEFAULT_FLAG } = ctx.request.body || {};
        if (!version) {
            ctx.status = 400;
            ctx.body = { error: "Version is required" };
            return;
        }
        try {
            const remoteConfig = (0, remote_config_1.getRemoteConfig)();
            const template = await remoteConfig.getTemplate();
            const conditionName = createConditionName(version);
            const conditionExpression = createConditionExpression(version);
            // Check if condition already exists
            const existingConditionIndex = template.conditions.findIndex((c) => c.name === conditionName);
            if (existingConditionIndex === -1) {
                // Add new condition
                template.conditions.push({
                    name: conditionName,
                    expression: conditionExpression,
                    tagColor: "ORANGE",
                });
                console.log(`[RemoteConfig] Created condition: ${conditionName}`);
            }
            else {
                console.log(`[RemoteConfig] Condition already exists: ${conditionName}`);
            }
            // Get or create the parameter
            if (!template.parameters[flag]) {
                template.parameters[flag] = {
                    defaultValue: { value: "false" },
                    conditionalValues: {},
                };
            }
            // Set the conditional value for the review version
            const param = template.parameters[flag];
            if (param.conditionalValues) {
                param.conditionalValues[conditionName] = { value: "true" };
            }
            // Publish the updated template
            await remoteConfig.publishTemplate(template);
            console.log(`[RemoteConfig] Enabled ${flag} for version ${version} (condition: ${conditionName})`);
            ctx.body = {
                success: true,
                message: `Enabled ${flag} for version ${version}`,
                condition: conditionName,
                flag,
                version,
            };
        }
        catch (err) {
            console.error("[RemoteConfig] Error enabling review flag:", err);
            ctx.status = 500;
            ctx.body = {
                error: "Failed to enable review flag",
                details: err instanceof Error ? err.message : String(err),
            };
        }
    },
    /**
     * POST /api/remote-config/disable-review-flag
     *
     * Disables a feature flag for a specific app version (after App Store approval).
     * Removes the version-specific conditional value and optionally the condition.
     */
    disableReviewFlag: async (ctx) => {
        var _a;
        // Validate admin key
        if (!validateAdminKey(ctx)) {
            ctx.status = 401;
            ctx.body = { error: "Unauthorized: Invalid or missing admin key" };
            return;
        }
        const { version, flag = DEFAULT_FLAG } = ctx.request.body || {};
        if (!version) {
            ctx.status = 400;
            ctx.body = { error: "Version is required" };
            return;
        }
        try {
            const remoteConfig = (0, remote_config_1.getRemoteConfig)();
            const template = await remoteConfig.getTemplate();
            const conditionName = createConditionName(version);
            // Remove conditional value from the parameter
            const param = template.parameters[flag];
            if ((_a = param === null || param === void 0 ? void 0 : param.conditionalValues) === null || _a === void 0 ? void 0 : _a[conditionName]) {
                delete param.conditionalValues[conditionName];
                console.log(`[RemoteConfig] Removed conditional value for ${conditionName} from ${flag}`);
            }
            // Check if condition is used by any other parameters
            const conditionInUse = Object.values(template.parameters).some((p) => { var _a; return (_a = p.conditionalValues) === null || _a === void 0 ? void 0 : _a[conditionName]; });
            // Remove condition if not used elsewhere
            if (!conditionInUse) {
                const conditionIndex = template.conditions.findIndex((c) => c.name === conditionName);
                if (conditionIndex !== -1) {
                    template.conditions.splice(conditionIndex, 1);
                    console.log(`[RemoteConfig] Removed condition: ${conditionName}`);
                }
            }
            // Publish the updated template
            await remoteConfig.publishTemplate(template);
            console.log(`[RemoteConfig] Disabled ${flag} for version ${version} (condition: ${conditionName})`);
            ctx.body = {
                success: true,
                message: `Disabled ${flag} for version ${version}`,
                condition: conditionName,
                flag,
                version,
                conditionRemoved: !conditionInUse,
            };
        }
        catch (err) {
            console.error("[RemoteConfig] Error disabling review flag:", err);
            ctx.status = 500;
            ctx.body = {
                error: "Failed to disable review flag",
                details: err instanceof Error ? err.message : String(err),
            };
        }
    },
};
